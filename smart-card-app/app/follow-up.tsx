import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import { Channel, draftFollowUp, getAiStatus } from "@/services/aiService";
import { updateContactNotes } from "@/services/leadService";
import { apiError } from "@/services/shareKitService";
import { HIT, Radius, Space, Type } from "@/constants/design";

const TONES = ["friendly", "formal", "brief"] as const;

export default function FollowUpScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const params = useLocalSearchParams();
  const contact = typeof params.contact === "string" ? JSON.parse(params.contact) : null;

  const digits = String(contact?.saved_whatsapp || contact?.saved_phone || "").replace(/\D/g, "");
  const channels: { key: Channel; label: string; icon: any; available: boolean }[] = [
    { key: "email", label: "Email", icon: "mail-outline", available: !!contact?.saved_email },
    { key: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp", available: !!digits },
    { key: "linkedin", label: "LinkedIn", icon: "logo-linkedin", available: true },
  ];

  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [channel, setChannel] = useState<Channel>(channels.find((c) => c.available)?.key ?? "linkedin");
  const [tone, setTone] = useState<(typeof TONES)[number]>("friendly");
  const [goal, setGoal] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAiStatus().then((s) => setAiOn(s.follow_up_drafts)).catch(() => setAiOn(false));
  }, []);

  if (!contact) return null;
  const firstName = String(contact.saved_display_name || "them").split(" ")[0];

  const generate = async () => {
    setLoading(true);
    try {
      const d = await draftFollowUp(contact.id, { channel, tone, goal: goal.trim() || undefined });
      setSubject(d.subject);
      setMessage(d.message);
    } catch (e) {
      Alert.alert("Couldn't write a draft", apiError(e, "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const afterSend = () =>
    setTimeout(() => {
      Alert.alert("Sent?", `Mark your follow-up with ${firstName} as done?`, [
        { text: "Not yet" },
        {
          text: "Mark done",
          onPress: async () => {
            await updateContactNotes(contact.id, { follow_up_done: true }).catch(() => {});
            router.back();
          },
        },
      ]);
    }, 600);

  const send = async () => {
    if (!message.trim()) return;
    if (channel === "email") {
      const url = `mailto:${contact.saved_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      await Linking.openURL(url).catch(() => Alert.alert("No email app found"));
    } else if (channel === "whatsapp") {
      await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
    } else {
      await Clipboard.setStringAsync(message);
      const li = contact.saved_linkedin
        ? String(contact.saved_linkedin).startsWith("http")
          ? contact.saved_linkedin
          : `https://www.linkedin.com/in/${String(contact.saved_linkedin).replace(/^@/, "")}`
        : "https://www.linkedin.com/messaging/";
      Alert.alert("Message copied", "Paste it into LinkedIn.", [{ text: "Open LinkedIn", onPress: () => Linking.openURL(li) }]);
    }
    afterSend();
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
            <Text style={[Type.title, { color: colors.text, flex: 1 }]} numberOfLines={1}>Follow up with {firstName}</Text>
          </View>

          {/* CHANNEL */}
          <View style={[styles.segment, { backgroundColor: colors.card }]} accessibilityRole="tablist">
            {channels.map((c) => {
              const active = channel === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  disabled={!c.available}
                  onPress={() => setChannel(c.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active, disabled: !c.available }}
                  style={[styles.segmentBtn, active && { backgroundColor: colors.primary }, !c.available && { opacity: 0.35 }]}
                >
                  <Ionicons name={c.icon} size={16} color={active ? colors.onPrimary : colors.text} />
                  <Text style={{ color: active ? colors.onPrimary : colors.text, fontWeight: "600", marginLeft: 6, fontSize: 13 }}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* AI PANEL */}
          {aiOn && (
            <View style={[styles.panel, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                <Text style={[Type.heading, { color: colors.text, marginLeft: 6 }]}>Write it for me</Text>
              </View>
              <Text style={{ color: colors.subText, fontSize: 13, marginTop: 4 }}>
                Uses your notes{contact.met_at ? ` and where you met (${contact.met_at})` : ""} to write a personal message.
              </Text>
              <View style={styles.chips}>
                {TONES.map((t) => (
                  <TouchableOpacity key={t} onPress={() => setTone(t)}
                    style={[styles.chip, { backgroundColor: tone === t ? colors.primary : colors.bg }]}>
                    <Text style={{ color: tone === t ? colors.onPrimary : colors.text, fontWeight: "600", fontSize: 13, textTransform: "capitalize" }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={goal}
                onChangeText={setGoal}
                placeholder="Goal (optional), e.g. book a 20-min demo"
                placeholderTextColor={colors.subText}
                maxLength={300}
                style={input}
              />
              {!contact.notes && (
                <Text style={{ color: colors.subText, fontSize: 12, marginTop: 8 }}>
                  Tip: add notes to the contact first for a more personal draft.
                </Text>
              )}
              <TouchableOpacity onPress={generate} disabled={loading} accessibilityRole="button"
                style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}>
                {loading ? <ActivityIndicator color={colors.onPrimary} /> : (
                  <>
                    <Ionicons name="sparkles" size={16} color={colors.onPrimary} />
                    <Text style={{ color: colors.onPrimary, fontWeight: "700", marginLeft: 8 }}>{message ? "Rewrite" : "Generate draft"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* MESSAGE */}
          {channel === "email" && (
            <>
              <Text style={[Type.label, { color: colors.subText, marginTop: Space.lg }]}>Subject</Text>
              <TextInput value={subject} onChangeText={setSubject} style={input} accessibilityLabel="Subject" />
            </>
          )}
          <Text style={[Type.label, { color: colors.subText, marginTop: Space.lg }]}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder={aiOn ? "Generate a draft or write your own…" : "Write your message…"}
            placeholderTextColor={colors.subText}
            accessibilityLabel="Message"
            style={[input, { minHeight: 180, textAlignVertical: "top", paddingTop: 12, lineHeight: 21 }]}
          />
          {!!message && aiOn && (
            <Text style={{ color: colors.subText, fontSize: 12, marginTop: 6 }}>AI draft: read it over before sending.</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(channel === "email" && subject ? `${subject}\n\n${message}` : message); Alert.alert("Copied"); }}
              disabled={!message} accessibilityRole="button"
              style={[styles.btn, styles.half, { borderWidth: 1, borderColor: colors.border, opacity: message ? 1 : 0.4 }]}>
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: "600", marginLeft: 6 }}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={send} disabled={!message} accessibilityRole="button"
              style={[styles.btn, styles.half, { backgroundColor: colors.primary, opacity: message ? 1 : 0.4 }]}>
              <Ionicons name="send" size={16} color={colors.onPrimary} />
              <Text style={{ color: colors.onPrimary, fontWeight: "700", marginLeft: 6 }}>
                {channel === "email" ? "Open in Mail" : channel === "whatsapp" ? "Open WhatsApp" : "Copy & open"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: Space.lg, paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Space.lg },
  back: { width: HIT, height: HIT, justifyContent: "center" },
  segment: { flexDirection: "row", borderRadius: Radius.card, padding: 4 },
  segmentBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 38, borderRadius: Radius.card - 4 },
  panel: { borderRadius: Radius.card, padding: Space.lg, marginTop: Space.lg },
  chips: { flexDirection: "row", gap: Space.sm, marginTop: Space.md },
  chip: { paddingHorizontal: 14, minHeight: 34, justifyContent: "center", borderRadius: Radius.pill },
  input: { borderWidth: 1, borderRadius: Radius.card, paddingHorizontal: 14, minHeight: HIT, marginTop: 6, fontSize: 15 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: Radius.card, marginTop: Space.md },
  actions: { flexDirection: "row", gap: Space.sm, marginTop: Space.md },
  half: { flex: 1 },
});
