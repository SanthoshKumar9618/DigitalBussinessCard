import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NfcManager, { NfcTech } from "react-native-nfc-manager";
import { resolveNfc } from "../../services/nfcService";
import { saveContact } from "../../services/contactService";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useApp } from "../../components/context/AppContext";
import SafeScreen from "../../components/ui/Screen1";

/* ---------------- SCREEN ---------------- */

export default function TapScreen() {
  const router = useRouter();
  const { settings, colors } = useApp();

  const [connectedProfile, setConnectedProfile] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const { showQr: showQrParam } = useLocalSearchParams();

  const pulse = useSharedValue(1);

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.4, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (showQrParam === "true") {
      setShowQr(true);
    }
  }, [showQrParam]);

  useEffect(() => {
    NfcManager.start();
    return () => {
      NfcManager.cancelTechnologyRequest();
    };
  }, []);

  /* ---------------- NFC ---------------- */

  const startNfcScan = async () => {
    if (!settings?.nfc_enabled) {
      Alert.alert(
        "NFC Disabled",
        "Enable NFC in Settings to use tap feature"
      );
      return;
    }

    try {
      if (Platform.OS === "ios") {
        Alert.alert("Ready", "Hold your phone near the NFC card");
      }

      await NfcManager.requestTechnology(NfcTech.Ndef);

      const tag = await NfcManager.getTag();
      const uid = tag?.id;

      if (!uid) throw new Error("No NFC UID");

      const res = await resolveNfc(uid);
      setConnectedProfile(res.data);
      setShowModal(true);
    } catch (err) {
      console.log("NFC Error:", err);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  };

  /* ---------------- SAVE CONTACT ---------------- */

  const handleSave = async () => {
    try {
      await saveContact({ profile_id: connectedProfile.id });
      setShowModal(false);

      router.push({
        pathname: "/profile/[id]",
        params: { id: connectedProfile.slug },
      });
    } catch {
      Alert.alert("Error", "Unable to save contact");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <SafeScreen>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          Hold near card
        </Text>

        <Text style={[styles.subtitle, { color: colors.subText }]}>
          Bring your phone close to an NFC tag
        </Text>

        {/* NFC PULSE */}
        <TouchableOpacity activeOpacity={0.9} onPress={startNfcScan}>
          <View style={styles.pulseWrapper}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pulse }],
                },
              ]}
            />
            <View
              style={[
                styles.centerCircle,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Ionicons
                name="briefcase-outline"
                size={36}
                color={colors.primary}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* SHOW QR */}
        <TouchableOpacity
          style={[
            styles.qrButton,
            { backgroundColor: colors.card },
          ]}
          onPress={() => setShowQr(true)}
        >
          <Text style={[styles.qrButtonText, { color: colors.text }]}>
            Show QR Code
          </Text>
        </TouchableOpacity>

        {/* QR MODAL */}
        <Modal visible={showQr} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.qrCard,
                { backgroundColor: colors.card },
              ]}
            >
              <Text style={[styles.qrTitle, { color: colors.text }]}>
                Scan to connect
              </Text>

              <QRCode
                value={`https://yourapp.com/${
                  connectedProfile?.slug || "me"
                }`}
                size={160}
                color="#000"
                backgroundColor="#FFF"
              />

              <TouchableOpacity
                onPress={() =>
                  Clipboard.setStringAsync(
                    `https://yourapp.com/${
                      connectedProfile?.slug || "me"
                    }`
                  )
                }
              >
                <Text
                  style={[
                    styles.qrLink,
                    { color: colors.primary },
                  ]}
                >
                  yourapp.com/{connectedProfile?.slug || "me"}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.qrHint, { color: colors.subText }]}>
                Tap link to copy
              </Text>

              <TouchableOpacity onPress={() => setShowQr(false)}>
                <Text
                  style={[styles.dismiss, { color: colors.subText }]}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* SUCCESS MODAL */}
        <Modal visible={showModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.card },
              ]}
            >
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={30} color="#000" />
              </View>

              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Connection Found!
              </Text>

              <View
                style={[
                  styles.profileCard,
                  { backgroundColor: colors.bg },
                ]}
              >
                <Image
                  source={{ uri: connectedProfile?.avatar }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {connectedProfile?.full_name}
                  </Text>
                  <Text
                    style={[
                      styles.role,
                      { color: colors.subText },
                    ]}
                  >
                    {connectedProfile?.job_title}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>Save to Network</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text
                  style={[styles.dismiss, { color: colors.subText }]}
                >
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeScreen>
  );
}

/* ---------------- STYLES (NO COLORS HERE) ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  pulseWrapper: {
    marginTop: 60,
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  centerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  qrButton: {
    marginTop: 80,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 22,
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "80%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  successCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    width: "100%",
    marginBottom: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  name: {
    fontWeight: "600",
  },
  role: {
    fontSize: 12,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  saveText: {
    color: "#000",
    fontWeight: "600",
  },
  dismiss: {
    marginTop: 14,
  },
  qrCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "80%",
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  qrLink: {
    marginTop: 12,
    fontSize: 13,
  },
  qrHint: {
    fontSize: 11,
    marginTop: 4,
  },
});
