import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { Radius, Space, Type } from "../../constants/design";

type Props = {
  title: string;
  subtitle?: string;
  /** Shows a back arrow (top left). */
  onBack?: () => void;
  /** Big icon instead of the logo, e.g. a mail icon on the OTP screen. */
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  /** Links under the form ("New here? Create an account"). */
  footer?: ReactNode;
};

/** Shared frame for every sign-in screen: brand mark, title, form, footer. */
export default function AuthLayout({ title, subtitle, onBack, icon, children, footer }: Props) {
  const { colors } = useApp();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.primarySoft, "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.column}>
              <View style={styles.brand}>
                <View style={[styles.mark, { backgroundColor: colors.primary }]}>
                  <Ionicons name={icon ?? "card"} size={26} color={colors.onPrimary} />
                </View>
                {!icon ? (
                  <Text style={[styles.wordmark, { color: colors.text }]}>
                    Smart<Text style={{ color: colors.primary }}>Card</Text>
                  </Text>
                ) : null}
              </View>

              <Text style={[Type.display, styles.title, { color: colors.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.subText }]}>{subtitle}</Text>
              ) : null}

              <View style={styles.form}>{children}</View>

              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** "OR" divider between social and email sign-in. */
export function AuthDivider({ label }: { label: string }) {
  const { colors } = useApp();
  return (
    <View style={styles.divider}>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Text style={[Type.label, { color: colors.subText }]}>{label}</Text>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
  );
}

/** "New here? Create an account" style line. */
export function AuthLink({ text, action, onPress }: { text?: string; action: string; onPress: () => void }) {
  const { colors } = useApp();
  return (
    <Text style={[styles.linkLine, { color: colors.subText }]}>
      {text ? `${text} ` : ""}
      <Text
        onPress={onPress}
        style={{ color: colors.primary, fontWeight: "700" }}
        accessibilityRole="link"
        suppressHighlighting
      >
        {action}
      </Text>
    </Text>
  );
}

/** Inline error banner above the submit button. */
export function FormError({ message }: { message?: string | null }) {
  const { colors } = useApp();
  if (!message) return null;
  return (
    <View style={[styles.error, { borderColor: colors.danger }]} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={[styles.errorText, { color: colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    position: "absolute",
    top: Space.sm,
    left: Space.lg,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexGrow: 1, justifyContent: "center", padding: Space.xl, paddingTop: 64 },
  column: { width: "100%", maxWidth: 440, alignSelf: "center" },
  brand: { alignItems: "center", marginBottom: Space.xl, gap: Space.md },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: { fontSize: 20, fontWeight: "800", letterSpacing: 0.3 },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", fontSize: 15, marginTop: 6, lineHeight: 21 },
  form: { marginTop: Space.xl },
  footer: { marginTop: Space.xl, gap: Space.md, alignItems: "center" },
  divider: { flexDirection: "row", alignItems: "center", gap: Space.md, marginVertical: Space.lg },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  linkLine: { fontSize: 14, textAlign: "center" },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Space.md,
    marginBottom: Space.md,
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  errorText: { flex: 1, fontSize: 14, fontWeight: "500" },
});
