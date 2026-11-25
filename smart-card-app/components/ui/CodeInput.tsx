import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputInstance, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Radius } from "../../constants/design";

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  onComplete?: (v: string) => void;
  error?: boolean;
};

/** One-time-code input: a row of boxes backed by one hidden TextInput (paste and SMS autofill work). */
export default function CodeInput({ value, onChange, length = 6, onComplete, error }: Props) {
  const { colors } = useApp();
  const ref = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Verification code">
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const char = value[i] ?? "";
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.cell,
                {
                  backgroundColor: colors.card,
                  borderColor: error ? colors.danger : active ? colors.primary : char ? colors.text + "33" : colors.border,
                },
              ]}
            >
              <Text style={[styles.char, { color: colors.text }]}>{char}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, "").slice(0, length);
          onChange(digits);
          if (digits.length === length) onComplete?.(digits);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cell: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 0.85,
    borderWidth: 1.5,
    borderRadius: Radius.card,
    alignItems: "center",
    justifyContent: "center",
  },
  char: { fontSize: 24, fontWeight: "700" },
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0 },
});
