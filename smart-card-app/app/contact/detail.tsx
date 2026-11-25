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
import Button from "@/components/ui/Button";
import { deleteContact } from "@/services/contactService";
import { useRefresh } from "@/components/context/RefreshContext";
import { BASE_URL } from "@/services/api";
import { updateContactNotes } from "@/services/leadService";
import { reminderIn } from "@/services/aiService";
import { scheduleReminder } from "@/services/reminderNotifications";

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
  const [metAt, setMetAt] = useState<string>(data?.met_at ?? "");
  const [followUpAt, setFollowUpAt] = useState<string | null>(
    data?.follow_up_at && !data?.follow_up_done ? data.follow_up_at : null
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const dirty =
    notes !== (data?.notes ?? "") || tag !== (data?.tag ?? "") || metAt !== (data?.met_at ?? "");

  if (!data) return null;

  const setReminder = async (days: number | null) => {
    const at = days === null ? null : reminderIn(days);
    const prev = followUpAt;
    setFollowUpAt(at);
    try {
      await updateContactNotes(data.id, { follow_up_at: at });
      data.follow_up_at = at;
      data.follow_up_done = false;
      scheduleReminder(data.id, data.saved_display_name || "", at);
      refreshContacts();
    } catch {
      setFollowUpAt(prev);
      Alert.alert("Couldn't set reminder", "Please try again.");
    }
  };

  const openFollowUp = () =>
    router.push({
      pathname: "/follow-up",
      params: { contact: JSON.stringify({ ...data, notes, tag, met_at: metAt }) },
    });

  const saveNotes = async () => {
    setSaving(true);
    try {
      const cleanTag = tag.trim().replace(/^#/, "");
      const res = await updateContactNotes(data.id, { notes: notes.trim(), tag: cleanTag, met_at: metAt.trim() });
      data.notes = res.data.notes ?? "";
      data.tag = res.data.tag ?? "";
      data.met_at = res.data.met_at ?? "";
      setNotes(data.notes);
      setTag(data.tag);
      setMetAt(data.met_at);
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
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primarySoft }]}>
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


        {/* FOLLOW UP */}
        <Text style={[styles.section, { color: colors.subText }]}>FOLLOW UP</Text>
        <View style={[styles.box, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="alarm-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, marginLeft: 8, flex: 1 }}>
              {followUpAt ? `Reminder: ${formatWhen(followUpAt)}` : "No reminder set"}
            </Text>
            {followUpAt && (
              <TouchableOpacity onPress={() => setReminder(null)} accessibilityLabel="Clear reminder">
                <Ionicons name="close-circle" size={20} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.chipRow}>
            {[["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7], ["In 2 weeks", 14]].map(([label, days]) => (
              <TouchableOpacity
                key={label as string}
                onPress={() => setReminder(days as number)}
                style={[styles.chip, { backgroundColor: colors.bg }]}
              >
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={openFollowUp}
            style={[styles.saveBtn, { backgroundColor: colors.primary, flexDirection: "row" }]}
            accessibilityRole="button"
          >
            <Ionicons name="sparkles-outline" size={16} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 15, marginLeft: 8 }}>
              Write a follow-up
            </Text>
          </TouchableOpacity>
        </View>

        {/* WHERE YOU MET */}
        <Text style={[styles.section, { color: colors.subText }]}>
          WHERE YOU MET{data.met_on ? ` · ${new Date(data.met_on + "T00:00:00").toLocaleDateString()}` : ""}
        </Text>
        <TextInput
          value={metAt}
          onChangeText={setMetAt}
          placeholder="Event or place, e.g. TechSummit Bengaluru"
          placeholderTextColor={colors.subText}
          maxLength={255}
          accessibilityLabel="Where you met"
          style={[styles.box, styles.tagInput, { backgroundColor: colors.card, color: colors.text, marginTop: 0 }]}
        />

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
        <Button title="Delete contact" icon="trash-outline" variant="danger" onPress={handleDelete} style={{ marginTop: 32 }} />
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
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, alignSelf: "center", marginVertical: 20, justifyContent: "center", alignItems: "center" },
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
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

function formatWhen(iso: string) {
  const d = new Date(iso);
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days < 0) return `overdue (${d.toLocaleDateString()})`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
