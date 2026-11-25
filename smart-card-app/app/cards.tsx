import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useRouter } from "expo-router";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import { useCards } from "@/context/CardContext";
import { Card, createCard, deleteCard, makePrimary, updateCard } from "@/services/cardsService";
import { apiError } from "@/services/shareKitService";
import { HIT, Radius, Space, Type } from "@/constants/design";

const MAX_CARDS = 5;
const SUGGESTIONS = ["Work", "Personal", "Freelance", "Event"];

export default function ManageCardsScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const { cards, activeCard, setActiveCard, refreshCards } = useCards();

  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [copy, setCopy] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: "", contact_email: "", contact_phone: "" });
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshCards().finally(() => setLoading(false));
    }, [refreshCards])
  );

  const onCreate = async () => {
    if (!newLabel.trim()) return;
    setCreating(true);
    try {
      const card = await createCard(newLabel.trim(), copy ? { copy_from: activeCard?.id } : { blank: true });
      setNewLabel("");
      await refreshCards();
      await setActiveCard(card.id);
      Alert.alert(`“${card.label}” created`, "It's now your active card. Edit its details from the Profile tab.", [
        { text: "Stay here" },
        { text: "Edit card", onPress: () => router.push("/(tabs)/profile") },
      ]);
    } catch (e) {
      Alert.alert("Couldn't create card", apiError(e, "Please try again."));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c: Card) => {
    setEditing(c.id);
    setDraft({ label: c.label, contact_email: c.contact_email ?? "", contact_phone: c.contact_phone ?? "" });
  };

  const saveEdit = async (c: Card) => {
    setSaving(true);
    try {
      await updateCard(c.id, draft);
      await refreshCards();
      setEditing(null);
    } catch (e) {
      Alert.alert("Couldn't save", apiError(e, "Check the details and try again."));
    } finally {
      setSaving(false);
    }
  };

  const onPrimary = async (c: Card) => {
    try {
      await makePrimary(c.id);
      await refreshCards();
    } catch (e) {
      Alert.alert("Couldn't change primary card", apiError(e, "Please try again."));
    }
  };

  const onDelete = (c: Card) =>
    Alert.alert(
      `Delete “${c.label}”?`,
      "Its links, design, leads and stats are removed. Its link, QR codes and NFC tags will open your primary card instead, and people who saved it keep you as a contact.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCard(c.id);
              await refreshCards();
            } catch (e) {
              Alert.alert("Couldn't delete", apiError(e, "Please try again."));
            }
          },
        },
      ]
    );

  const inputStyle = [styles.input, { backgroundColor: colors.elevated, color: colors.text, borderColor: colors.border }];

  return (
    <SafeScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[Type.title, { color: colors.text }]}>My cards</Text>
          </View>
          <Text style={{ color: colors.subText, marginBottom: Space.lg }}>
            Keep separate cards for work, personal or side projects. Each has its own link, QR code, links and stats.
          </Text>

          {loading && cards.length === 0 && <ActivityIndicator color={colors.primary} />}

          {cards.map((c) => {
            const isEditing = editing === c.id;
            const isActive = activeCard?.id === c.id;
            return (
              <View key={c.id} style={[styles.card, { backgroundColor: colors.card, borderColor: isActive ? colors.primary : "transparent" }]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                      <Text style={[Type.heading, { color: colors.text }]}>{c.label}</Text>
                      {c.is_primary && <Badge text="PRIMARY" colors={colors} />}
                      {isActive && <Badge text="ACTIVE" colors={colors} subtle />}
                    </View>
                    <Text style={{ color: colors.subText, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                      {[c.display_name, c.job_title, c.company].filter(Boolean).join(" · ")}
                    </Text>
                    <Text style={{ color: colors.subText, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {c.email || "No email shown"}{c.phone ? ` · ${c.phone}` : ""}
                    </Text>
                  </View>
                </View>

                {isEditing ? (
                  <View>
                    <Text style={[Type.label, { color: colors.subText, marginTop: Space.md }]}>Card name</Text>
                    <TextInput value={draft.label} onChangeText={(v) => setDraft({ ...draft, label: v })} maxLength={50} style={inputStyle} />
                    <Text style={[Type.label, { color: colors.subText, marginTop: Space.md }]}>Email on this card (optional)</Text>
                    <TextInput
                      value={draft.contact_email}
                      onChangeText={(v) => setDraft({ ...draft, contact_email: v })}
                      placeholder="Uses your account email if empty"
                      placeholderTextColor={colors.subText}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={inputStyle}
                    />
                    <Text style={[Type.label, { color: colors.subText, marginTop: Space.md }]}>Phone on this card (optional)</Text>
                    <TextInput
                      value={draft.contact_phone}
                      onChangeText={(v) => setDraft({ ...draft, contact_phone: v })}
                      placeholder="Uses your account phone if empty"
                      placeholderTextColor={colors.subText}
                      keyboardType="phone-pad"
                      style={inputStyle}
                    />
                    <Text style={{ color: colors.subText, fontSize: 12, marginTop: 6 }}>
                      Shown only if “Show email / phone” is on in Settings.
                    </Text>
                    <View style={styles.actions}>
                      <Btn label="Cancel" onPress={() => setEditing(null)} colors={colors} />
                      <Btn label={saving ? "Saving…" : "Save"} primary disabled={saving || !draft.label.trim()} onPress={() => saveEdit(c)} colors={colors} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    {!isActive && <Btn icon="swap-horizontal-outline" label="Use" onPress={() => setActiveCard(c.id)} colors={colors} />}
                    <Btn icon="create-outline" label="Edit" onPress={() => startEdit(c)} colors={colors} />
                    {!c.is_primary && <Btn icon="star-outline" label="Make primary" onPress={() => onPrimary(c)} colors={colors} />}
                    {!c.is_primary && <Btn icon="trash-outline" label="Delete" danger onPress={() => onDelete(c)} colors={colors} />}
                  </View>
                )}
              </View>
            );
          })}

          {/* NEW CARD */}
          {cards.length > 0 && cards.length < MAX_CARDS && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[Type.heading, { color: colors.text }]}>New card</Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.filter((s) => !cards.some((c) => c.label.toLowerCase() === s.toLowerCase())).map((s) => (
                  <TouchableOpacity key={s} onPress={() => setNewLabel(s)} style={[styles.chip, { backgroundColor: newLabel === s ? colors.primary : colors.bg }]}>
                    <Text style={{ color: newLabel === s ? colors.onPrimary : colors.text, fontSize: 13, fontWeight: "600" }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="Card name (e.g. Work)"
                placeholderTextColor={colors.subText}
                maxLength={50}
                style={inputStyle}
              />
              <View style={styles.switchRow}>
                <Text style={{ color: colors.text, flex: 1 }}>Copy details from “{activeCard?.label ?? "current card"}”</Text>
                <Switch value={copy} onValueChange={setCopy} trackColor={{ true: colors.primary }} />
              </View>
              <Btn label={creating ? "Creating…" : "Create card"} primary disabled={creating || !newLabel.trim()} onPress={onCreate} colors={colors} />
            </View>
          )}
          {cards.length >= MAX_CARDS && (
            <Text style={{ color: colors.subText, textAlign: "center", marginTop: Space.md }}>
              You have the maximum of {MAX_CARDS} cards.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

function Badge({ text, colors, subtle }: any) {
  return (
    <Text
      style={[
        styles.badge,
        { color: subtle ? colors.subText : colors.primary, backgroundColor: subtle ? colors.bg : colors.primarySoft },
      ]}
    >
      {text}
    </Text>
  );
}

function Btn({ label, icon, onPress, primary, danger, disabled, colors }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        styles.btn,
        primary ? { backgroundColor: colors.primary, flexGrow: 1 } : { borderColor: colors.border, borderWidth: 1 },
        { opacity: disabled ? 0.45 : 1 },
      ]}
    >
      {icon && <Ionicons name={icon} size={15} color={danger ? colors.danger : colors.primary} style={{ marginRight: 6 }} />}
      <Text style={{ color: primary ? colors.onPrimary : danger ? colors.danger : colors.text, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: Space.lg, paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Space.sm },
  back: { width: HIT, height: HIT, justifyContent: "center" },
  card: { borderRadius: Radius.card, padding: Space.lg, marginBottom: Space.md, borderWidth: 1.5, borderColor: "transparent" },
  cardHead: { flexDirection: "row", alignItems: "flex-start" },
  badge: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.chip, marginLeft: 8, overflow: "hidden" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm, marginTop: Space.md },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 38, paddingHorizontal: 14, borderRadius: Radius.pill },
  input: { borderWidth: 1, borderRadius: Radius.card, paddingHorizontal: 14, minHeight: HIT, marginTop: 6, fontSize: 15 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm, marginTop: Space.md },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  switchRow: { flexDirection: "row", alignItems: "center", marginVertical: Space.md },
});
