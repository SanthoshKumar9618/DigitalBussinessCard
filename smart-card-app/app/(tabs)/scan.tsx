import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import api from "../../services/api";
import SafeScreen from "../../components/ui/Screen1";
import { useApp } from "../../components/context/AppContext";
import { useRefresh } from "@/components/context/RefreshContext";
import Button from "@/components/ui/Button";
import { ListRow, ScreenHeader, Surface } from "@/components/ui/kit";
import { Radius, Space, Type } from "@/constants/design";

const FRAME = 260;

export default function ScanScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const { refreshContacts } = useRefresh();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveProfile = async (data: string) => {
    try {
      setSaving(true);
      // https://host/public/view/<slug>?src=qr → <slug>
      const slug = data.startsWith("http")
        ? data.split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop()
        : data;
      if (!slug) throw new Error("Invalid QR data");

      const profileRes = await api.get(`/public/${slug}`, { params: { src: "qr" } });
      await api.post("/contacts/", { target_profile_id: profileRes.data.id, source: "qr" });
      refreshContacts();
      router.replace("/(tabs)/network");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      Alert.alert("Couldn't save contact", typeof detail === "string" ? detail : "That QR code isn't a SmartCard link.");
      setScanned(false);
    } finally {
      setSaving(false);
    }
  };

  const handleScan = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    resolveProfile(data);
  };

  const scanFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos access needed", "Allow access to your photos to scan a saved QR code.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 1 });
    if (result.canceled) return;
    try {
      // Decode the QR on the device (no upload needed).
      const results = await scanFromURLAsync(result.assets[0].uri, ["qr"]);
      const data = results[0]?.data;
      if (!data) throw new Error("no qr");
      setScanned(true);
      await resolveProfile(data);
    } catch {
      Alert.alert("No QR code found", "Try a sharper photo, or scan the code with the camera.");
    }
  };

  const otherWays = (
    <Surface style={{ paddingVertical: 4 }}>
      <ListRow
        icon="image-outline"
        title="Scan from a photo"
        subtitle="Pick a screenshot or picture of a QR code"
        onPress={scanFromGallery}
      />
      <ListRow
        icon="card-outline"
        title="Scan a paper business card"
        subtitle="We read the details for you to review"
        onPress={() => router.push("/scan-card")}
        last
      />
    </Surface>
  );

  return (
    <SafeScreen>
      <View style={styles.container}>
        <ScreenHeader large title="Scan" subtitle="Save someone by scanning their SmartCard QR" />

        {permission?.granted ? (
          <View style={styles.viewfinderWrap}>
            <View style={[styles.viewfinder, { backgroundColor: "#000" }]}>
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={scanned ? undefined : handleScan}
              />
              {/* Corner brackets */}
              {(["tl", "tr", "bl", "br"] as const).map((c) => (
                <View key={c} style={[styles.corner, cornerStyle[c], { borderColor: colors.primary }]} />
              ))}
              {saving ? (
                <View style={styles.savingOverlay}>
                  <ActivityIndicator color="#FFF" size="large" />
                  <Text style={styles.savingText}>Saving contact…</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.helper, { color: colors.subText }]}>
              {scanned ? "Got it" : "Point the camera at a QR code"}
            </Text>
            {scanned && !saving ? (
              <Button title="Scan again" icon="refresh" variant="secondary" size="md" onPress={() => setScanned(false)} style={{ marginTop: Space.md }} />
            ) : null}
          </View>
        ) : (
          <Surface style={styles.permission}>
            <View style={[styles.permIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="camera-outline" size={30} color={colors.primary} />
            </View>
            <Text style={[Type.heading, { color: colors.text, textAlign: "center" }]}>Allow camera access</Text>
            <Text style={[styles.permBody, { color: colors.subText }]}>
              SmartCard uses the camera only to read QR codes. Nothing is recorded.
            </Text>
            <Button title="Allow camera" icon="camera" onPress={requestPermission} style={{ alignSelf: "stretch", marginTop: Space.lg }} />
          </Surface>
        )}

        <Text style={[Type.label, styles.otherLabel, { color: colors.subText }]}>Other ways</Text>
        {otherWays}
      </View>
    </SafeScreen>
  );
}

const B = 28; // bracket length
const cornerStyle = StyleSheet.create({
  tl: { top: 14, left: 14, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: 14, right: 14, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: 14, left: 14, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: 14, right: 14, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: Space.lg, paddingBottom: 96 },
  viewfinderWrap: { alignItems: "center", marginTop: Space.sm },
  viewfinder: { width: FRAME, height: FRAME, borderRadius: Radius.sheet, overflow: "hidden" },
  corner: { position: "absolute", width: B, height: B },
  savingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  savingText: { color: "#FFF", marginTop: Space.md, fontWeight: "600" },
  helper: { fontSize: 14, marginTop: Space.md },
  permission: { alignItems: "center", paddingVertical: Space.xl },
  permIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: Space.md },
  permBody: { fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 6, maxWidth: 300 },
  otherLabel: { marginTop: Space.xl, marginBottom: Space.sm, marginLeft: 4 },
});
