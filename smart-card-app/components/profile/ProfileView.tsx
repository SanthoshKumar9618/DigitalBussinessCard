import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Alert,
  Linking,
  Share,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import EditProfile from "./EditProfile";
import { BASE_URL } from "../../services/api";
import { useRouter } from "expo-router";
import { useApp } from "../../components/context/AppContext";
import SafeScreen from "../ui/Screen1";

export default function ProfileView({ profile, onRefresh }: any) {
  const fade = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const nfcPulse = useRef(new Animated.Value(1)).current;

  const router = useRouter();
  const [editing, setEditing] = useState(false);

  /* ---------------- CONSTANTS ---------------- */
  const SOCIAL_LINKS = [
  { key: "website", icon: "globe-outline", label: "Website" },
  { key: "linkedin", icon: "logo-linkedin", label: "LinkedIn" },
  { key: "twitter", icon: "logo-twitter", label: "Twitter" },
  { key: "facebook", icon: "logo-facebook", label: "Facebook" },
  { key: "whatsapp", icon: "logo-whatsapp", label: "WhatsApp" },
];

  const {
    openEditProfile,
    setOpenEditProfile,
    settings,
    colors,
  } = useApp();

if (!settings) {
  return (
    <SafeScreen>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Loading Settings...</Text>
      </View>
    </SafeScreen>
  );
}
  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    if (openEditProfile) {
      setEditing(true);
      setOpenEditProfile(false);
    }
  }, [openEditProfile]);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(nfcPulse, {
          toValue: 1.05,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(nfcPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  /* ---------------- HELPERS ---------------- */

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(pressAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pressAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Unable to open link")
    );
  };

  const copyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Link copied to clipboard");
  };

  const shareProfile = async () => {
    await Share.share({
      message: `Connect with me:\nhttps://yourapp.com/${profile.slug}`,
    });
  };

  /* ---------------- PRIVATE PROFILE ---------------- */

  if (!settings.public_profile) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={colors.subText}
          />
          <Text style={[styles.lockText, { color: colors.subText }]}>
            This profile is private
          </Text>
          <Text style={[styles.lockSub, { color: colors.subText }]}>
            Turn on “Public Profile” in Settings
          </Text>
        </View>
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

  /* ---------------- UI ---------------- */

  return (
    <SafeScreen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Animated.View
          style={[styles.container, { opacity: fade }]}
        >
          {/* AVATAR */}
          <View style={styles.avatarWrap}>
            {profile.avatar_url ? (
              <Image
                source={{ uri: `${BASE_URL}${profile.avatar_url}` }}
                style={[
                  styles.avatar,
                  { borderColor: colors.primary },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.card,
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={48}
                  color={colors.subText}
                />
              </View>
            )}
          </View>

          <Text style={[styles.name, { color: colors.text }]}>
            {profile.display_name}
          </Text>

          <Text style={[styles.subtitle, { color: colors.subText }]}>
            {profile.job_title} @ {profile.company}
          </Text>

          {/* ACTIONS */}
          <View style={styles.actions}>
  <TouchableOpacity
    style={[
      styles.actionBtn,
      { backgroundColor: colors.card }
    ]}
    onPress={() => setEditing(true)}
  >
    <Text style={{ color: colors.text, fontWeight: "600" }}>
      Edit Profile
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.actionBtn,
      { backgroundColor: colors.primary }
    ]}
    onPress={shareProfile}
  >
    <Text style={{ color: "#000", fontWeight: "700" }}>
      Share
    </Text>
  </TouchableOpacity>
</View>


          {/* INFO CARD */}
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text },
            ]}
          >
            Basic Info
          </Text>

          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card },
            ]}
          >
            {profile.bio && (
              <Text
                style={[styles.bioText, { color: colors.text }]}
              >
                {profile.bio}
              </Text>
            )}

            {settings.show_email && profile.email && (
              <View style={styles.infoItem}>
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={colors.subText}
                />
                <Text
                  style={[
                    styles.infoText,
                    { color: colors.subText },
                  ]}
                >
                  {profile.email}
                </Text>
              </View>
            )}

            {settings.show_phone && profile.phone && (
              <View style={styles.infoItem}>
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={colors.subText}
                />
                <Text
                  style={[
                    styles.infoText,
                    { color: colors.subText },
                  ]}
                >
                  {profile.phone}
                </Text>
              </View>
            )}
          </View>

          {/* SOCIAL LINKS */}
          {/* SOCIAL LINKS */}
{SOCIAL_LINKS.some((l) => profile[l.key]) && (
  <>
    <Text
      style={[
        styles.sectionTitle,
        { color: colors.text },
      ]}
    >
      Connect
    </Text>

    <View
      style={[
        styles.infoCard,
        { backgroundColor: colors.card },
      ]}
    >
      {SOCIAL_LINKS.map((item) => {
        const value = profile[item.key];

        if (!value) return null;

        const url =
          item.key === "whatsapp"
            ? value.startsWith("http")
              ? value
              : `https://wa.me/${value.replace(/\D/g, "")}`
            : value.startsWith("http")
            ? value
            : `https://${value}`;

        return (
          <TouchableOpacity
            key={item.key}
            style={styles.infoItem}
            onPress={() => openLink(url)}
          >
            <Ionicons
              name={item.icon as any}
              size={16}
              color={colors.subText}
            />
            <Text
              style={[
                styles.infoText,
                { color: colors.subText },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </>
)}
          {/* QR */}
          <View
            style={[
              styles.qrCard,
              { backgroundColor: colors.card },
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: colors.text },
              ]}
            >
              Scan to connect
            </Text>

            <QRCode
              value={`https://yourapp.com/${profile.slug}`}
              size={140}
              color="#000"
              backgroundColor="#FFF"
            />

            <TouchableOpacity
              onPress={() =>
                copyText(
                  `https://yourapp.com/${profile.slug}`
                )
              }
            >
              <Text
                style={[
                  styles.cardLink,
                  { color: colors.primary },
                ]}
              >
                yourapp.com/{profile.slug}
              </Text>
            </TouchableOpacity>

            <Text
              style={[
                styles.cardHint,
                { color: colors.subText },
              ]}
            >
              Tap to copy link
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeScreen>
  );
}

/* ---------------- STYLES (NO COLORS) ---------------- */

const styles = StyleSheet.create({
  container: { padding: 24 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockText: { marginTop: 12, fontSize: 16 },
  lockSub: { marginTop: 6, fontSize: 13 },
  avatarWrap: {
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    padding: 8,
    borderRadius: 20,
  },
  actionBtn: {
  flex: 1,
  padding: 14,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
},

  name: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    marginBottom: 20,
  },
  
  shareBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    marginLeft: 8,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 14,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    marginLeft: 8,
  },
  qrCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  cardTitle: {
    marginBottom: 12,
    fontWeight: "600",
  },
  cardLink: {
    fontSize: 13,
    marginTop: 12,
  },
  cardHint: {
    fontSize: 11,
    marginTop: 6,
  },
});
