import { forwardRef, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputInstance,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { Radius } from "../../constants/design";

type Props = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  hint?: string;
  /** Adds a show/hide toggle and hides the text by default. */
  password?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Labelled input with icon, focus ring, error text and an optional password toggle. */
const TextField = forwardRef<TextInputInstance, Props>(function TextField(
  { label, icon, error, hint, password, containerStyle, style, onFocus, onBlur, multiline, ...rest },
  ref
) {
  const { colors } = useApp();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.subText }]}>{label}</Text> : null}

      <View
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          { backgroundColor: colors.card, borderColor },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.subText}
            style={multiline ? styles.iconTop : undefined}
          />
        ) : null}

        <TextInput
          ref={ref}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          secureTextEntry={password ? hidden : rest.secureTextEntry}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: colors.text },
            style,
          ]}
          {...rest}
        />

        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.subText} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.help, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.help, { color: colors.subText }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginLeft: 2 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: 14,
  },
  boxMultiline: { alignItems: "flex-start", paddingVertical: 12 },
  iconTop: { marginTop: 2 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  inputMultiline: { minHeight: 80, paddingVertical: 0, textAlignVertical: "top" },
  help: { fontSize: 12, marginTop: 6, marginLeft: 2 },
});
