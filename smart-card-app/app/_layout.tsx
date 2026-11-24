import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { listenForReminderTaps } from "../services/reminderNotifications";
import { View } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import { CardProvider } from "../context/CardContext";
import { AppProvider, useApp } from "../components/context/AppContext";
import { RefreshProvider } from "@/components/context/RefreshContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
//rimport { GoogleSignin } from "@react-native-google-signin/google-signin";

// GoogleSignin.configure({
//   webClientId: "WEB_CLIENT_ID.apps.googleusercontent.com",
//   iosClientId: "IOS_CLIENT_ID.apps.googleusercontent.com",
//   scopes: ["profile", "email"],
// });


function ThemedBackground({ children }: { children: React.ReactNode }) {
  const { colors } = useApp();
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>;
}

function ReminderTapHandler() {
  const router = useRouter();
  useEffect(() => listenForReminderTaps((path) => router.push(path as any)), [router]);
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CardProvider>
      <RefreshProvider>
        <AppProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedBackground>
              <Stack screenOptions={{ headerShown: false }} />
              <ReminderTapHandler />
            </ThemedBackground>
          </GestureHandlerRootView>
        </AppProvider>
      </RefreshProvider>
      </CardProvider>
    </AuthProvider>
  );
}
