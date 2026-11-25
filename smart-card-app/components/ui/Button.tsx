import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { HIT, Radius } from "../../constants/design";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "md" | "lg";
  icon?: keyof typeof Ionicons.glyphMap;
  /** Custom leading element (e.g. a brand logo); overrides `icon`. */
  left?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** The one button used across the app. Primary = gold, the main action on a screen. */
export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  left,
  loading,
  disabled,
  style,
  accessibilityLabel,
}: Props) {
  const { colors } = useApp();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: "transparent", fg: colors.text, border: colors.border },
    ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
    danger: { bg: "rgba(239,68,68,0.12)", fg: colors.danger, border: "transparent" },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: size === "lg" ? 52 : HIT,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {left ?? (icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null)}
          <Text
            style={[
              styles.label,
              { color: palette.fg, fontSize: size === "lg" ? 16 : 15 },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.card,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontWeight: "700", letterSpacing: 0.2 },
});
