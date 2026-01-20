import { useApp } from "../context/AppContext";

export function useTheme() {
  const { colors } = useApp();

  return {
    colors,
    text: { color: colors.text },
    subText: { color: colors.subText },
    card: { backgroundColor: colors.card },
    border: { borderColor: colors.border },
    primaryBg: { backgroundColor: colors.primary },
    primaryText: { color: colors.primary },
  };
}
