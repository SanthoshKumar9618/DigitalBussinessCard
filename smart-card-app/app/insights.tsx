import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useRouter } from "expo-router";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import CardSwitcher from "@/components/cards/CardSwitcher";
import { useCards } from "@/context/CardContext";
import { getInsights, InsightsSummary } from "@/services/leadService";
import { HIT, Radius, Space, Type } from "@/constants/design";

const RANGES = [7, 30] as const;
const SOURCE_LABELS: Record<string, string> = {
  qr: "QR code",
  nfc: "NFC tap",
  link: "Link",
  app: "In app",
  email: "Email signature",
  wallet: "Wallet pass",
};

export default function InsightsScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const { cardVersion, cards } = useCards();
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const [data, setData] = useState<InsightsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (range: number) => {
    setError(null);
    try {
      setData(await getInsights(range));
    } catch (e: any) {
      setError(
        e?.response?.status === 404
          ? "Create your profile first to start collecting insights."
          : "Couldn't load insights. Pull down to retry."
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(days);
    }, [load, days, cardVersion])
  );

  const stats = data
    ? [
        { label: "Views", value: data.views, icon: "eye-outline" },
        { label: "Saved to phone", value: data.vcard_saves, icon: "download-outline" },
        { label: "Leads", value: data.leads, icon: "swap-horizontal-outline" },
        { label: "Saved in app", value: data.connections, icon: "people-outline" },
      ]
    : [];

  const max = Math.max(1, ...(data?.daily.map((d) => d.views) ?? [0]));
  const totalSources = Object.values(data?.sources ?? {}).reduce((a, b) => a + b, 0);

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(days); }} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Type.title, { color: colors.text, flex: 1 }]}>Insights</Text>
          <View style={[styles.range, { backgroundColor: colors.card }]}>
            {RANGES.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setDays(r)}
                style={[styles.rangeBtn, days === r && { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityState={{ selected: days === r }}
                accessibilityLabel={`Last ${r} days`}
              >
                <Text style={{ color: days === r ? colors.onPrimary : colors.text, fontWeight: "600", fontSize: 13 }}>{r}d</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {cards.length > 1 && (
          <View style={{ marginBottom: Space.lg }}>
            <CardSwitcher />
          </View>
        )}

        {!data && !error && <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />}

        {error && (
          <View style={[styles.panel, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.subText, textAlign: "center" }}>{error}</Text>
          </View>
        )}

        {data && (
          <>
            <View style={styles.grid}>
              {stats.map((s) => (
                <View key={s.label} style={[styles.stat, { backgroundColor: colors.card }]} accessible accessibilityLabel={`${s.value} ${s.label}`}>
                  <Ionicons name={s.icon as any} size={18} color={colors.primary} />
                  <Text style={[Type.display, { color: colors.text, marginTop: Space.sm }]}>{s.value}</Text>
                  <Text style={[Type.caption, { color: colors.subText }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {data.unread_leads > 0 && (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/network")}
                style={[styles.banner, { backgroundColor: colors.primarySoft }]}
              >
                <Ionicons name="mail-unread-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.text, marginLeft: Space.sm, flex: 1 }}>
                  {data.unread_leads} new lead{data.unread_leads > 1 ? "s" : ""} waiting
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.subText} />
              </TouchableOpacity>
            )}

            <View style={[styles.panel, { backgroundColor: colors.card }]}>
              <Text style={[Type.heading, { color: colors.text }]}>Views · last 14 days</Text>
              <View style={styles.chart} accessible accessibilityLabel={`Daily views: ${data.daily.map((d) => d.views).join(", ")}`}>
                {data.daily.map((d) => (
                  <View key={d.date} style={styles.barWrap}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(4, (d.views / max) * 100)}%`,
                          backgroundColor: d.views ? colors.primary : colors.border,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.chartAxis}>
                <Text style={[Type.caption, { color: colors.subText }]}>{shortDate(data.daily[0]?.date)}</Text>
                <Text style={[Type.caption, { color: colors.subText }]}>Today</Text>
              </View>
            </View>

            <View style={[styles.panel, { backgroundColor: colors.card }]}>
              <Text style={[Type.heading, { color: colors.text, marginBottom: Space.md }]}>Where views came from</Text>
              {totalSources === 0 ? (
                <Text style={{ color: colors.subText }}>No views yet in this period. Share your card to get started.</Text>
              ) : (
                Object.entries(data.sources)
                  .sort((a, b) => b[1] - a[1])
                  .map(([src, n]) => {
                    const pct = Math.round((n / totalSources) * 100);
                    return (
                      <View key={src} style={{ marginBottom: Space.md }}>
                        <View style={styles.sourceRow}>
                          <Text style={{ color: colors.text }}>{SOURCE_LABELS[src] ?? src}</Text>
                          <Text style={{ color: colors.subText }}>{pct}% · {n}</Text>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.border }]}>
                          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                        </View>
                      </View>
                    );
                  })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

function shortDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  container: { padding: Space.lg, paddingBottom: 64 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Space.lg },
  back: { width: HIT, height: HIT, justifyContent: "center", marginLeft: -Space.sm, paddingLeft: Space.sm },
  range: { flexDirection: "row", borderRadius: Radius.pill, padding: 3 },
  rangeBtn: { paddingHorizontal: 14, minHeight: 32, justifyContent: "center", borderRadius: Radius.pill },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  stat: { width: "48.5%", borderRadius: Radius.card, padding: Space.lg, marginBottom: Space.md },
  banner: { flexDirection: "row", alignItems: "center", borderRadius: Radius.card, padding: 14, marginBottom: Space.md },
  panel: { borderRadius: Radius.card, padding: Space.lg, marginBottom: Space.md },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 120, marginTop: Space.lg },
  barWrap: { flex: 1, height: "100%", justifyContent: "flex-end", paddingHorizontal: 2 },
  bar: { borderRadius: 4, width: "100%" },
  chartAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: Space.sm },
  sourceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
});
