import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import CardSwitcher from "@/components/cards/CardSwitcher";
import { useCards } from "@/context/CardContext";
import { HIT, Radius, Space, Type } from "@/constants/design";
import {
  addLink,
  apiError,
  changeSlug,
  checkSlug,
  deleteLink,
  getLinks,
  getShareKit,
  ProfileLink,
  reorderLinks,
  ShareKit,
} from "@/services/shareKitService";

type SlugState = { checking: boolean; available: boolean | null; reason: string | null };

export default function ShareKitScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const { cardVersion } = useCards();

  const [kit, setKit] = useState<ShareKit | null>(null);
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [slugState, setSlugState] = useState<SlugState>({ checking: false, available: null, reason: null });
  const [savingSlug, setSavingSlug] = useState(false);
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [k, l] = await Promise.all([getShareKit(), getLinks()]);
      setKit(k);
      setSlug(k.slug);
      setLinks(l);
    } catch (e: any) {
      setError(
        e?.response?.status === 404 ? "Create your profile first to use the Share kit." : "Couldn't load. Check your connection."
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, cardVersion])
  );

  useEffect(() => () => { if (slugTimer.current) clearTimeout(slugTimer.current); }, []);

  /* ---------------- custom URL ---------------- */
  const onSlugChange = (text: string) => {
    const value = text.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(value);
    if (slugTimer.current) clearTimeout(slugTimer.current);
    if (!kit || value === kit.slug) {
      setSlugState({ checking: false, available: null, reason: null });
      return;
    }
    setSlugState({ checking: true, available: null, reason: null });
    slugTimer.current = setTimeout(async () => {
      try {
        const r = await checkSlug(value);
        setSlugState({ checking: false, available: r.available, reason: r.reason });
      } catch {
        setSlugState({ checking: false, available: null, reason: "Couldn't check right now." });
      }
    }, 400);
  };

  const saveSlug = () => {
    if (!kit) return;
    Alert.alert(
      "Change your link?",
      `Your card will live at …/${slug}. Your old link and printed QR codes keep working and redirect here.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: async () => {
            setSavingSlug(true);
            try {
              await changeSlug(slug);
              await load();
              setSlugState({ checking: false, available: null, reason: null });
            } catch (e) {
              Alert.alert("Couldn't change link", apiError(e, "Please try another address."));
            } finally {
              setSavingSlug(false);
            }
          },
        },
      ]
    );
  };

  /* ---------------- custom links ---------------- */
  const onAddLink = async () => {
    if (!label.trim() || !url.trim()) return;
    setAddingLink(true);
    try {
      const link = await addLink(label.trim(), url.trim());
      setLinks((prev) => [...prev, link]);
      setLabel("");
      setUrl("");
    } catch (e) {
      Alert.alert("Couldn't add link", apiError(e, "Check the address and try again."));
    } finally {
      setAddingLink(false);
    }
  };

  const onDeleteLink = (link: ProfileLink) =>
    Alert.alert("Remove link?", link.label, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setLinks((prev) => prev.filter((l) => l.id !== link.id));
          deleteLink(link.id).catch(load);
        },
      },
    ]);

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...links];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setLinks(next);
    try {
      setLinks(await reorderLinks(next.map((l) => l.id)));
    } catch {
      load();
    }
  };

  /* ---------------- UI ---------------- */
  const slugChanged = !!kit && slug !== kit.slug;
  const canSaveSlug = slugChanged && slugState.available === true && !savingSlug;
  const host = kit ? kit.profile_url.replace(/^https?:\/\//, "").replace(new RegExp(`${kit.slug}$`), "") : "";

  return (
    <SafeScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[Type.title, { color: colors.text, flex: 1 }]}>Share kit</Text>
            <CardSwitcher compact />
          </View>

          {!kit && !error && <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />}
          {error && <Text style={{ color: colors.subText, textAlign: "center", marginTop: 32 }}>{error}</Text>}

          {kit && (
            <>
              {/* PROFILE LINK */}
              <Section title="Your card link" colors={colors}>
                <View style={[styles.slugBox, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Text style={{ color: colors.subText, fontSize: 13 }} numberOfLines={1}>{host}</Text>
                  <TextInput
                    value={slug}
                    onChangeText={onSlugChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={40}
                    accessibilityLabel="Card link name"
                    style={[styles.slugInput, { color: colors.text }]}
                  />
                </View>
                {slugChanged && (
                  <Text
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: slugState.checking ? colors.subText : slugState.available ? colors.success : colors.danger,
                    }}
                  >
                    {slugState.checking ? "Checking…" : slugState.available ? "Available ✓" : slugState.reason}
                  </Text>
                )}
                <View style={styles.row}>
                  {slugChanged ? (
                    <PrimaryBtn label={savingSlug ? "Saving…" : "Save link"} disabled={!canSaveSlug} onPress={saveSlug} colors={colors} />
                  ) : (
                    <>
                      <SecondaryBtn icon="copy-outline" label="Copy" colors={colors}
                        onPress={async () => { await Clipboard.setStringAsync(kit.profile_url); Alert.alert("Copied", kit.profile_url); }} />
                      <SecondaryBtn icon="share-social-outline" label="Share" colors={colors}
                        onPress={() => Share.share({ message: `${kit.profile_url}?src=link` })} />
                      <SecondaryBtn icon="open-outline" label="Preview" colors={colors}
                        onPress={() => WebBrowser.openBrowserAsync(kit.profile_url)} />
                    </>
                  )}
                </View>
              </Section>

              {/* CUSTOM LINKS */}
              <Section title="Links on your card" hint="Portfolio, booking page, payment link… shown under your social profiles." colors={colors}>
                {links.length === 0 && (
                  <Text style={{ color: colors.subText, marginBottom: Space.md }}>No links yet.</Text>
                )}
                {links.map((l, i) => (
                  <View key={l.id} style={[styles.linkRow, { borderColor: colors.border }]}>
                    <Ionicons name="link-outline" size={18} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: Space.md }}>
                      <Text style={{ color: colors.text, fontWeight: "600" }} numberOfLines={1}>{l.label}</Text>
                      <Text style={{ color: colors.subText, fontSize: 12 }} numberOfLines={1}>{l.url}</Text>
                    </View>
                    <IconBtn icon="chevron-up" label={`Move ${l.label} up`} disabled={i === 0} onPress={() => move(i, -1)} colors={colors} />
                    <IconBtn icon="chevron-down" label={`Move ${l.label} down`} disabled={i === links.length - 1} onPress={() => move(i, 1)} colors={colors} />
                    <IconBtn icon="trash-outline" label={`Remove ${l.label}`} danger onPress={() => onDeleteLink(l)} colors={colors} />
                  </View>
                ))}
                <TextInput
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Label (e.g. Book a call)"
                  placeholderTextColor={colors.subText}
                  maxLength={80}
                  style={[styles.input, { backgroundColor: colors.elevated, color: colors.text, borderColor: colors.border }]}
                />
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="Web address (e.g. cal.com/you)"
                  placeholderTextColor={colors.subText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[styles.input, { backgroundColor: colors.elevated, color: colors.text, borderColor: colors.border }]}
                />
                <PrimaryBtn
                  label={addingLink ? "Adding…" : "Add link"}
                  disabled={addingLink || !label.trim() || !url.trim()}
                  onPress={onAddLink}
                  colors={colors}
                />
              </Section>

              {/* EMAIL SIGNATURE */}
              <Section title="Email signature" hint="Every email you send becomes a way to save your contact." colors={colors}>
                <PrimaryBtn label="Create my signature" icon="mail-outline" onPress={() => WebBrowser.openBrowserAsync(kit.signature_url)} colors={colors} />
                <Text style={{ color: colors.subText, fontSize: 12, marginTop: 8 }}>
                  Opens in your browser. Tap “Copy signature”, then paste it into Gmail, Outlook or Apple Mail.
                </Text>
              </Section>

              {/* WALLET */}
              <Section title="Add to Wallet" hint="Keep your card in Apple Wallet or Google Wallet and show the QR anywhere, even offline." colors={colors}>
                {kit.wallet.apple_url || kit.wallet.google_url ? (
                  <View style={styles.row}>
                    {Platform.OS !== "android" && kit.wallet.apple_url && (
                      <WalletBtn label="Apple Wallet" icon="logo-apple" onPress={() => Linking.openURL(kit.wallet.apple_url!)} />
                    )}
                    {kit.wallet.google_url && (
                      <WalletBtn label="Google Wallet" icon="logo-google" onPress={() => Linking.openURL(kit.wallet.google_url!)} />
                    )}
                  </View>
                ) : (
                  <View style={[styles.notice, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={{ color: colors.text, marginLeft: 8, flex: 1, fontSize: 13 }}>
                      Wallet passes are coming soon.
                    </Text>
                  </View>
                )}
              </Section>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

/* ---------------- small building blocks ---------------- */
function Section({ title, hint, colors, children }: any) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[Type.heading, { color: colors.text }]}>{title}</Text>
      {!!hint && <Text style={{ color: colors.subText, fontSize: 13, marginTop: 4 }}>{hint}</Text>}
      <View style={{ marginTop: Space.md }}>{children}</View>
    </View>
  );
}

function PrimaryBtn({ label, onPress, disabled, icon, colors }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.primary, { backgroundColor: colors.primary, opacity: disabled ? 0.45 : 1 }]}
    >
      {icon && <Ionicons name={icon} size={18} color={colors.onPrimary} style={{ marginRight: 8 }} />}
      <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 15 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function SecondaryBtn({ label, icon, onPress, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" style={[styles.secondary, { borderColor: colors.border }]}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={{ color: colors.text, marginLeft: 6, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function IconBtn({ icon, label, onPress, disabled, danger, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityLabel={label} style={styles.iconBtn}>
      <Ionicons name={icon} size={18} color={disabled ? colors.border : danger ? colors.danger : colors.subText} />
    </TouchableOpacity>
  );
}

function WalletBtn({ label, icon, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={`Add to ${label}`} style={styles.wallet}>
      <Ionicons name={icon} size={18} color="#FFF" />
      <Text style={{ color: "#FFF", marginLeft: 8, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: Space.lg, paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Space.lg },
  back: { width: HIT, height: HIT, justifyContent: "center" },
  section: { borderRadius: Radius.card, padding: Space.lg, marginBottom: Space.md },
  slugBox: { borderWidth: 1, borderRadius: Radius.card, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  slugInput: { fontSize: 17, fontWeight: "600", paddingVertical: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm, marginTop: Space.md },
  primary: { flexDirection: "row", minHeight: HIT, borderRadius: Radius.card, alignItems: "center", justifyContent: "center", paddingHorizontal: Space.lg, flexGrow: 1 },
  secondary: { flexDirection: "row", minHeight: 40, borderRadius: Radius.pill, borderWidth: 1, alignItems: "center", paddingHorizontal: 14 },
  linkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 36, height: HIT, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: 1, borderRadius: Radius.card, paddingHorizontal: 14, minHeight: HIT, marginTop: Space.md, fontSize: 15 },
  wallet: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderRadius: Radius.card, minHeight: HIT, paddingHorizontal: Space.lg, flexGrow: 1 },
  notice: { flexDirection: "row", alignItems: "center", borderRadius: Radius.card, padding: Space.md },
});
