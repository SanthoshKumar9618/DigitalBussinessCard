import { View, Text, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      router.replace("/onboarding");
    }, 2500);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, { transform: [{ scale }] }]} />
      <Text style={styles.text}>Tap. Share. Connect.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  text: {
    color: Colors.textSecondary,
    marginTop: 20,
  },
});
