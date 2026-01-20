import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import api from "../../services/api";
import SafeScreen from "../../components/ui/Screen1";
import { useApp } from "../../components/context/AppContext";
import { useRefresh } from "@/components/context/RefreshContext";

export default function ScanScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const { refreshContacts } = useRefresh();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, []);

  /* ---------------- CAMERA PERMISSION UI ---------------- */

  if (!permission?.granted) {
    return (
      <SafeScreen>
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, { color: colors.text }]}>
            Camera permission is required to scan QR codes
          </Text>

          <TouchableOpacity
            onPress={requestPermission}
            style={[
              styles.permissionBtn,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.permissionBtnText}>
              Grant Permission
            </Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  /* ---------------- RESOLVE QR / NFC ---------------- */

  const resolveProfile = async (data: string) => {
  try {
    let slug: string | undefined;

    // 1️⃣ Extract slug from QR
    if (data.startsWith("http")) {
      slug = data.split("/").pop();
    } else {
      slug = data;
    }

    if (!slug) {
      throw new Error("Invalid QR data");
    }

    // 2️⃣ Get profile using slug
    const profileRes = await api.get(`/public/${slug}`);

    // 3️⃣ Save contact (THIS MATCHES BACKEND)
    await api.post("/contacts/", {
      target_profile_id: profileRes.data.id,
      source: "qr",
    });
    refreshContacts(); 

    // 4️⃣ Go to My Network
    router.replace("/(tabs)/network");

  } catch (err: any) {
    alert(err.response?.data?.detail || "Failed to save contact");
    setScanned(false);
  }
};


  /* ---------------- CAMERA SCAN ---------------- */

  const handleScan = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    resolveProfile(data);
  };

  /* ---------------- GALLERY SCAN ---------------- */

  const scanFromGallery = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Gallery permission is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled) return;

    const image = result.assets[0];

    const formData = new FormData();
    formData.append("file", {
      uri: image.uri,
      name: "qr.jpg",
      type: "image/jpeg",
    } as any);

    try {
      const res = await api.post("/qr/decode", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setScanned(true);
      resolveProfile(res.data.data);
    } catch {
      Alert.alert("Scan Failed", "No QR code found in image");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <SafeScreen>
      
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          Scan QR Code
        </Text>

        <Text style={[styles.subtitle, { color: colors.subText }]}>
          Scan a QR code to view and save a profile
        </Text>

        <View style={styles.scannerWrapper}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleScan}
          />
        </View>

        <Text style={[styles.helper, { color: colors.subText }]}>
          Align the QR code within the frame
        </Text>

        {scanned && (
          <TouchableOpacity
            style={[
              styles.rescanBtn,
              { backgroundColor: colors.card },
            ]}
            onPress={() => setScanned(false)}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={colors.text}
            />
            <Text
              style={[styles.rescanText, { color: colors.text }]}
            >
              Scan Again
            </Text>
          </TouchableOpacity>
        )}

        {/* Scan from Gallery */}
        <TouchableOpacity
          style={[
            styles.footerButton,
            { backgroundColor: colors.primary },
          ]}
          onPress={scanFromGallery}
        >
          <Ionicons
            name="image-outline"
            size={18}
            color={colors.bg}
          />
          <Text style={styles.footerText}>Scan from Gallery</Text>
        </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  scannerWrapper: {
    marginTop: 40,
    width: 280,
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
  },

  camera: {
    flex: 1,
  },

  helper: {
    fontSize: 13,
    marginTop: 20,
  },

  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 30,
  },

  rescanText: {
    marginLeft: 8,
    fontWeight: "600",
  },

  /* Permission UI */
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  permissionText: {
    textAlign: "center",
    marginBottom: 20,
  },

  permissionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },

  permissionBtnText: {
    color: "#000",
    fontWeight: "700",
  },

  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 30,
  },

  footerText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
});
