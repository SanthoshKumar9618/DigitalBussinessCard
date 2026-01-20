import { Stack } from "expo-router";
import { View } from "react-native";
import { AuthProvider } from "../context/AuthContext";
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

export default function RootLayout() {
  return (
    <AuthProvider>
      <RefreshProvider>
        <AppProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedBackground>
              <Stack screenOptions={{ headerShown: false }} />
            </ThemedBackground>
          </GestureHandlerRootView>
        </AppProvider>
      </RefreshProvider>
    </AuthProvider>
  );
}
