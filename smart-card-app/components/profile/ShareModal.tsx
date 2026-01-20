import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

export default function ShareModal({ visible, onClose, profile }: any) {
  const profileUrl = `https://yourapp.com/${profile.slug}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(profileUrl);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          <View style={styles.handle} />

          <Text style={styles.title}>Share your profile</Text>

          <View style={styles.row}>
            <TouchableOpacity style={styles.action} onPress={copyLink}>
              <Ionicons name="link" size={22} color="#fff" />
              <Text style={styles.actionText}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action}>
              <Ionicons name="logo-whatsapp" size={22} color="#22C55E" />
              <Text style={styles.actionText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.qrBox}>
            <Image source={{ uri: profile.qr_url }} style={{ width: 120, height: 120 }} />
            <Text style={styles.link}>{profileUrl}</Text>
          </View>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#0B1220",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#374151",
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  action: {
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    marginTop: 8,
    fontSize: 12,
  },
  qrBox: {
    alignItems: "center",
    marginBottom: 16,
  },
  link: {
    color: "#6B7280",
    marginTop: 8,
    fontSize: 12,
  },
  close: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 12,
  },
});
