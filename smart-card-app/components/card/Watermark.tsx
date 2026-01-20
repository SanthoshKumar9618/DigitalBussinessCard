import { Text } from "react-native";

export default function Watermark() {
  return (
    <Text
      style={{
        position: "absolute",
        bottom: 6,
        right: 8,
        fontSize: 10,
        opacity: 0.4,
      }}
    >
      Powered by YourApp
    </Text>
  );
}
