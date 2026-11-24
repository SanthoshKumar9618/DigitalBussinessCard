import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as IntentLauncher from "expo-intent-launcher";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import { getContacts, searchContacts } from "@/services/contactService";
import { deleteLead, exportCsv, getLeads, Lead, markLeadRead, timeAgo } from "@/services/leadService";
import { assetUrl } from "@/services/api";
import { HIT, Radius, Space, Type } from "@/constants/design";

type Segment = "contacts" | "leads";

export default function NetworkScreen() {
  const router = useRouter();
  const { colors } = useApp();

  const [segment, setSegment] = useState<Segment>("contacts");
  const [contacts, setContacts] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
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

  const visibleContacts = tagFilter ? contacts.filter((c) => c.tag === tagFilter) : contacts;
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
          { backgroundColor: colors.card, borderLeftColor: item.is_read ? "transparent" : colors.primary },
        ]}
      >
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.initials, { color: colors.primary }]}>{initials(item.name)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            {!!(item.company || item.email || item.phone) && (
              <Text style={[styles.sub, { color: colors.subText }]} numberOfLines={1}>
                {item.company || item.email || item.phone}
              </Text>
            )}
          </View>
          <Text style={[styles.time, { color: colors.subText }]}>{timeAgo(item.created_at)}</Text>
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
        style={[styles.card, styles.row, { backgroundColor: colors.card }]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.saved_display_name}`}
        onPress={() => router.push({ pathname: "/contact/detail", params: { contact: JSON.stringify(item) } })}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.initials, { color: colors.primary }]}>{initials(item.saved_display_name)}</Text>
          </View>
        )}
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
              {!!item.tag && <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.primarySoft }]}>#{item.tag}</Text>}
              {!!item.source && <Text style={[styles.badge, { color: colors.subText, backgroundColor: colors.bg }]}>{String(item.source).toUpperCase()}</Text>}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subText} />
      </TouchableOpacity>
    );
  };

  function ActionChip({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
    const tint = danger ? colors.danger : colors.primary;
    return (
      <TouchableOpacity onPress={onPress} style={[styles.chip, { backgroundColor: colors.bg }]} accessibilityLabel={label}>
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
    ) : search || tagFilter ? (
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

  function EmptyState({ icon, title, body, cta, onCta }: { icon: any; title: string; body: string; cta?: string; onCta?: () => void }) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyBody, { color: colors.subText }]}>{body}</Text>
        {!!cta && (
          <TouchableOpacity onPress={onCta} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>{cta}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeScreen>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[Type.title, { color: colors.text }]}>My Network</Text>
          <View style={styles.headerActions}>
            <IconBtn icon="stats-chart-outline" label="Insights" onPress={() => router.push("/insights")} color={colors.text} />
            <IconBtn icon="download-outline" label={`Export ${segment} as CSV`} onPress={onExport} color={colors.text} />
            <IconBtn icon="book-outline" label="Open phone contacts" onPress={openPhoneContacts} color={colors.text} />
          </View>
        </View>

        {/* SEGMENTED CONTROL */}
        <View style={[styles.segment, { backgroundColor: colors.card }]} accessibilityRole="tablist">
          {(["contacts", "leads"] as Segment[]).map((s) => {
            const active = segment === s;
            const label = s === "contacts" ? `Contacts (${contacts.length})` : `Leads (${leads.length})`;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setSegment(s)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segmentBtn, active && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.segmentText, { color: active ? colors.onPrimary : colors.text }]}>{label}</Text>
                {s === "leads" && unread > 0 && (
                  <View style={[styles.dot, { backgroundColor: active ? colors.onPrimary : colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {segment === "contacts" && (
          <>
            <View style={[styles.search, { backgroundColor: colors.card }]}>
              <Ionicons name="search" size={16} color={colors.subText} />
              <TextInput
                placeholder="Search name, company, tag…"
                placeholderTextColor={colors.subText}
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
                      style={[styles.tag, { backgroundColor: active ? colors.primary : colors.card }]}
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

function IconBtn({ icon, label, onPress, color }: { icon: any; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <Ionicons name={icon} size={20} color={color} />
    </TouchableOpacity>
  );
}

function initials(name?: string | null) {
  return (name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Space.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Space.md },
  headerActions: { flexDirection: "row" },
  iconBtn: { width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },

  segment: { flexDirection: "row", borderRadius: Radius.card, padding: 4, marginBottom: Space.md },
  segmentBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 38, borderRadius: Radius.card - 4 },
  segmentText: { fontSize: 14, fontWeight: "600" },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },

  search: { flexDirection: "row", alignItems: "center", borderRadius: Radius.card, paddingHorizontal: Space.md, minHeight: HIT, marginBottom: Space.md },
  searchInput: { marginLeft: Space.sm, flex: 1, fontSize: 15 },

  tags: { flexDirection: "row", flexWrap: "wrap", marginBottom: Space.sm },
  tag: { paddingHorizontal: Space.md, paddingVertical: 6, borderRadius: Radius.pill, marginRight: Space.sm, marginBottom: Space.sm },
  tagText: { fontSize: 12, fontWeight: "600" },

  card: { padding: 14, borderRadius: Radius.card, marginBottom: Space.md, borderLeftWidth: 3, borderLeftColor: "transparent" },
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
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: Space.md, minHeight: 36, borderRadius: Radius.pill, marginRight: Space.sm, marginBottom: Space.sm },
  chipText: { marginLeft: 6, fontSize: 13, fontWeight: "600" },

  empty: { alignItems: "center", paddingHorizontal: Space.xl, marginTop: 56 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: Space.lg },
  emptyTitle: { ...Type.heading, marginBottom: 6 },
  emptyBody: { ...Type.body, textAlign: "center", lineHeight: 21 },
  primaryBtn: { marginTop: Space.xl, paddingHorizontal: Space.xl, minHeight: HIT, borderRadius: Radius.card, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 15, fontWeight: "700" },
});
