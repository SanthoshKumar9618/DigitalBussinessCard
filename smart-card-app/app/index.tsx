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

    setChecking(true);
    const checkProfile = async () => {
      try {
        // /profile/me returns 200 with id: null when the user has no card yet
        const res = await api.get("/profile/me");
        setHasProfile(!!res.data?.id);
      } catch (err: any) {
        // 401: the API client signs out and this screen redirects to login.
        // Anything else (offline, server down): let the tabs show their own errors.
        setHasProfile(err.response?.status === 401 ? null : true);
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
