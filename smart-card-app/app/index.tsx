import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ProfileSetup from "@/app/profile/ProfileSetup";

export default function Index() {
  const { token, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }

    const checkProfile = async () => {
      try {
        await api.get("/profile/me");
        setHasProfile(true); // ✅ Existing user
      } catch (err: any) {
        if (err.response?.status === 404) {
          setHasProfile(false); // ✅ New user
        } else {
          console.error(err);
        }
      } finally {
        setChecking(false);
      }
    };

    checkProfile();
  }, [token]);

  

  if (loading || checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  // 🔒 FIRST TIME ONLY
  if (!hasProfile) {
  return <ProfileSetup />;
}


  // ✅ EXISTING USER
  return <Redirect href="/(tabs)/network" />;
}
