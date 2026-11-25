import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Linking, Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useRouter } from "expo-router";
import EditProfile from "./EditProfile";
import { assetUrl, publicProfileUrl } from "../../services/api";
import CardSwitcher from "../cards/CardSwitcher";
import { useApp } from "../../components/context/AppContext";
import SafeScreen from "../ui/Screen1";
import Button from "../ui/Button";
import { Avatar, EmptyState, ListRow, Loading, SectionLabel, Surface } from "../ui/kit";
import { Radius, Space } from "../../constants/design";

type IconName = keyof typeof Ionicons.glyphMap;

const SOCIAL_LINKS: { key: string; icon: IconName; label: string }[] = [
  { key: "website", icon: "globe-outline", label: "Website" },
  { key: "linkedin", icon: "logo-linkedin", label: "LinkedIn" },
  { key: "twitter", icon: "logo-twitter", label: "Twitter / X" },
  { key: "facebook", icon: "logo-facebook", label: "Facebook" },
  { key: "whatsapp", icon: "logo-whatsapp", label: "WhatsApp" },
];

const socialUrl = (key: string, value: string) =>
  key === "whatsapp"
    ? value.startsWith("http")
      ? value
      : `https://wa.me/${value.replace(/\D/g, "")}`
    : value.startsWith("http")
      ? value
      : `https://${value}`;

export default function ProfileView({ profile, onRefresh }: any) {
  const fade = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { openEditProfile, setOpenEditProfile, settings, colors } = useApp();

  useEffect(() => {
    if (openEditProfile) {
      setEditing(true);
      setOpenEditProfile(false);
    }
  }, [openEditProfile, setOpenEditProfile]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: Platform.OS !== "web" }).start();
  }, [fade]);

  if (!settings) {
    return (
      <SafeScreen>
        <Loading />
      </SafeScreen>
    );
  }

  if (editing) {
    return (
      <EditProfile
        profile={profile}
        onDone={() => {
          setEditing(false);
          onRefresh();
        }}
      />
    );
  }

  const link = publicProfileUrl(profile.slug, "link");
  const role = [profile.job_title, profile.company].filter(Boolean).join(" · ");

  const openLink = (url: string) => Linking.openURL(url).catch(() => Alert.alert("Couldn't open link"));

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const shareProfile = () => Share.share({ message: `Connect with me:\n${link}` });

  const socials = SOCIAL_LINKS.filter((l) => profile[l.key]);
  const contactRows = [
    settings.show_email && profile.email
      ? { icon: "mail-outline" as IconName, title: profile.email, onPress: () => openLink(`mailto:${profile.email}`) }
      : null,
    settings.show_phone && profile.phone
      ? { icon: "call-outline" as IconName, title: profile.phone, onPress: () => openLink(`tel:${profile.phone}`) }
      : null,
  ].filter(Boolean) as { icon: IconName; title: string; onPress: () => void }[];

  return (
    <SafeScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View style={{ opacity: fade }}>
          <View style={styles.switcher}>
            <CardSwitcher />
          </View>

          {!settings.public_profile ? (
            <Surface style={styles.privateNote}>
              <Ionicons name="lock-closed" size={18} color={colors.primary} />
              <Text style={[styles.privateText, { color: colors.text }]}>
                Your card is private. People who scan it will see “not found”.
              </Text>
              <Button title="Make public" size="md" variant="secondary" onPress={() => router.push("/(tabs)/settings")} />
            </Surface>
          ) : null}

          {/* BUSINESS CARD HERO */}
          <LinearGradient
            colors={["#2A2218", "#14110C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.heroBand, { backgroundColor: colors.primary }]} />
            <View style={styles.heroTop}>
              <Avatar uri={assetUrl(profile.avatar_url)} name={profile.display_name} size={76} />
              <Ionicons name="wifi" size={22} color="rgba(255,255,255,0.35)" style={styles.nfcIcon} />
            </View>
            <Text style={styles.heroName} numberOfLines={2}>
              {profile.display_name || "Your name"}
            </Text>
            {role ? (
              <Text style={styles.heroRole} numberOfLines={2}>
                {role}
              </Text>
            ) : (
              <Text style={[styles.heroRole, { opacity: 0.6 }]}>Add your job title and company</Text>
            )}
            {profile.bio ? (
              <Text style={styles.heroBio} numberOfLines={3}>
                {profile.bio}
              </Text>
            ) : null}
            <Text style={[styles.heroLink, { color: colors.primary }]} numberOfLines={1}>
              {link.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
            </Text>
          </LinearGradient>

          <View style={styles.actions}>
            <Button title="Edit" icon="create-outline" variant="secondary" onPress={() => setEditing(true)} style={{ flex: 1 }} />
            <Button title="Share" icon="share-outline" onPress={shareProfile} style={{ flex: 1 }} />
          </View>

          {contactRows.length > 0 ? (
            <>
              <SectionLabel>Contact</SectionLabel>
              <Surface style={styles.group}>
                {contactRows.map((r, i) => (
                  <ListRow key={r.title} icon={r.icon} title={r.title} onPress={r.onPress} last={i === contactRows.length - 1} />
                ))}
              </Surface>
            </>
          ) : null}

          {socials.length > 0 ? (
            <>
              <SectionLabel>Connect</SectionLabel>
              <Surface style={styles.group}>
                {socials.map((s, i) => (
                  <ListRow
                    key={s.key}
                    icon={s.icon}
                    title={s.label}
                    subtitle={String(profile[s.key]).replace(/^https?:\/\/(www\.)?/, "")}
                    onPress={() => openLink(socialUrl(s.key, profile[s.key]))}
                    last={i === socials.length - 1}
                  />
                ))}
              </Surface>
            </>
          ) : null}

          {contactRows.length === 0 && socials.length === 0 ? (
            <EmptyState
              icon="add-circle-outline"
              title="Make your card useful"
              body="Add your phone, email and social links so people can reach you."
              cta="Add details"
              onCta={() => setEditing(true)}
            />
          ) : null}

          <SectionLabel>QR code</SectionLabel>
          <Surface style={styles.qrCard}>
            <View style={styles.qrFrame}>
              <QRCode value={publicProfileUrl(profile.slug, "qr")} size={164} color="#111" backgroundColor="#FFF" />
            </View>
            <Button
              title={copied ? "Link copied" : "Copy card link"}
              icon={copied ? "checkmark" : "copy-outline"}
              variant="ghost"
              size="md"
              onPress={copyLink}
              style={{ marginTop: Space.md }}
            />
          </Surface>
        </Animated.View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Space.lg, paddingBottom: 120 },
  switcher: { alignItems: "center", marginBottom: Space.lg },
  privateNote: { gap: Space.md, marginBottom: Space.lg },
  privateText: { fontSize: 14, lineHeight: 20 },

  hero: {
    borderRadius: Radius.sheet,
    padding: Space.xl,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroBand: { position: "absolute", left: 0, right: 0, top: 0, height: 4 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Space.lg },
  nfcIcon: { transform: [{ rotate: "90deg" }] },
  heroName: { color: "#FFF", fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  heroRole: { color: "rgba(255,255,255,0.78)", fontSize: 15, marginTop: 4 },
  heroBio: { color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 20, marginTop: Space.md },
  heroLink: { fontSize: 13, fontWeight: "700", marginTop: Space.lg },

  actions: { flexDirection: "row", gap: Space.md, marginTop: Space.lg },
  group: { paddingVertical: 2 },
  qrCard: { alignItems: "center", paddingVertical: Space.xl },
  qrFrame: { padding: 12, backgroundColor: "#FFF", borderRadius: 16 },
});
