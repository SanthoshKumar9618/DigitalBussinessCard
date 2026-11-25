import { useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { assetUrl, publicProfileUrl } from "../../services/api";
import { getNfc, nfcSupportedInThisBuild } from "../../services/nfc";
import { resolveNfc } from "../../services/nfcService";
import { saveContact } from "../../services/contactService";
import { useApp } from "../../components/context/AppContext";
import { useCards } from "../../context/CardContext";
import SafeScreen from "../../components/ui/Screen1";
import Button from "../../components/ui/Button";
import { Avatar, ScreenHeader, Surface } from "../../components/ui/kit";
import { Radius, Space, Type } from "../../constants/design";

export default function TapScreen() {
  const router = useRouter();
  const { settings, colors } = useApp();
  const { activeCard } = useCards();
  const { showQr: showQrParam } = useLocalSearchParams();

  const [connectedProfile, setConnectedProfile] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Your own card link (the active card), not the person you just tapped.
  const mySlug = activeCard?.slug ?? "";
  const myLink = mySlug ? publicProfileUrl(mySlug, "link") : "";

  /* Two expanding rings around the NFC button. */
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [t]);
  const ringA = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + t.value * 0.6 }],
    opacity: 0.35 * (1 - t.value),
  }));
  const ringB = useAnimatedStyle(() => {
    const v = (t.value + 0.5) % 1;
    return { transform: [{ scale: 0.6 + v * 0.6 }], opacity: 0.35 * (1 - v) };
  });

  useEffect(() => {
    if (showQrParam === "true") setShowQr(true);
  }, [showQrParam]);

  useEffect(() => {
    const nfc = getNfc();
    if (!nfc) return;
    nfc.default.start().catch(() => {});
    return () => {
      nfc.default.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  const startNfcScan = async () => {
    const nfc = getNfc();
    if (!nfc) {
      Alert.alert(
        "NFC needs the full app",
        nfcSupportedInThisBuild
          ? "NFC isn't available on this device."
          : "Tapping NFC cards doesn't work inside Expo Go. Use the QR code, or install the SmartCard development build."
      );
      return;
    }
    if (!settings?.nfc_enabled) {
      Alert.alert("NFC is off", "Turn on NFC in Settings to tap cards.");
      return;
    }
    const NfcManager = nfc.default;
    try {
      setScanning(true);
      if (Platform.OS === "ios") Alert.alert("Ready", "Hold your phone near the NFC card");
      await NfcManager.requestTechnology(nfc.NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (!tag?.id) throw new Error("No NFC UID");
      const res = await resolveNfc(tag.id);
      setConnectedProfile(res.data);
      setShowModal(true);
    } catch (err) {
      console.log("NFC Error:", err);
    } finally {
      setScanning(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  const handleSave = async () => {
    try {
      await saveContact({ profile_id: connectedProfile.id });
      setShowModal(false);
      router.push({ pathname: "/profile/[id]", params: { id: connectedProfile.slug } });
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    }
  };

  const copyLink = async () => {
    if (!myLink) return;
    await Clipboard.setStringAsync(myLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <ScreenHeader large title="Tap" subtitle="Exchange cards in person" />

        {/* NFC */}
        <View style={styles.hero}>
          <Pressable
            onPress={startNfcScan}
            accessibilityRole="button"
            accessibilityLabel="Read an NFC card"
            style={styles.pulseWrap}
          >
            <Animated.View style={[styles.ring, { backgroundColor: colors.primary }, ringA]} />
            <Animated.View style={[styles.ring, { backgroundColor: colors.primary }, ringB]} />
            <View style={[styles.core, { backgroundColor: colors.primary }]}>
              <Ionicons name={scanning ? "radio" : "radio-outline"} size={44} color={colors.onPrimary} />
            </View>
          </Pressable>
          <Text style={[Type.title, { color: colors.text, marginTop: Space.lg }]}>
            {scanning ? "Listening…" : "Hold near a card"}
          </Text>
          <Text style={[styles.hint, { color: colors.subText }]}>
            Tap the circle, then bring your phone to an NFC business card or tag.
          </Text>
        </View>

        {/* MY QR */}
        <Surface style={styles.qrRow} onPress={() => setShowQr(true)} accessibilityLabel="Show my QR code">
          <View style={[styles.qrIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="qr-code" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Show my QR code</Text>
            <Text style={[styles.rowSub, { color: colors.subText }]}>For phones without NFC</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subText} />
        </Surface>
      </View>

      {/* QR SHEET */}
      <Modal visible={showQr} transparent animationType="fade" onRequestClose={() => setShowQr(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowQr(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[Type.title, { color: colors.text }]}>Scan to connect</Text>
            <Text style={[styles.hint, { color: colors.subText, marginBottom: Space.xl }]}>
              {activeCard?.display_name ?? "Your card"}
              {activeCard?.label ? ` · ${activeCard.label}` : ""}
            </Text>
            <View style={styles.qrFrame}>
              {myLink ? (
                <QRCode value={publicProfileUrl(mySlug, "qr")} size={200} color="#111" backgroundColor="#FFF" />
              ) : (
                <Text style={{ color: "#666", width: 200, textAlign: "center" }}>Create your card first</Text>
              )}
            </View>
            {myLink ? (
              <Pressable onPress={copyLink} accessibilityRole="button" accessibilityLabel="Copy card link">
                <View style={[styles.linkPill, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={colors.primary} />
                  <Text style={[styles.linkText, { color: colors.primary }]} numberOfLines={1}>
                    {copied ? "Link copied" : myLink.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
                  </Text>
                </View>
              </Pressable>
            ) : null}
            <Button title="Done" variant="secondary" onPress={() => setShowQr(false)} style={{ marginTop: Space.xl, alignSelf: "stretch" }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* CONNECTION FOUND */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.success, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={30} color="#FFF" />
            </View>
            <Text style={[Type.title, { color: colors.text, marginBottom: Space.lg }]}>Card found</Text>
            <View style={[styles.person, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Avatar uri={assetUrl(connectedProfile?.avatar_url ?? connectedProfile?.avatar)} name={connectedProfile?.full_name} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                  {connectedProfile?.full_name}
                </Text>
                {connectedProfile?.job_title ? (
                  <Text style={[styles.rowSub, { color: colors.subText }]} numberOfLines={1}>
                    {connectedProfile.job_title}
                  </Text>
                ) : null}
              </View>
            </View>
            <Button title="Save to network" icon="person-add-outline" onPress={handleSave} style={{ alignSelf: "stretch" }} />
            <Button title="Not now" variant="ghost" onPress={() => setShowModal(false)} style={{ alignSelf: "stretch", marginTop: 4 }} />
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Space.lg },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: Space.xl },
  pulseWrap: { width: 240, height: 240, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 240, height: 240, borderRadius: 120 },
  core: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  hint: { fontSize: 15, textAlign: "center", marginTop: 6, lineHeight: 21, maxWidth: 300 },
  qrRow: { flexDirection: "row", alignItems: "center", gap: Space.md, marginBottom: 96 },
  qrIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowSub: { fontSize: 13, marginTop: 2 },

  overlay: { flex: 1, backgroundColor: "rgba(20,16,10,0.55)", alignItems: "center", justifyContent: "center", padding: Space.xl },
  sheet: { width: "100%", maxWidth: 380, borderRadius: Radius.sheet, padding: Space.xl, alignItems: "center" },
  qrFrame: { padding: 16, backgroundColor: "#FFF", borderRadius: 18 },
  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Space.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    maxWidth: 300,
  },
  linkText: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  success: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: Space.lg },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    alignSelf: "stretch",
    padding: Space.md,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Space.lg,
  },
});
