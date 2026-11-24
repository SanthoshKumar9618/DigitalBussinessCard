import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import { useRefresh } from "@/components/context/RefreshContext";
import { getAiStatus, ManualContact, reminderIn, saveManualContact, scanCard } from "@/services/aiService";
import { updateContactNotes } from "@/services/leadService";
import { apiError } from "@/services/shareKitService";
import { HIT, Radius, Space, Type } from "@/constants/design";

type Step = "pick" | "reading" | "review";

const FIELDS: { key: keyof ManualContact; label: string; keyboard?: any; autoCap?: any }[] = [
  { key: "name", label: "Name *" },
  { key: "job_title", label: "Job title" },
  { key: "company", label: "Company" },
  { key: "phone", label: "Phone", keyboard: "phone-pad" },
  { key: "email", label: "Email", keyboard: "email-address", autoCap: "none" },
  { key: "website", label: "Website", keyboard: "url", autoCap: "none" },
  { key: "linkedin", label: "LinkedIn", autoCap: "none" },
  { key: "address", label: "Address" },
];

const REMINDERS = [
  { label: "No reminder", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
];

export default function ScanCardScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const { refreshContacts } = useRefresh();

  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<ManualContact>({ name: "" });
  const [extras, setExtras] = useState<string[]>([]);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [remindDays, setRemindDays] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAiStatus().then((s) => setAiOn(s.scan_card)).catch(() => setAiOn(false));
  }, []);

  const pick = async (from: "camera" | "library") => {
    const perm =
      from === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", from === "camera" ? "Allow camera access to photograph the card." : "Allow photo access to choose the card.");
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8, allowsEditing: true };
    const result = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setPhoto(uri);
    setStep("reading");
    try {
      const card = await scanCard(uri);
      const { other_emails, other_phones, confidence, notes, ...fields } = card;
      setForm({ ...fields, notes, whatsapp: fields.phone, source: "scan" });
      setExtras([...other_phones, ...other_emails]);
      setLowConfidence(confidence === "low");
      setStep("review");
    } catch (e) {
      Alert.alert("Couldn't read the card", apiError(e, "Try again with a sharper, well-lit photo."), [
        { text: "Retake", onPress: () => setStep("pick") },
        { text: "Type it in", onPress: () => { setForm({ name: "", source: "scan" }); setStep("review"); } },
      ]);
    }
  };

  const save = async () => {
    if (!form.name?.trim()) {
      Alert.alert("Name needed", "Add at least the person's name.");
      return;
    }
    setSaving(true);
    try {
      const extraNote = extras.length ? `Also on card: ${extras.join(", ")}` : "";
      const notes = [form.notes, extraNote].filter(Boolean).join("\n");
      const contact = await saveManualContact({ ...form, notes, source: form.source ?? "manual" });
      if (remindDays > 0) {
        await updateContactNotes(contact.id, { follow_up_at: reminderIn(remindDays) });
      }
      refreshContacts?.();
      Alert.alert("Saved", `${form.name} is in your network.`, [
        { text: "Scan another", onPress: () => { setForm({ name: "" }); setPhoto(null); setExtras([]); setStep("pick"); } },
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Couldn't save", apiError(e, "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const input = [styles.input, { backgroundColor: colors.elevated, color: colors.text, borderColor: colors.border }];

  return (
    <SafeScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[Type.title, { color: colors.text }]}>Paper business card</Text>
          </View>

          {step === "pick" && (
            <View>
              <View style={[styles.hero, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="card-outline" size={40} color={colors.primary} />
                <Text style={[Type.heading, { color: colors.text, marginTop: Space.md, textAlign: "center" }]}>
                  {aiOn === false ? "Add a contact" : "Snap a card, we fill in the details"}
                </Text>
                <Text style={{ color: colors.subText, textAlign: "center", marginTop: 6 }}>
                  {aiOn === false
                    ? "Automatic card reading isn't switched on yet. You can type the details instead."
                    : "Lay the card flat in good light. You'll review everything before it's saved."}
                </Text>
              </View>
              {aiOn !== false && (
                <>
                  <Primary label="Take a photo" icon="camera-outline" onPress={() => pick("camera")} disabled={aiOn === null} colors={colors} />
                  <Secondary label="Choose from photos" icon="images-outline" onPress={() => pick("library")} disabled={aiOn === null} colors={colors} />
                </>
              )}
              <Secondary label="Type it in instead" icon="create-outline" onPress={() => { setForm({ name: "", source: "manual" }); setStep("review"); }} colors={colors} />
              {aiOn && (
                <Text style={{ color: colors.subText, fontSize: 12, textAlign: "center", marginTop: Space.lg }}>
                  The photo is sent to our AI provider (Anthropic) only to read the text. SmartCard does not save the photo.
                </Text>
              )}
            </View>
          )}

          {step === "reading" && (
            <View style={{ alignItems: "center", marginTop: Space.xl }}>
              {photo && <Image source={{ uri: photo }} style={styles.photo} resizeMode="contain" />}
              <ActivityIndicator color={colors.primary} style={{ marginTop: Space.lg }} />
              <Text style={{ color: colors.subText, marginTop: Space.sm }}>Reading the card…</Text>
            </View>
          )}

          {step === "review" && (
            <View>
              {photo && <Image source={{ uri: photo }} style={[styles.photo, { height: 140 }]} resizeMode="contain" />}
              {lowConfidence && (
                <View style={[styles.notice, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, marginLeft: 8, flex: 1, fontSize: 13 }}>
                    The photo was hard to read. Please double-check the details.
                  </Text>
                </View>
              )}
              {FIELDS.map((f) => (
                <View key={f.key}>
                  <Text style={[Type.label, { color: colors.subText, marginTop: Space.md }]}>{f.label}</Text>
                  <TextInput
                    value={(form[f.key] as string) ?? ""}
                    onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                    keyboardType={f.keyboard}
                    autoCapitalize={f.autoCap}
                    accessibilityLabel={f.label}
                    style={input}
                  />
                </View>
              ))}
              {extras.length > 0 && (
                <Text style={{ color: colors.subText, fontSize: 12, marginTop: 8 }}>
                  Also on the card (added to notes): {extras.join(", ")}
                </Text>
              )}
              <Text style={[Type.label, { color: colors.subText, marginTop: Space.lg }]}>Where did you meet?</Text>
              <TextInput
                value={form.met_at ?? ""}
                onChangeText={(v) => setForm({ ...form, met_at: v })}
                placeholder="e.g. TechSummit Bengaluru"
                placeholderTextColor={colors.subText}
                style={input}
              />
              <Text style={[Type.label, { color: colors.subText, marginTop: Space.md }]}>Notes</Text>
              <TextInput
                value={form.notes ?? ""}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                placeholder="What did you talk about?"
                placeholderTextColor={colors.subText}
                multiline
                style={[input, { minHeight: 80, textAlignVertical: "top", paddingTop: 12 }]}
              />
              <Text style={[Type.label, { color: colors.subText, marginTop: Space.md }]}>Remind me to follow up</Text>
              <View style={styles.chips}>
                {REMINDERS.map((r) => (
                  <TouchableOpacity
                    key={r.days}
                    onPress={() => setRemindDays(r.days)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: remindDays === r.days }}
                    style={[styles.chip, { backgroundColor: remindDays === r.days ? colors.primary : colors.card }]}
                  >
                    <Text style={{ color: remindDays === r.days ? colors.onPrimary : colors.text, fontWeight: "600", fontSize: 13 }}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Primary label={saving ? "Saving…" : "Save to my network"} icon="checkmark" onPress={save} disabled={saving} colors={colors} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

function Primary({ label, icon, onPress, disabled, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={[styles.btn, { backgroundColor: colors.primary, opacity: disabled ? 0.5 : 1 }]}>
      <Ionicons name={icon} size={18} color={colors.onPrimary} />
      <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 15, marginLeft: 8 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Secondary({ label, icon, onPress, disabled, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={[styles.btn, { borderWidth: 1, borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15, marginLeft: 8 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: Space.lg, paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Space.lg },
  back: { width: HIT, height: HIT, justifyContent: "center" },
  hero: { borderRadius: Radius.sheet, padding: Space.xl, alignItems: "center", marginBottom: Space.lg },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 50, borderRadius: Radius.card, marginTop: Space.md },
  photo: { width: "100%", height: 200, borderRadius: Radius.card },
  notice: { flexDirection: "row", alignItems: "center", borderRadius: Radius.card, padding: Space.md, marginTop: Space.md },
  input: { borderWidth: 1, borderRadius: Radius.card, paddingHorizontal: 14, minHeight: HIT, marginTop: 6, fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm, marginTop: 6 },
  chip: { paddingHorizontal: 14, minHeight: 36, justifyContent: "center", borderRadius: Radius.pill },
});
