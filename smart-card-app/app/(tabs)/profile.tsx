import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { getMyProfile } from "../../services/profileService";
import ProfileView from "../../components/profile/ProfileView";
import Screen1 from "../../components/ui/Screen1";

export default function ProfileTab() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
  try {
    const data = await getMyProfile();
    setProfile(data);
  } catch {
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
