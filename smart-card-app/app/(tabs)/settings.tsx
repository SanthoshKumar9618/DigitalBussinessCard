import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { logout } from "../../services/authService";
import { useRouter } from "expo-router";
import { useApp } from "../../components/context/AppContext";
import { LANGUAGES } from "../../constants/i18n";
import SafeScreen from "@/components/ui/Screen1";

/* ---------------- SCREEN ---------------- */

export default function SettingsScreen() {
  const router = useRouter();

  const {
    settings,
    loading,
    updateSetting,
    colors,
    setOpenEditProfile,
    t,
  } = useApp();

  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  if (loading || !settings) return null;

  /* ---------- LOGOUT ---------- */
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <>
    <SafeScreen>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          {t("settings")}
        </Text>

        {/* ACCOUNT */}
        <SettingsSection title="Account" colors={colors}>
          <SettingsRow
            label="Edit Profile"
            colors={colors}
            onPress={() => {
              setOpenEditProfile(true);
              router.push("/(tabs)/profile");
            }}
          />

          <SettingsToggle
            label="Public Profile"
            value={settings.public_profile}
            onChange={(v: boolean) => updateSetting("public_profile", v)}
            colors={colors}
          />

          <SettingsToggle
            label="Show Phone Number"
            value={settings.show_phone}
            onChange={(v: boolean) => updateSetting("show_phone", v)}
            colors={colors}
          />

          <SettingsToggle
            label="Show Email Address"
            value={settings.show_email}
            onChange={(v: boolean) => updateSetting("show_email", v)}
            colors={colors}
          />
        </SettingsSection>

        {/* CARD & TEMPLATE */}
        <SettingsSection title="Card & Template" colors={colors}>
  <SettingsRow
    label="Card Template"
    colors={colors}
    onPress={() => setShowTemplateModal(true)}
  />

  <SettingsToggle
    label="Watermark on Card"
    value={settings.watermark_enabled}
    onChange={(v: boolean) =>
      updateSetting("watermark_enabled", v)
    }
    colors={colors}
  />
</SettingsSection>


        {/* QR & NFC */}
        <SettingsSection title="QR & NFC" colors={colors}>
          <SettingsRow
            label="Show My QR Code"
            colors={colors}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/tap",
                params: { showQr: "true" },
              })
            }
          />

          <SettingsToggle
            label="Enable NFC"
            value={settings.nfc_enabled}
            onChange={(v: boolean) => updateSetting("nfc_enabled", v)}
            colors={colors}
          />
        </SettingsSection>

        {/* PREFERENCES */}
        <SettingsSection title="Preferences" colors={colors}>
          <SettingsRow
            label={t("theme")}
            colors={colors}
            onPress={() => setShowThemePicker(true)}
          />

          <SettingsRow
            label={t("language")}
            colors={colors}
            onPress={() => setShowLangPicker(true)}
          />
        </SettingsSection>

        {/* SUPPORT */}
        <SettingsSection title="Support" colors={colors}>
          <SettingsRow label="Help & FAQ" colors={colors} />
          <SettingsRow label="Privacy Policy" colors={colors} />
          <SettingsRow label="About App" colors={colors} />
        </SettingsSection>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* THEME MODAL */}
      <Modal visible={showThemePicker} transparent animationType="fade">
        <ModalCard colors={colors}>
          {["dark", "light"].map((mode) => (
            <ModalItem
              key={mode}
              label={mode === "dark" ? "Dark" : "Light"}
              onPress={() => {
                updateSetting("theme", mode);
                setShowThemePicker(false);
              }}
              colors={colors}
            />
          ))}
        </ModalCard>
      </Modal>

      {/* LANGUAGE MODAL */}
      <Modal visible={showLangPicker} transparent animationType="fade">
        <ModalCard colors={colors}>
          {Object.entries(LANGUAGES).map(([key, value]) => (
            <ModalItem
              key={key}
              label={value.name}
              onPress={() => {
                updateSetting("language", key);
                setShowLangPicker(false);
              }}
              colors={colors}
            />
          ))}
        </ModalCard>
      </Modal>
      </SafeScreen>
    </>
  );
}

/* ---------------- REUSABLE COMPONENTS ---------------- */

function SettingsSection({ title, colors, children }: any) {
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.subText }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function SettingsRow({ label, onPress, colors }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={{ color: colors.text }}>{label}</Text>
      {onPress && (
        <Ionicons name="chevron-forward" size={18} color={colors.subText} />
      )}
    </TouchableOpacity>
  );
}

type SettingsToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  colors: any;
};

function SettingsToggle({
  label,
  value,
  onChange,
  colors,
}: SettingsToggleProps) {

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      <Text style={{ color: colors.text }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function ModalCard({ children, colors }: any) {
  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
        {children}
      </View>
    </View>
  );
}

function ModalItem({ label, onPress, colors }: any) {
  return (
    <TouchableOpacity style={styles.modalItem} onPress={onPress}>
      <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginVertical: 16,
  },
  section: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 12,
    marginLeft: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  logoutBtn: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 14,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    paddingVertical: 8,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
