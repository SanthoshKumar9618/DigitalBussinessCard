import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getPublicProfile, trackProfileView } from "../../services/publicProfileService";
import { saveContact } from "../../services/contactService";
import { assetUrl } from "../../services/api";
import { useApp } from "@/components/context/AppContext";
import SafeScreen from "@/components/ui/Screen1";
import Button from "@/components/ui/Button";
import { Avatar, EmptyState, Loading, ScreenHeader, SectionLabel, Surface } from "@/components/ui/kit";
import { Space } from "@/constants/design";

type IconName = keyof typeof Ionicons.glyphMap;

export default function ProfileDetail() {
  const { id } = useLocalSearchParams();
  const { colors } = useApp();
  const [profile, setProfile] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // The service already returns the response body.
        setProfile(await getPublicProfile(id as string));
        trackProfileView(id as string);
      } catch {
        setFailed(true);
      }
    })();
  }, [id]);

  if (failed) {
    return (
      <SafeScreen>
        <View style={styles.pad}>
          <ScreenHeader title="Profile" back />
          <EmptyState icon="person-outline" title="Profile not found" body="This card may be private or no longer exist." />
        </View>
      </SafeScreen>
    );
  }
  if (!profile) {
    return (
      <SafeScreen>
        <Loading />
      </SafeScreen>
    );
  }

  const save = async () => {
    try {
      setBusy(true);
      await saveContact({ profile_id: profile.id });
      setSaved(true);
    } catch {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const exportToContacts = async () => {
    try {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${profile.display_name ?? ""}`,
        `FN:${profile.display_name ?? ""}`,
        profile.company ? `ORG:${profile.company}` : "",
        profile.job_title ? `TITLE:${profile.job_title}` : "",
        profile.phone ? `TEL;TYPE=CELL:${profile.phone}` : "",
        profile.email ? `EMAIL:${profile.email}` : "",
        "END:VCARD",
      ].filter(Boolean);
      const dir = (FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory;
      const fileUri = dir + `${(profile.display_name || "contact").replace(/\s/g, "_")}.vcf`;
      await FileSystem.writeAsStringAsync(fileUri, lines.join("\n"), { encoding: "utf8" as any });
      await Sharing.shareAsync(fileUri);
    } catch {
      Alert.alert("Couldn't export", "Please try again.");
    }
  };

  const digits = String(profile.whatsapp || profile.phone || "").replace(/\D/g, "");
  const quick: { icon: IconName; label: string; onPress: () => void }[] = [
    profile.phone && { icon: "call", label: "Call", onPress: () => Linking.openURL(`tel:${profile.phone}`) },
    digits && { icon: "logo-whatsapp", label: "WhatsApp", onPress: () => Linking.openURL(`https://wa.me/${digits}`) },
    profile.email && { icon: "mail", label: "Email", onPress: () => Linking.openURL(`mailto:${profile.email}`) },
  ].filter(Boolean) as any;

  const role = [profile.job_title, profile.company].filter(Boolean).join(" · ");

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="" back />

        <View style={styles.hero}>
          <Avatar uri={assetUrl(profile.avatar_url)} name={profile.display_name} size={112} />
          <Text style={[styles.name, { color: colors.text }]}>{profile.display_name}</Text>
          {role ? <Text style={[styles.role, { color: colors.subText }]}>{role}</Text> : null}
        </View>

        {quick.length > 0 ? (
          <View style={styles.quickRow}>
            {quick.map((q) => (
              <Pressable key={q.label} onPress={q.onPress} style={styles.quick} accessibilityRole="button" accessibilityLabel={q.label}>
                <View style={[styles.quickIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={q.icon} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.text }]}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Button
          title={saved ? "Saved to network" : "Save to network"}
          icon={saved ? "checkmark-circle" : "person-add-outline"}
          variant={saved ? "secondary" : "primary"}
          onPress={save}
          loading={busy}
          disabled={saved}
        />
        <Button title="Add to phone contacts" icon="download-outline" variant="secondary" onPress={exportToContacts} style={{ marginTop: Space.md }} />

        {profile.bio ? (
          <>
            <SectionLabel>About</SectionLabel>
            <Surface>
              <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text>
            </Surface>
          </>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Space.lg, paddingBottom: 48 },
  hero: { alignItems: "center", marginBottom: Space.xl },
  name: { fontSize: 26, fontWeight: "800", marginTop: Space.lg, textAlign: "center" },
  role: { fontSize: 15, marginTop: 4, textAlign: "center" },
  quickRow: { flexDirection: "row", justifyContent: "center", gap: Space.xl, marginBottom: Space.xl },
  quick: { alignItems: "center", gap: 6 },
  quickIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13, fontWeight: "600" },
  hint: { textAlign: "center", fontSize: 13, marginTop: Space.sm },
  bio: { fontSize: 15, lineHeight: 22 },
});
