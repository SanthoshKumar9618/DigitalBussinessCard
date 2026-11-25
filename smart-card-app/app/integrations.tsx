import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import * as Clipboard from "expo-clipboard";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import { HIT, Radius, Space, Type } from "@/constants/design";
import { apiError } from "@/services/shareKitService";
import {
  addWebhook, connectHubSpot, deleteWebhook, disconnectHubSpot, getIntegrations, Integrations,
  setHubSpotAutoSync, syncHubSpot, testWebhook, toggleWebhook,
} from "@/services/integrationsService";

const EVENT_LABELS: Record<string, string> = {
  "lead.created": "Someone shares their details (new lead)",
  "contact.saved": "You save a contact",
};

export default function IntegrationsScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const [data, setData] = useState<Integrations | null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["lead.created", "contact.saved"]);
  const [token, setToken] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await getIntegrations());
    } catch {
      Alert.alert("Couldn't load integrations");
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (fn: () => Promise<any>, fail: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      Alert.alert(fail, apiError(e, "Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const onAddWebhook = () =>
    run(async () => {
      const hook = await addWebhook(url.trim(), events);
      setUrl("");
      Alert.alert(
        "Webhook added",
        `Signing secret (shown only once):\n\n${hook.secret}\n\nUse it to verify the X-SmartCard-Signature header.`,
        [{ text: "Copy secret", onPress: () => Clipboard.setStringAsync(hook.secret ?? "") }, { text: "Done" }]
      );
    }, "Couldn't add webhook");

  const input = [styles.input, { backgroundColor: colors.elevated, color: colors.text, borderColor: colors.border }];

  return (
    <SafeScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[Type.title, { color: colors.text, flex: 1 }]}>Integrations</Text>
            {busy && <ActivityIndicator color={colors.primary} />}
          </View>

          {!data && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}

          {data && (
            <>
              {/* HUBSPOT */}
              <Section colors={colors} icon="briefcase-outline" title="HubSpot CRM"
                hint="Send new leads and contacts to HubSpot automatically. Matched by email, so there are never duplicates.">
                {!data.crm_allowed ? (
                  <Text style={{ color: colors.subText }}>CRM sync is part of the Pro plan.</Text>
                ) : data.hubspot.connected ? (
                  <>
                    <View style={styles.switchRow}>
                      <Text style={{ color: colors.text, flex: 1 }}>Auto-sync new leads & contacts</Text>
                      <Switch value={!!data.hubspot.auto_sync} trackColor={{ true: colors.primary }}
                        onValueChange={(v) => run(() => setHubSpotAutoSync(v), "Couldn't update")} />
                    </View>
                    <Text style={{ color: data.hubspot.last_error ? colors.danger : colors.subText, fontSize: 13 }}>
                      {data.hubspot.last_error
                        ? data.hubspot.last_error
                        : data.hubspot.last_sync_at
                          ? `Last sync: ${new Date(data.hubspot.last_sync_at).toLocaleString()} · ${data.hubspot.last_sync_count ?? 0} contacts`
                          : "Connected. Nothing synced yet."}
                    </Text>
                    <Btn primary icon="sync-outline" label="Sync everything now" colors={colors}
                      onPress={() => run(async () => {
                        const r = await syncHubSpot();
                        Alert.alert("Sync started", `${r.queued} contacts are being sent to HubSpot.${r.skipped_without_email ? ` ${r.skipped_without_email} without an email were skipped.` : ""}`);
                      }, "Couldn't sync")} />
                    <Btn danger icon="unlink-outline" label="Disconnect" colors={colors}
                      onPress={() => run(disconnectHubSpot, "Couldn't disconnect")} />
                  </>
                ) : (
                  <>
                    <Text style={{ color: colors.subText, fontSize: 13 }}>
                      In HubSpot: Settings → Integrations → Private Apps → Create app with the scope
                      “crm.objects.contacts.write”, then paste its access token here.
                    </Text>
                    <TextInput value={token} onChangeText={setToken} placeholder="pat-na1-…" placeholderTextColor={colors.subText}
                      autoCapitalize="none" autoCorrect={false} secureTextEntry style={input} />
                    <Btn primary icon="link-outline" label="Connect HubSpot" colors={colors} disabled={token.trim().length < 10}
                      onPress={() => run(async () => { await connectHubSpot(token.trim()); setToken(""); }, "Couldn't connect")} />
                    <TouchableOpacity onPress={() => Linking.openURL("https://developers.hubspot.com/docs/api/private-apps")}>
                      <Text style={{ color: colors.primary, marginTop: Space.sm, fontSize: 13 }}>How to create a Private App token</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Section>

              {/* WEBHOOKS */}
              <Section colors={colors} icon="git-network-outline" title="Webhooks (Zapier, Make, n8n)"
                hint="Connect SmartCard to 6,000+ apps: paste a Zapier “Catch Hook” URL and we'll POST events to it.">
                {!data.webhooks_allowed ? (
                  <Text style={{ color: colors.subText }}>Webhooks are part of the Pro plan.</Text>
                ) : (
                  <>
                    {data.webhooks.map((h) => (
                      <View key={h.id} style={[styles.hook, { borderColor: colors.border }]}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={{ color: colors.text, flex: 1, fontWeight: "600" }} numberOfLines={1}>{h.url.replace(/^https?:\/\//, "")}</Text>
                          <Switch value={h.active} trackColor={{ true: colors.primary }}
                            onValueChange={(v) => run(() => toggleWebhook(h.id, v), "Couldn't update")} />
                        </View>
                        <Text style={{ color: colors.subText, fontSize: 12 }}>{h.events.join(", ")}</Text>
                        <Text style={{ color: h.failure_count ? colors.danger : colors.subText, fontSize: 12 }}>
                          {h.last_status ? `Last delivery: ${h.last_status}${h.failure_count ? ` · ${h.failure_count} failures` : ""}` : "No deliveries yet"}
                          {!h.active && h.failure_count >= 20 ? " · paused after repeated failures" : ""}
                        </Text>
                        <View style={styles.actions}>
                          <SmallBtn label="Send test" icon="paper-plane-outline" colors={colors}
                            onPress={() => run(async () => {
                              const r = await testWebhook(h.id);
                              Alert.alert(r.ok ? "Test delivered" : "Test failed", r.status);
                            }, "Couldn't test")} />
                          <SmallBtn label="Delete" icon="trash-outline" danger colors={colors}
                            onPress={() => run(() => deleteWebhook(h.id), "Couldn't delete")} />
                        </View>
                      </View>
                    ))}
                    <TextInput value={url} onChangeText={setUrl} placeholder="https://hooks.zapier.com/…" placeholderTextColor={colors.subText}
                      autoCapitalize="none" autoCorrect={false} keyboardType="url" style={input} />
                    {data.event_types.map((e) => {
                      const on = events.includes(e);
                      return (
                        <TouchableOpacity key={e} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                          onPress={() => setEvents(on ? events.filter((x) => x !== e) : [...events, e])}>
                          <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={colors.primary} />
                          <Text style={{ color: colors.text, marginLeft: 8, flex: 1 }}>{EVENT_LABELS[e] ?? e}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    <Btn primary icon="add" label="Add webhook" colors={colors} disabled={!url.startsWith("http") || events.length === 0} onPress={onAddWebhook} />
                  </>
                )}
              </Section>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

function Section({ title, hint, icon, colors, children }: any) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={[Type.heading, { color: colors.text, marginLeft: 8 }]}>{title}</Text>
      </View>
      {!!hint && <Text style={{ color: colors.subText, fontSize: 13, marginTop: 4 }}>{hint}</Text>}
      <View style={{ marginTop: Space.md }}>{children}</View>
    </View>
  );
}

function Btn({ label, icon, onPress, primary, danger, disabled, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={[styles.btn, primary ? { backgroundColor: colors.primary } : { borderWidth: 1, borderColor: colors.border }, { opacity: disabled ? 0.45 : 1 }]}>
      <Ionicons name={icon} size={16} color={primary ? colors.onPrimary : danger ? colors.danger : colors.primary} />
      <Text style={{ marginLeft: 8, fontWeight: "700", color: primary ? colors.onPrimary : danger ? colors.danger : colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

function SmallBtn({ label, icon, onPress, danger, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" style={[styles.small, { borderColor: colors.border }]}>
      <Ionicons name={icon} size={14} color={danger ? colors.danger : colors.primary} />
      <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "600", color: danger ? colors.danger : colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: Space.lg, paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Space.lg },
  back: { width: HIT, height: HIT, justifyContent: "center" },
  section: { borderRadius: Radius.card, padding: Space.lg, marginBottom: Space.md },
  input: { borderWidth: 1, borderRadius: Radius.card, paddingHorizontal: 14, minHeight: HIT, marginTop: Space.sm, fontSize: 15 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: Radius.card, marginTop: Space.md },
  switchRow: { flexDirection: "row", alignItems: "center", marginBottom: Space.sm },
  hook: { borderWidth: 1, borderRadius: Radius.card, padding: Space.md, marginBottom: Space.sm },
  actions: { flexDirection: "row", gap: Space.sm, marginTop: Space.sm },
  small: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 12, minHeight: 32 },
  check: { flexDirection: "row", alignItems: "center", minHeight: 40, marginTop: 4 },
});
