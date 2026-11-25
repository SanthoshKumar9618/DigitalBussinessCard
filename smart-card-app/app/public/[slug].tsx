import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getPublicProfile, trackProfileView } from "../../services/publicProfileService";
import { assetUrl } from "../../services/api";
import { useApp } from "@/components/context/AppContext";
import SafeScreen from "@/components/ui/Screen1";
import Button from "@/components/ui/Button";
import { Avatar, EmptyState, Loading, Surface } from "@/components/ui/kit";
import { Space } from "@/constants/design";

export default function PublicProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useApp();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    getPublicProfile(slug)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
    trackProfileView(slug).catch(() => {});
  }, [slug]);

  if (loading) {
    return (
      <SafeScreen>
        <Loading />
      </SafeScreen>
    );
  }
  if (!profile) {
    return (
      <SafeScreen>
        <EmptyState icon="person-outline" title="Card not found" body="This card may be private or no longer exist." />
      </SafeScreen>
    );
  }

  const saveContact = () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${profile.display_name ?? ""}`,
      profile.company ? `ORG:${profile.company}` : "",
      profile.job_title ? `TITLE:${profile.job_title}` : "",
      profile.phone ? `TEL:${profile.phone}` : "",
      profile.email ? `EMAIL:${profile.email}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");
    Linking.openURL(`data:text/vcard;charset=utf-8,${encodeURIComponent(vcf)}`);
  };

  const role = [profile.job_title, profile.company].filter(Boolean).join(" · ");
  const wa = String(profile.whatsapp || "").replace(/\D/g, "");

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.hero}>
          <Avatar uri={assetUrl(profile.avatar_url)} name={profile.display_name} size={112} />
          <Text style={[styles.name, { color: colors.text }]}>{profile.display_name}</Text>
          {role ? <Text style={[styles.role, { color: colors.subText }]}>{role}</Text> : null}
        </View>
        {profile.bio ? (
          <Surface style={{ marginBottom: Space.xl }}>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{profile.bio}</Text>
          </Surface>
        ) : null}
        <Button title="Save contact" icon="download-outline" onPress={saveContact} />
        {wa ? (
          <Button
            title="WhatsApp"
            icon="logo-whatsapp"
            variant="secondary"
            onPress={() => Linking.openURL(`https://wa.me/${wa}`)}
            style={{ marginTop: Space.md }}
          />
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Space.xl, paddingBottom: 48 },
  hero: { alignItems: "center", marginTop: Space.xl, marginBottom: Space.xl },
  name: { fontSize: 26, fontWeight: "800", marginTop: Space.lg, textAlign: "center" },
  role: { fontSize: 15, marginTop: 4, textAlign: "center" },
});
