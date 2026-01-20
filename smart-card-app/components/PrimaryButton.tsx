import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";

export default function PrimaryButton({ title, onPress }: any) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.accent,
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  text: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
});
