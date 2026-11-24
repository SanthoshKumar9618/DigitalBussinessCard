import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import { HIT, Radius, Space, Type } from "@/constants/design";
import { exportCsvFrom } from "@/services/leadService";
import { apiError } from "@/services/shareKitService";
import {
  acceptInvite, createTeam, DashboardRow, deleteTeam, getDashboard, getMyTeam, inviteMember,
  leaveTeam, Member, MyTeam, removeMember, setRole, updateTeam,
} from "@/services/teamService";

export default function TeamScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const [data, setData] = useState<MyTeam | null>(null);
  const [stats, setStats] = useState<DashboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [brand, setBrand] = useState({ brand_company: "", brand_color: "", brand_logo_url: "" });

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await getMyTeam();
      setData(d);
      if (d.team) {
        setBrand({
          brand_company: d.team.brand_company ?? "",
          brand_color: d.team.brand_color ?? "",
          brand_logo_url: d.team.brand_logo_url ?? "",
        });
        if (d.my_role !== "member") {
          getDashboard(30).then((r) => setStats(r.members)).catch(() => setStats(null));
        }
      }
    } catch {
      setError("Couldn't load your team. Check your connection.");
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

  const input = [styles.input, { backgroundColor: colors.elevated, color: colors.text, borderColor: colors.border }];
  const isAdmin = !!data?.team && data.my_role !== "member";

  const confirmRemove = (m: Member) =>
    Alert.alert(m.status === "invited" ? "Cancel invite?" : `Remove ${m.name || m.email}?`, m.email, [
      { text: "Keep", style: "cancel" },
      { text: m.status === "invited" ? "Cancel invite" : "Remove", style: "destructive", onPress: () => run(() => removeMember(m.id), "Couldn't remove") },
    ]);

  const sendInvite = () =>
    run(async () => {
      const r = await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      Alert.alert("Invite sent", `We emailed ${r.email}. You can also share the invite link.`, [
        { text: "Done" },
        { text: "Share link", onPress: () => Share.share({ message: `Join our team on SmartCard: ${r.link}` }) },
      ]);
    }, "Couldn't invite");

  return (
    <SafeScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[Type.title, { color: colors.text, flex: 1 }]}>{data?.team ? data.team.name : "Team"}</Text>
            {busy && <ActivityIndicator color={colors.primary} />}
          </View>

          {!data && !error && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}
          {error && <Text style={{ color: colors.subText, textAlign: "center", marginTop: 32 }}>{error}</Text>}

          {/* ---------- NO TEAM ---------- */}
          {data && !data.team && (
            <>
              {data.invites.map((i) => (
                <Section key={i.id} colors={colors} title={`You're invited to ${i.team_name}`} hint={`Join as ${i.role}. Your card gets the team's branding.`}>
                  <Btn primary label="Accept invite" icon="checkmark" colors={colors} onPress={() => run(() => acceptInvite(i.id), "Couldn't join")} />
                </Section>
              ))}
              <Section colors={colors} title="Create a team" hint="Give your company one place for everyone's cards: shared branding, a leaderboard and every lead in one export.">
                {data.can_create ? (
                  <>
                    <TextInput value={teamName} onChangeText={setTeamName} placeholder="Company or team name" placeholderTextColor={colors.subText} style={input} maxLength={120} />
                    <Btn primary label="Create team" icon="people" colors={colors} disabled={teamName.trim().length < 2}
                      onPress={() => run(() => createTeam(teamName.trim()), "Couldn't create team")} />
                  </>
                ) : (
                  <Text style={{ color: colors.subText }}>Teams are part of the Team plan.</Text>
                )}
              </Section>
            </>
          )}

          {/* ---------- IN A TEAM ---------- */}
          {data?.team && (
            <>
              {isAdmin && stats && stats.length > 0 && (
                <Section colors={colors} title="Last 30 days" hint="Who's getting the most from their card.">
                  {stats.map((s, i) => (
                    <View key={s.id} style={[styles.row, { borderColor: colors.border }]}>
                      <Text style={{ color: colors.subText, width: 22 }}>{i + 1}</Text>
                      <Text style={{ color: colors.text, flex: 1, fontWeight: "600" }} numberOfLines={1}>{s.name || s.email}</Text>
                      <Stat n={s.views} label="views" colors={colors} />
                      <Stat n={s.leads} label="leads" colors={colors} />
                    </View>
                  ))}
                  <Btn label="Export all team leads (CSV)" icon="download-outline" colors={colors}
                    onPress={() => exportCsvFrom("/teams/me/leads/export.csv", "team-leads").catch(() => Alert.alert("Export failed"))} />
                </Section>
              )}

              <Section colors={colors} title={`Members · ${data.seats.used}/${data.seats.max} seats`}>
                {data.members.map((m) => (
                  <View key={m.id} style={[styles.row, { borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "600" }} numberOfLines={1}>{m.name || m.email}</Text>
                      <Text style={{ color: colors.subText, fontSize: 12 }} numberOfLines={1}>
                        {m.status === "invited" ? `Invited · ${m.email}` : [m.job_title, m.email].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.primarySoft }]}>{m.role.toUpperCase()}</Text>
                    {data.my_role === "owner" && m.role !== "owner" && m.status === "active" && (
                      <TouchableOpacity onPress={() => run(() => setRole(m.id, m.role === "admin" ? "member" : "admin"), "Couldn't change role")}
                        style={styles.icon} accessibilityLabel={m.role === "admin" ? "Make member" : "Make admin"}>
                        <Ionicons name={m.role === "admin" ? "arrow-down-circle-outline" : "arrow-up-circle-outline"} size={20} color={colors.subText} />
                      </TouchableOpacity>
                    )}
                    {isAdmin && m.role !== "owner" && (data.my_role === "owner" || m.role !== "admin") && (
                      <TouchableOpacity onPress={() => confirmRemove(m)} style={styles.icon} accessibilityLabel={`Remove ${m.email}`}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {isAdmin && (
                  <>
                    <TextInput value={inviteEmail} onChangeText={setInviteEmail} placeholder="colleague@company.com"
                      placeholderTextColor={colors.subText} autoCapitalize="none" keyboardType="email-address" style={input} />
                    <View style={styles.chips}>
                      {(["member", "admin"] as const).map((r) => (
                        <TouchableOpacity key={r} onPress={() => setInviteRole(r)}
                          style={[styles.chip, { backgroundColor: inviteRole === r ? colors.primary : colors.bg }]}>
                          <Text style={{ color: inviteRole === r ? colors.onPrimary : colors.text, fontWeight: "600", fontSize: 13, textTransform: "capitalize" }}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Btn primary label="Send invite" icon="mail-outline" colors={colors} disabled={!inviteEmail.includes("@")} onPress={sendInvite} />
                  </>
                )}
              </Section>

              {isAdmin && (
                <Section colors={colors} title="Team branding" hint="Shown on every member's card: your logo, accent colour, and company name when a card has none.">
                  <TextInput value={brand.brand_company} onChangeText={(v) => setBrand({ ...brand, brand_company: v })}
                    placeholder="Company name" placeholderTextColor={colors.subText} style={input} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Space.sm }}>
                    <TextInput value={brand.brand_color} onChangeText={(v) => setBrand({ ...brand, brand_color: v })}
                      placeholder="#1E40AF" placeholderTextColor={colors.subText} autoCapitalize="characters" maxLength={7}
                      style={[input, { flex: 1 }]} />
                    <View style={[styles.swatch, { backgroundColor: /^#[0-9a-fA-F]{6}$/.test(brand.brand_color) ? brand.brand_color : colors.border }]} />
                  </View>
                  <TextInput value={brand.brand_logo_url} onChangeText={(v) => setBrand({ ...brand, brand_logo_url: v })}
                    placeholder="https://… logo URL" placeholderTextColor={colors.subText} autoCapitalize="none" keyboardType="url" style={input} />
                  <Btn primary label="Save branding" icon="color-palette-outline" colors={colors}
                    onPress={() => run(() => updateTeam(brand), "Couldn't save branding")} />
                </Section>
              )}

              <Btn
                label={data.my_role === "owner" ? "Delete team" : "Leave team"}
                icon="exit-outline"
                danger
                colors={colors}
                onPress={() =>
                  Alert.alert(
                    data.my_role === "owner" ? "Delete this team?" : "Leave this team?",
                    data.my_role === "owner"
                      ? "Everyone is removed and team branding disappears from their cards. Their own cards, contacts and leads are kept."
                      : "Team branding is removed from your card. Your card, contacts and leads stay yours.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: data.my_role === "owner" ? "Delete" : "Leave",
                        style: "destructive",
                        onPress: () => run(() => (data.my_role === "owner" ? deleteTeam() : leaveTeam()), "Couldn't update team"),
                      },
                    ]
                  )
                }
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

function Section({ title, hint, colors, children }: any) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[Type.heading, { color: colors.text }]}>{title}</Text>
      {!!hint && <Text style={{ color: colors.subText, fontSize: 13, marginTop: 4 }}>{hint}</Text>}
      <View style={{ marginTop: Space.md }}>{children}</View>
    </View>
  );
}

function Btn({ label, icon, onPress, primary, danger, disabled, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={[styles.btn, primary ? { backgroundColor: colors.primary } : { borderWidth: 1, borderColor: colors.border }, { opacity: disabled ? 0.45 : 1 }]}>
      {icon && <Ionicons name={icon} size={16} color={primary ? colors.onPrimary : danger ? colors.danger : colors.primary} />}
      <Text style={{ marginLeft: 8, fontWeight: "700", color: primary ? colors.onPrimary : danger ? colors.danger : colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({ n, label, colors }: any) {
  return (
    <View style={{ alignItems: "flex-end", width: 56 }}>
      <Text style={{ color: colors.text, fontWeight: "700" }}>{n}</Text>
      <Text style={{ color: colors.subText, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Space.lg, paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Space.lg },
  back: { width: HIT, height: HIT, justifyContent: "center" },
  section: { borderRadius: Radius.card, padding: Space.lg, marginBottom: Space.md },
  input: { borderWidth: 1, borderRadius: Radius.card, paddingHorizontal: 14, minHeight: HIT, marginTop: Space.sm, fontSize: 15 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: Radius.card, marginTop: Space.md },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6 },
  badge: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.chip, overflow: "hidden" },
  icon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", gap: Space.sm, marginTop: Space.sm },
  chip: { paddingHorizontal: 14, minHeight: 34, justifyContent: "center", borderRadius: Radius.pill },
  swatch: { width: 40, height: 40, borderRadius: 20, marginTop: Space.sm },
});
