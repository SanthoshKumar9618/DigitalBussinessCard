import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { getMyProfile } from "../../services/profileService";
import ProfileView from "../../components/profile/ProfileView";
import Screen1 from "../../components/ui/Screen1";
import { useApp } from "@/components/context/AppContext";

export default function ProfileTab() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useApp();

console.log("PROFILE =", profile);
console.log("SETTINGS =", settings);

  const fetchProfile = async () => {
  try {
    const data = await getMyProfile();

    console.log("PROFILE API RESPONSE =", JSON.stringify(data, null, 2));

    setProfile(data);
  } catch (e) {
    console.log("PROFILE ERROR =", e);
    setProfile(null);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchProfile();
}, []);


  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  // ❗ ProfileSetup NEVER belongs here
  if (!profile) {
    return null; // or loader
  }

  return (
    <Screen1>
      <ProfileView profile={profile} onRefresh={fetchProfile} />
    </Screen1>
  );
}