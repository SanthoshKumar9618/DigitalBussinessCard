import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useApp } from "@/components/context/AppContext";
import { useCards } from "@/context/CardContext";
import { assetUrl } from "@/services/api";
import { HIT, Radius, Space, Type } from "@/constants/design";

/** Pill showing the active card; tap to switch cards or manage them. */
export default function CardSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { colors } = useApp();
  const { cards, activeCard, setActiveCard, refreshCards } = useCards();
  const [open, setOpen] = useState(false);

  const openSheet = () => {
    setOpen(true);
    refreshCards();
  };

  const label = activeCard?.label ?? "My card";

  return (
    <>
      <TouchableOpacity
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`Current card: ${label}. Switch card`}
        style={[styles.pill, compact && styles.pillCompact, { backgroundColor: colors.primarySoft }]}
      >
        <Ionicons name="albums-outline" size={14} color={colors.primary} />
        <Text style={[styles.pillText, { color: colors.text }]} numberOfLines={1}>{label}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.subText} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Text style={[Type.heading, { color: colors.text, marginBottom: Space.md }]}>Your cards</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {cards.map((c) => {
              const active = c.id === activeCard?.id;
              const avatar = assetUrl(c.avatar_url);
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={async () => {
                    await setActiveCard(c.id);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[styles.row, { borderColor: active ? colors.primary : colors.border }]}
                >
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
                      <Text style={{ color: colors.primary, fontWeight: "700" }}>{c.label[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>{c.label}</Text>
                      {c.is_primary && (
                        <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.primarySoft }]}>PRIMARY</Text>
                      )}
                    </View>
                    <Text style={{ color: colors.subText, fontSize: 13 }} numberOfLines={1}>
                      {[c.job_title, c.company].filter(Boolean).join(" · ") || c.display_name}
                    </Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            onPress={() => {
              setOpen(false);
              router.push("/cards");
            }}
            style={[styles.manage, { borderColor: colors.border }]}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: "600", marginLeft: 8 }}>New card · Manage cards</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 6, paddingHorizontal: 14, minHeight: 36, borderRadius: Radius.pill, maxWidth: 220 },
  pillCompact: { alignSelf: "auto", minHeight: 32, paddingHorizontal: 10 },
  pillText: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet, padding: Space.lg, paddingBottom: Space.xxl },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: Space.md },
  row: { flexDirection: "row", alignItems: "center", gap: Space.md, padding: Space.md, borderRadius: Radius.card, borderWidth: 1.5, marginBottom: Space.sm, minHeight: HIT },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  badge: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.chip, marginLeft: 8, overflow: "hidden" },
  manage: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: HIT, borderRadius: Radius.card, borderWidth: 1, marginTop: Space.sm },
});
