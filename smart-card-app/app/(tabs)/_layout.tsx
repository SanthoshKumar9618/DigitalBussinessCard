import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../components/context/AppContext";

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; active: IconName }[] = [
  { name: "network", title: "Network", icon: "people-outline", active: "people" },
  { name: "tap", title: "Tap", icon: "radio-outline", active: "radio" },
  { name: "scan", title: "Scan", icon: "qr-code-outline", active: "qr-code" },
  { name: "profile", title: "Profile", icon: "person-circle-outline", active: "person-circle" },
  { name: "settings", title: "Settings", icon: "settings-outline", active: "settings" },
];

export default function TabsLayout() {
  const { colors, theme } = useApp();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return (
    <Tabs
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subText,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: 68 + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: theme === "dark" ? 0.3 : 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: "600", marginTop: 4 },
        tabBarIconStyle: { height: 28 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={focused ? t.active : t.icon} size={22} color={String(color)} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 48, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
