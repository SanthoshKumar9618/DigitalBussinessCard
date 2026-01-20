import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

export default function ScreenBackground({ children }: any) {
  return (
    
    <LinearGradient
      colors={["#0A0A0A", "#111111", "#0A0A0A"]}
      style={styles.container}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
