import { SafeAreaView } from "react-native-safe-area-context";
import { ViewStyle } from "react-native";
import { useApp } from "../context/AppContext";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function SafeScreen({ children, style }: Props) {
  const { colors } = useApp(); // ✅ hook INSIDE component

  return (
    <SafeAreaView
    edges={["top", "left", "right"]}
      style={[
        { flex: 1, backgroundColor: colors.bg },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}
