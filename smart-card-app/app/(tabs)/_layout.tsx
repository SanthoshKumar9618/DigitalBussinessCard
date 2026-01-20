// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../components/context/AppContext";

export default function TabsLayout() {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
  backBehavior="none"
  screenOptions={{
    headerShown: false,

    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.subText,

    tabBarStyle: {
      backgroundColor: colors.card,

      // 🔹 Unique visual identity
      borderTopWidth: 0,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,

      height: 64 + insets.bottom,
      paddingBottom: insets.bottom + 6,
      paddingTop: 8,

      // 🔹 Shadow (iOS)
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,

      // 🔹 Elevation (Android)
      elevation: 20,
    },

    tabBarItemStyle: {
      borderRadius: 14,
      marginHorizontal: 6,
    },

    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: "500",
      marginTop: 2,
    },
  }}
>

      <Tabs.Screen
        name="network"
        options={{
          title: "Network",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tap"
        options={{
          title: "Tap",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
