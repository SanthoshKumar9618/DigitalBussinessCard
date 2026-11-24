import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  TextInput,
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "@/components/context/AppContext";
import SafeScreen from "@/components/ui/Screen1";
import { deleteContact } from "@/services/contactService";
import { useRefresh } from "@/components/context/RefreshContext";
import { BASE_URL } from "@/services/api";
import { updateContactNotes } from "@/services/leadService";

export default function ContactDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useApp();
  const { refreshContacts } = useRefresh();

  const data =
    typeof params.contact === "string"
      ? JSON.parse(params.contact)
      : null;

  const [notes, setNotes] = useState<string>(data?.notes ?? "");
  const [tag, setTag] = useState<string>(data?.tag ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const dirty = notes !== (data?.notes ?? "") || tag !== (data?.tag ?? "");

  if (!data) return null;

  const saveNotes = async () => {
    setSaving(true);
    try {
      const cleanTag = tag.trim().replace(/^#/, "");
      const res = await updateContactNotes(data.id, { notes: notes.trim(), tag: cleanTag });
      data.notes = res.data.notes ?? "";
      data.tag = res.data.tag ?? "";
      setNotes(data.notes);
      setTag(data.tag);
      setSavedAt(Date.now());
      refreshContacts();
    } catch {
      Alert.alert("Couldn't save", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const avatar = data.target_profile?.avatar_url ?? null;
  const phone = data.saved_phone;
  const waDigits = String(data.saved_whatsapp || phone || "").replace(/\D/g, "");
  const email = data.saved_email;

  const handleDelete = () => {
    Alert.alert("Delete Contact", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteContact(data.id);
          refreshContacts();
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeScreen>
      <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        {/* AVATAR */}
        {avatar ? (
          <Image
            source={{
              uri: avatar.startsWith("http")
                ? avatar
                : `${BASE_URL}${avatar}`,
            }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={32} color={colors.subText} />
          </View>
        )}

        <Text style={[styles.name, { color: colors.text }]}>
          {data.saved_display_name}
        </Text>

        {data.saved_job_title && (
          <Text style={[styles.role, { color: colors.primary }]}>
            {data.saved_job_title}
          </Text>
        )}

        {data.saved_company && (
          <Text style={[styles.company, { color: colors.subText }]}>
            @ {data.saved_company}
          </Text>
        )}

        {/* PHONE */}
        {phone && (
          <InfoRow
            icon="call-outline"
            text={phone}
            onPress={() => Linking.openURL(`tel:${phone}`)}
            colors={colors}
          />
        )}

        {/* EMAIL */}
        {email && (
          <InfoRow
            icon="mail-outline"
            text={email}
            onPress={() => Linking.openURL(`mailto:${email}`)}
            colors={colors}
          />
        )}

        {/* WHATSAPP */}
        {!!waDigits && (
          <ActionRow
            icon="logo-whatsapp"
            label="WhatsApp"
            onPress={() => Linking.openURL(`https://wa.me/${waDigits}`)}
            colors={colors}
          />
        )}

        {/* SMS */}
        {phone && (
          <ActionRow
            icon="chatbubble-outline"
            label="Message"
            onPress={() => Linking.openURL(`sms:${phone}`)}
            colors={colors}
          />
        )}

        {/* SOCIAL / LINKS */}
{(data.saved_website ||
  data.saved_linkedin ||
  data.saved_facebook ||
  data.saved_twitter) && (
  <>
    <Text style={[styles.section, { color: colors.subText }]}>
      SOCIAL / LINKS
    </Text>

    <View style={styles.socialGrid}>
      {data.saved_website && (
        <SocialButton
          icon="globe-outline"
          label="Website"
          onPress={() => Linking.openURL(data.saved_website)}
          colors={colors}
        />
      )}

      {data.saved_linkedin && (
        <SocialButton
          icon="logo-linkedin"
          label="LinkedIn"
          onPress={() => Linking.openURL(data.saved_linkedin)}
          colors={colors}
        />
      )}

      {data.saved_facebook && (
        <SocialButton
          icon="logo-facebook"
          label="Facebook"
          onPress={() => Linking.openURL(data.saved_facebook)}
          colors={colors}
        />
      )}

      {data.saved_twitter && (
        <SocialButton
          icon="logo-twitter"
          label="Twitter"
          onPress={() => Linking.openURL(data.saved_twitter)}
          colors={colors}
        />
      )}
    </View>
  </>
)}


        {/* NOTES & TAG (private to you) */}
        <Text style={[styles.section, { color: colors.subText }]}>
          NOTES · ONLY YOU SEE THIS
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Where did you meet? What did you talk about?"
          placeholderTextColor={colors.subText}
          multiline
          maxLength={2000}
          accessibilityLabel="Notes"
          style={[styles.box, styles.notesInput, { backgroundColor: colors.card, color: colors.text }]}
        />
        <TextInput
          value={tag}
          onChangeText={setTag}
          placeholder="#tag (e.g. investor, client)"
          placeholderTextColor={colors.subText}
          autoCapitalize="none"
          maxLength={120}
          accessibilityLabel="Tag"
          style={[styles.box, styles.tagInput, { backgroundColor: colors.card, color: colors.text }]}
        />
        {(dirty || saving) && (
          <TouchableOpacity
            onPress={saveNotes}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Save notes"
          >
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 15 }}>Save notes</Text>
            )}
          </TouchableOpacity>
        )}
        {!dirty && !saving && savedAt && (
          <Text style={{ color: colors.success, marginTop: 8, fontSize: 13 }}>Saved</Text>
        )}

        {/* DELETE */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={18} color="#FFF" />
          <Text style={styles.deleteButtonText}>Delete Contact</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}

/* ---------------- COMPONENTS ---------------- */

function InfoRow({ icon, text, onPress, colors }: any) {
  return (
    <TouchableOpacity
      style={[styles.infoRow, { backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.infoText, { color: colors.text }]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function ActionRow({ icon, label, onPress, colors }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, { backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={[styles.actionText, { color: colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SocialButton({ icon, label, onPress, colors }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.socialBtn, { backgroundColor: colors.card }]}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={[styles.socialText, { color: colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, alignSelf: "center", marginVertical: 20 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, alignSelf: "center", marginVertical: 20, backgroundColor: "#2A2A2A", justifyContent: "center", alignItems: "center" },
  name: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  role: { textAlign: "center", marginTop: 6 },
  company: { textAlign: "center", marginTop: 2 },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, marginTop: 14 },
  infoText: { marginLeft: 12, fontSize: 15 },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 14, marginTop: 12 },
  actionText: { marginLeft: 10, fontSize: 15, fontWeight: "600" },
  section: { marginTop: 28, marginBottom: 8, fontSize: 12, fontWeight: "600" },
  box: { padding: 14, borderRadius: 14 },
  notesInput: { minHeight: 96, textAlignVertical: "top", fontSize: 15 },
  tagInput: { marginTop: 10, fontSize: 15 },
  saveBtn: { marginTop: 12, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  deleteButton: { flexDirection: "row", alignSelf: "center", alignItems: "center", backgroundColor: "#E53935", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 32 },
  deleteButtonText: { color: "#FFF", fontSize: 15, fontWeight: "600", marginLeft: 8 },

  socialGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  marginTop: 10,
},

socialBtn: {
  width: "48%",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 14,
  borderRadius: 14,
  marginBottom: 12,
},

socialText: {
  marginLeft: 8,
  fontSize: 14,
  fontWeight: "600",
},

});
