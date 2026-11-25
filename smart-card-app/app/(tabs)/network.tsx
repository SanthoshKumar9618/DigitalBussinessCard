import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useRouter } from "expo-router";
import * as IntentLauncher from "expo-intent-launcher";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import { useCards } from "@/context/CardContext";
import { getContacts, searchContacts } from "@/services/contactService";
import { deleteLead, exportCsv, getLeads, Lead, leadToContact, markLeadRead, timeAgo } from "@/services/leadService";
import { getReminders } from "@/services/aiService";
import { assetUrl } from "@/services/api";
import { HIT, Radius, Space, Type } from "@/constants/design";
import { Avatar, Badge, EmptyState, IconButton, ScreenHeader, Segmented } from "@/components/ui/kit";

type Segment = "contacts" | "leads";

export default function NetworkScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const { cards } = useCards();
  const multiCard = cards.length > 1;

  const [segment, setSegment] = useState<Segment>("contacts");
  const [contacts, setContacts] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [dueIds, setDueIds] = useState<Set<string>>(new Set());
  const [dueOnly, setDueOnly] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, l] = await Promise.all([
        getContacts().then((r) => r.data),
        getLeads().catch(() => [] as Lead[]), // no profile yet → no leads
      ]);
      setContacts(c);
      setLeads(l);
      getReminders()
        .then((r) => setDueIds(new Set([...r.overdue, ...r.today].map((x: any) => x.id))))
        .catch(() => {});
    } catch {
      setError("Couldn't load your network. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (!text.trim()) return load();
      try {
        setContacts((await searchContacts(text.trim())).data);
      } catch {
        setError("Search failed. Try again.");
      }
    }, 300);
  };

  /* Tag chips come from the user's real tags, most used first. */
  const tags = useMemo(() => {
    const count: Record<string, number> = {};
    contacts.forEach((c) => c.tag && (count[c.tag] = (count[c.tag] || 0) + 1));
    return Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 8);
  }, [contacts]);

  const visibleContacts = contacts.filter(
    (c) => (!tagFilter || c.tag === tagFilter) && (!dueOnly || dueIds.has(c.id))
  );
  const unread = leads.filter((l) => !l.is_read).length;

  const onExport = () => {
    exportCsv(segment).catch(() => Alert.alert("Export failed", "Please try again."));
  };

  const openPhoneContacts = async () => {
    if (Platform.OS === "android") {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: "content://contacts/people" });
    } else {
      await Linking.openURL("contacts://");
    }
  };

  /* ---------------- LEADS ---------------- */
  const toggleLead = async (lead: Lead) => {
    setExpandedLead(expandedLead === lead.id ? null : lead.id);
    if (!lead.is_read) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, is_read: true } : l)));
      markLeadRead(lead.id).catch(() => {});
    }
  };

  const removeLead = (lead: Lead) =>
    Alert.alert("Delete lead?", `${lead.name} will be removed from your leads.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLeads((prev) => prev.filter((l) => l.id !== lead.id));
          deleteLead(lead.id).catch(load);
        },
      },
    ]);

  const saveLead = async (lead: Lead) => {
    try {
      await leadToContact(lead.id);
      Alert.alert("Saved", `${lead.name} is now in your contacts.`);
      load();
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    }
  };

  const renderLead = ({ item }: { item: Lead }) => {
    const open = expandedLead === item.id;
    const digits = (item.phone || "").replace(/\D/g, "");
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => toggleLead(item)}
        accessibilityRole="button"
        accessibilityLabel={`Lead ${item.name}${item.is_read ? "" : ", unread"}`}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: item.is_read ? colors.border : colors.primary },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.avatarGap}><Avatar name={item.name} size={46} /></View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            {!!(item.company || item.email || item.phone) && (
              <Text style={[styles.sub, { color: colors.subText }]} numberOfLines={1}>
                {item.company || item.email || item.phone}
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.time, { color: colors.subText }]}>{timeAgo(item.created_at)}</Text>
            {multiCard && !!item.card_label && (
              <View style={{ marginTop: 4 }}><Badge label={item.card_label} /></View>
            )}
          </View>
        </View>

        {!!item.note && (
          <Text style={[styles.note, { color: colors.text }]} numberOfLines={open ? undefined : 2}>
            “{item.note}”
          </Text>
        )}

        {open && (
          <View style={styles.actions}>
            {!!item.phone && <ActionChip icon="call-outline" label="Call" onPress={() => Linking.openURL(`tel:${item.phone}`)} />}
            {!!digits && <ActionChip icon="logo-whatsapp" label="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${digits}`)} />}
            {!!item.email && <ActionChip icon="mail-outline" label="Email" onPress={() => Linking.openURL(`mailto:${item.email}`)} />}
            <ActionChip icon="person-add-outline" label="Save to network" onPress={() => saveLead(item)} />
            <ActionChip icon="trash-outline" label="Delete" danger onPress={() => removeLead(item)} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /* ---------------- CONTACTS ---------------- */
  const renderContact = ({ item }: any) => {
    const avatar = assetUrl(item.target_profile?.avatar_url);
    return (
      <TouchableOpacity
        style={[styles.card, styles.row, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.saved_display_name}`}
        onPress={() => router.push({ pathname: "/contact/detail", params: { contact: JSON.stringify(item) } })}
      >
        <View style={styles.avatarGap}><Avatar uri={avatar} name={item.saved_display_name} size={46} /></View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.saved_display_name}</Text>
          {!!(item.saved_job_title || item.saved_company) && (
            <Text style={[styles.sub, { color: colors.subText }]} numberOfLines={1}>
              {item.saved_job_title}
              {item.saved_job_title && item.saved_company ? " @ " : ""}
              {item.saved_company}
            </Text>
          )}
          {!!(item.tag || item.source) && (
            <View style={styles.badges}>
              {!!item.tag && <Badge label={`#${item.tag}`} />}
              {!!item.source && <Badge label={String(item.source).toUpperCase()} tone="muted" />}
            </View>
          )}
        </View>
        {dueIds.has(item.id) && (
          <Ionicons name="alarm" size={16} color={colors.primary} style={{ marginRight: 6 }} accessibilityLabel="Follow-up due" />
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.subText} />
      </TouchableOpacity>
    );
  };

  function ActionChip({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
    const tint = danger ? colors.danger : colors.primary;
    return (
      <TouchableOpacity onPress={onPress} style={[styles.chip, { backgroundColor: colors.elevated, borderColor: colors.border }]} accessibilityLabel={label}>
        <Ionicons name={icon} size={16} color={tint} />
        <Text style={[styles.chipText, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  const Empty = () =>
    loading ? (
      <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
    ) : error ? (
      <EmptyState icon="cloud-offline-outline" title="Something went wrong" body={error} cta="Retry" onCta={load} />
    ) : segment === "leads" ? (
      <EmptyState
        icon="swap-horizontal-outline"
        title="No leads yet"
        body="When someone opens your card and taps “Share my details”, they show up here."
        cta="Share my card"
        onCta={() => router.push("/(tabs)/tap")}
      />
    ) : search || tagFilter || dueOnly ? (
      <EmptyState icon="search-outline" title="No matches" body="Try a different name, company or tag." />
    ) : (
      <EmptyState
        icon="people-outline"
        title="No contacts yet"
        body="Scan someone’s QR code or tap their NFC card to save them here."
        cta="Scan a card"
        onCta={() => router.push("/(tabs)/scan")}
      />
    );


  return (
    <SafeScreen>
      <View style={styles.container}>
        {/* HEADER */}
        <ScreenHeader
          large
          title="Network"
          right={
            <>
              <IconButton icon="card-outline" label="Scan a paper business card" onPress={() => router.push("/scan-card")} />
              <IconButton icon="stats-chart-outline" label="Insights" onPress={() => router.push("/insights")} />
              <IconButton icon="download-outline" label={`Export ${segment} as CSV`} onPress={onExport} />
              <IconButton icon="book-outline" label="Open phone contacts" onPress={openPhoneContacts} />
            </>
          }
        />

        {/* FOLLOW-UPS DUE */}
        {dueIds.size > 0 && (
          <TouchableOpacity
            onPress={() => { setSegment("contacts"); setDueOnly(!dueOnly); }}
            accessibilityRole="button"
            accessibilityState={{ selected: dueOnly }}
            style={[styles.dueBanner, { backgroundColor: dueOnly ? colors.primary : colors.primarySoft }]}
          >
            <Ionicons name="alarm-outline" size={18} color={dueOnly ? colors.onPrimary : colors.primary} />
            <Text style={{ flex: 1, marginLeft: 8, fontWeight: "600", color: dueOnly ? colors.onPrimary : colors.text }}>
              {dueIds.size} follow-up{dueIds.size > 1 ? "s" : ""} due
            </Text>
            <Text style={{ color: dueOnly ? colors.onPrimary : colors.primary, fontWeight: "600", fontSize: 13 }}>
              {dueOnly ? "Show all" : "Show"}
            </Text>
          </TouchableOpacity>
        )}

        {/* SEGMENTED CONTROL */}
        <View style={{ marginBottom: Space.md }}>
          <Segmented<Segment>
            value={segment}
            onChange={setSegment}
            options={[
              { value: "contacts", label: `Contacts (${contacts.length})` },
              { value: "leads", label: `Leads (${leads.length})`, dot: unread > 0 },
            ]}
          />
        </View>

        {segment === "contacts" && (
          <>
            <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.subText} />
              <TextInput
                placeholder="Search name, company, tag…"
                placeholderTextColor={colors.placeholder}
                style={[styles.searchInput, { color: colors.text }]}
                value={search}
                onChangeText={onSearch}
                accessibilityLabel="Search contacts"
                returnKeyType="search"
              />
              {!!search && (
                <TouchableOpacity onPress={() => onSearch("")} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={colors.subText} />
                </TouchableOpacity>
              )}
            </View>

            {tags.length > 0 && (
              <View style={styles.tags}>
                {[null, ...tags].map((t) => {
                  const active = tagFilter === t;
                  return (
                    <TouchableOpacity
                      key={t ?? "__all"}
                      onPress={() => setTagFilter(t)}
                      style={[styles.tag, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                    >
                      <Text style={[styles.tagText, { color: active ? colors.onPrimary : colors.text }]}>{t ? `#${t}` : "All"}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <FlatList<any>
          data={segment === "contacts" ? visibleContacts : leads}
          keyExtractor={(item) => String(item.id)}
          renderItem={segment === "contacts" ? renderContact : renderLead}
          ListEmptyComponent={Empty}
          contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
        />
      </View>
    </SafeScreen>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, padding: Space.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Space.md },
  headerActions: { flexDirection: "row" },
  iconBtn: { width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },

  dueBanner: { flexDirection: "row", alignItems: "center", borderRadius: Radius.card, paddingHorizontal: 14, minHeight: HIT, marginBottom: Space.md },
  segment: { flexDirection: "row", borderRadius: Radius.card, padding: 4, marginBottom: Space.md },
  segmentBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 38, borderRadius: Radius.card - 4 },
  segmentText: { fontSize: 14, fontWeight: "600" },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },

  search: { flexDirection: "row", alignItems: "center", borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Space.md, minHeight: 48, marginBottom: Space.md },
  searchInput: { marginLeft: Space.sm, flex: 1, fontSize: 15 },

  tags: { flexDirection: "row", flexWrap: "wrap", marginBottom: Space.sm },
  tag: { paddingHorizontal: Space.md, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1, marginRight: Space.sm, marginBottom: Space.sm },
  tagText: { fontSize: 12, fontWeight: "600" },

  card: { padding: 14, borderRadius: Radius.card, marginBottom: Space.md, borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 3 },
  avatarGap: { marginRight: Space.md },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 46, height: 46, borderRadius: 23, marginRight: Space.md, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 16, fontWeight: "700" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 13, marginTop: 2 },
  time: { fontSize: 12, marginLeft: Space.sm },
  badges: { flexDirection: "row", marginTop: 6 },
  badge: { fontSize: 11, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.chip, marginRight: 6, overflow: "hidden" },
  note: { fontSize: 14, fontStyle: "italic", marginTop: 10, lineHeight: 20 },

  actions: { flexDirection: "row", flexWrap: "wrap", marginTop: Space.md },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: Space.md, minHeight: 36, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, marginRight: Space.sm, marginBottom: Space.sm },
  chipText: { marginLeft: 6, fontSize: 13, fontWeight: "600" },

  empty: { alignItems: "center", paddingHorizontal: Space.xl, marginTop: 56 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: Space.lg },
  emptyTitle: { ...Type.heading, marginBottom: 6 },
  emptyBody: { ...Type.body, textAlign: "center", lineHeight: 21 },
  primaryBtn: { marginTop: Space.xl, paddingHorizontal: Space.xl, minHeight: HIT, borderRadius: Radius.card, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 15, fontWeight: "700" },
});
