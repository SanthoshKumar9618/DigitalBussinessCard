import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { getMyProfile } from "../../services/profileService";
import ProfileView from "../../components/profile/ProfileView";
import Screen1 from "../../components/ui/Screen1";
import { useCards } from "@/context/CardContext";

export default function ProfileTab() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { cardVersion, cards, refreshCards } = useCards();

  const fetchProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
      // First card was just created (onboarding): load the card list.
      if (data?.id && cards.length === 0) refreshCards();
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [cards.length, refreshCards]);

  // Reload whenever the active card changes.
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardVersion]);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  if (!profile) {
    return null;
  }

  return (
    <Screen1>
      <ProfileView key={profile.id} profile={profile} onRefresh={fetchProfile} />
    </Screen1>
  );
}
