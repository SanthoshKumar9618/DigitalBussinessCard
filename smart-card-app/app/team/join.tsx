import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import SafeScreen from "@/components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";
import { joinWithToken } from "@/services/teamService";
import { apiError } from "@/services/shareKitService";

/** Deep link target: smartcard://team/join?token=… */
export default function JoinTeamScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage("This invite link is incomplete.");
      return;
    }
    joinWithToken(String(token))
      .then(() => router.replace("/team"))
      .catch((e) => setMessage(apiError(e, "Couldn't join the team.")));
  }, [token, router]);

  return (
    <SafeScreen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {!message ? (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.subText, marginTop: 12 }}>Joining team…</Text>
          </>
        ) : (
          <>
            <Text style={{ color: colors.text, fontSize: 16, textAlign: "center" }}>{message}</Text>
            <Text style={{ color: colors.subText, marginTop: 8, textAlign: "center" }}>
              Make sure you are signed in with the email address the invite was sent to.
            </Text>
            <TouchableOpacity onPress={() => router.replace("/team")} style={{ marginTop: 20 }}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Go to Team</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeScreen>
  );
}
