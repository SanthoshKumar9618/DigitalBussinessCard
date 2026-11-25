/**
 * Shared building blocks for app screens. Everything reads colours from the
 * theme (useApp) and sizes from constants/design, so screens stay consistent
 * in dark and light mode.
 */
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "../context/AppContext";
import { HIT, Radius, Space, Type } from "../../constants/design";
import Button from "./Button";

type IconName = keyof typeof Ionicons.glyphMap;

/* ---------------- Header ---------------- */

type HeaderProps = {
  title: string;
  subtitle?: string;
  /** true = router.back(); a function = custom back. */
  back?: boolean | (() => void);
  right?: ReactNode;
  /** Large title for tab roots; compact for pushed screens. */
  large?: boolean;
};

export function ScreenHeader({ title, subtitle, back, right, large }: HeaderProps) {
  const { colors } = useApp();
  const router = useRouter();
  const onBack = typeof back === "function" ? back : back ? () => router.back() : undefined;

  return (
    <View style={styles.header}>
      {onBack ? <IconButton icon="chevron-back" label="Back" onPress={onBack} filled /> : null}
      <View style={{ flex: 1, marginLeft: onBack ? Space.md : 0 }}>
        <Text
          style={[large ? Type.display : styles.compactTitle, { color: colors.text }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSub, { color: colors.subText }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

/* ---------------- IconButton ---------------- */

export function IconButton({
  icon,
  label,
  onPress,
  filled,
  color,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Round surface behind the icon (back buttons, floating actions). */
  filled?: boolean;
  color?: string;
  /** Small gold dot (e.g. unread). */
  badge?: boolean;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconBtn,
        filled && { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={icon} size={filled ? 20 : 22} color={color ?? colors.text} />
      {badge ? <View style={[styles.badgeDot, { backgroundColor: colors.primary, borderColor: colors.bg }]} /> : null}
    </Pressable>
  );
}

/* ---------------- Surface / Section ---------------- */

/** A card surface with a hairline border (needed in light mode, subtle in dark). */
export function Surface({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useApp();
  const base = [styles.surface, { backgroundColor: colors.card, borderColor: colors.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

/** Small uppercase label above a group of rows. */
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useApp();
  return <Text style={[Type.label, styles.sectionLabel, { color: colors.subText }, style]}>{children}</Text>;
}

/* ---------------- ListRow ---------------- */

/** Settings-style row: icon tile, title, optional subtitle, trailing element or chevron. */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  danger,
  last,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  /** Hide the divider under the last row of a group. */
  last?: boolean;
}) {
  const { colors } = useApp();
  const tint = danger ? colors.danger : colors.primary;
  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: danger ? "rgba(239,68,68,0.12)" : colors.primarySoft }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: danger ? colors.danger : colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: colors.subText }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.subText} /> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {content}
    </Pressable>
  );
}

/* ---------------- Avatar ---------------- */

export function initials(name?: string | null) {
  return (
    (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function Avatar({ uri, name, size = 46 }: { uri?: string | null; name?: string | null; size?: number }) {
  const { colors } = useApp();
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[box, { backgroundColor: colors.card }]} />;
  return (
    <View style={[box, styles.center, { backgroundColor: colors.primarySoft }]}>
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

/* ---------------- Chip ---------------- */

export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const { colors } = useApp();
  const fg = active ? colors.onPrimary : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.onPrimary : colors.primary} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/* ---------------- Segmented control ---------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; dot?: boolean }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useApp();
  return (
    <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segmentBtn, active && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.segmentText, { color: active ? colors.onPrimary : colors.subText }]}>{o.label}</Text>
            {o.dot ? (
              <View style={[styles.segmentDot, { backgroundColor: active ? colors.onPrimary : colors.primary }]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- Option sheet ---------------- */

/** Bottom sheet with a list of choices; the selected one gets a check mark. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string; icon?: IconName; description?: string }[];
  value?: T | null;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  const { colors } = useApp();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Text style={[Type.heading, { color: colors.text, fontSize: 18, marginBottom: Space.sm }]}>{title}</Text>
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <ListRow
                key={o.value}
                icon={o.icon}
                title={o.label}
                subtitle={o.description}
                last={i === options.length - 1}
                onPress={() => {
                  onSelect(o.value);
                  onClose();
                }}
                right={
                  selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : (
                    <View style={[styles.radio, { borderColor: colors.border }]} />
                  )
                }
              />
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------------- States ---------------- */

export function EmptyState({
  icon,
  title,
  body,
  cta,
  onCta,
}: {
  icon: IconName;
  title: string;
  body?: string;
  cta?: string;
  onCta?: () => void;
}) {
  const { colors } = useApp();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[Type.heading, styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.emptyBody, { color: colors.subText }]}>{body}</Text> : null}
      {cta && onCta ? <Button title={cta} onPress={onCta} size="md" style={{ marginTop: Space.xl, minWidth: 180 }} /> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const { colors } = useApp();
  return (
    <View style={[styles.center, { flex: 1, padding: Space.xxl }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={{ color: colors.subText, marginTop: Space.md }}>{label}</Text> : null}
    </View>
  );
}

/** Small coloured label, e.g. a card name or a source. */
export function Badge({ label, tone = "gold" }: { label: string; tone?: "gold" | "muted" | "success" | "danger" }) {
  const { colors } = useApp();
  const map = {
    gold: { fg: colors.primary, bg: colors.primarySoft },
    muted: { fg: colors.subText, bg: colors.elevated },
    success: { fg: colors.success, bg: "rgba(34,197,94,0.12)" },
    danger: { fg: colors.danger, bg: "rgba(239,68,68,0.12)" },
  }[tone];
  return <Text style={[styles.badge, { color: map.fg, backgroundColor: map.bg }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: Space.lg, minHeight: HIT },
  compactTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 14, marginTop: 2, lineHeight: 19 },
  headerRight: { flexDirection: "row", alignItems: "center", marginLeft: Space.sm },

  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  badgeDot: { position: "absolute", top: 7, right: 7, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },

  surface: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Space.lg },
  sectionLabel: { marginTop: Space.xl, marginBottom: Space.sm, marginLeft: 4 },

  row: { flexDirection: "row", alignItems: "center", minHeight: 56, paddingVertical: 10, gap: Space.md },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 13, marginTop: 2, lineHeight: 18 },

  center: { alignItems: "center", justifyContent: "center" },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Space.md,
    minHeight: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },

  segment: { flexDirection: "row", borderRadius: Radius.card, padding: 4, borderWidth: StyleSheet.hairlineWidth },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    borderRadius: Radius.card - 4,
  },
  segmentText: { fontSize: 14, fontWeight: "700" },
  segmentDot: { width: 7, height: 7, borderRadius: 4, marginLeft: 6 },

  empty: { alignItems: "center", paddingHorizontal: Space.xl, marginTop: 56 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: Space.lg },
  emptyTitle: { marginBottom: 6, textAlign: "center" },
  emptyBody: { fontSize: 15, textAlign: "center", lineHeight: 21, maxWidth: 320 },

  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,16,10,0.45)" },
  sheet: {
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.xxl,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: Space.lg },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },

  badge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.chip,
    overflow: "hidden",
    letterSpacing: 0.3,
  },
});
