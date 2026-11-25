import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../../services/api";
import SafeScreen from "@/components/ui/Screen1";
import Button from "@/components/ui/Button";
import { Chip, ScreenHeader } from "@/components/ui/kit";
import { Space } from "@/constants/design";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useRef } from "react";


/* ================= SCREEN ================= */

export default function ProfileCardEditor({
  profile,
  onDone,
}: any) {
  const [cardType, setCardType] =
  useState<"classic" | "soft" | "dark" | "wave">("soft");

  const cardRef = useRef<ViewShotRef>(null);

   const exportCardAsImage = async () => {
    if (!cardRef.current) return;

    const uri = await cardRef.current.capture?.();
    if (!uri) return;

    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      dialogTitle: "Share business card",
    });
  };

  
  if (!profile) return null;

  return (
    <SafeScreen>
      <View style={styles.root}>
        <ScreenHeader title="Business card" subtitle="Pick a style, then share it as an image" back={onDone} />

        {/* CARD PREVIEW */}
        <ViewShot ref={cardRef} options={{ format: "png", quality: 1 }}>
          <View style={styles.preview}>
            {cardType === "wave" ? (
              <WaveBusinessCard profile={profile} />
            ) : (
              <BusinessCard profile={profile} type={cardType} />
            )}
          </View>
        </ViewShot>

        {/* STYLE PICKER */}
        <View style={styles.selector}>
          {(["classic", "soft", "dark", "wave"] as const).map((t) => (
            <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} active={cardType === t} onPress={() => setCardType(t)} />
          ))}
        </View>

        <Button title="Share card image" icon="share-outline" onPress={exportCardAsImage} style={{ marginTop: Space.xl }} />
      </View>
    </SafeScreen>
  );
}

/* ================= CARD ================= */

function BusinessCard({ profile, type }: any) {
  const theme = getTheme(type);
  const [avatarError, setAvatarError] = useState(false);

  return (
    <View style={styles.cardWrap}>
      {/* Decorative back card */}
      <View style={styles.cardShadow} />

      <View style={[styles.card, { backgroundColor: theme.bg }]}>
        {/* AVATAR */}
        <View style={styles.avatarWrap}>
  {profile.avatar_url && !avatarError ? (
    <Image
      source={{
        uri: profile.avatar_url.startsWith("http")
          ? profile.avatar_url
          : `${BASE_URL}${profile.avatar_url}`,
      }}
      style={styles.avatar}
      onError={() => setAvatarError(true)}
    />
  ) : (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitial}>
        {profile.display_name?.[0]?.toUpperCase() || "?"}
      </Text>
    </View>
  )}
</View>


        {/* NAME */}
        <Text style={[styles.name, { color: theme.text }]}>
          {profile.display_name}
        </Text>

        {/* ROLE */}
        <Text style={[styles.role, { color: theme.subText }]}>
          {profile.job_title}
        </Text>
        
          <Text style={[styles.company, { color: theme.subText }]}>
            {profile.company}
          </Text>
       

        {/* SOCIAL */}
        <View style={styles.socialRow}>
          <Ionicons name="logo-linkedin" size={18} color={theme.icon} />
          <Ionicons name="logo-github" size={18} color={theme.icon} />
          <Ionicons name="logo-twitter" size={18} color={theme.icon} />
        </View>

        {/* CONTACT */}
        <View style={styles.contact}>
          <Text style={[styles.label, { color: theme.muted }]}>Email</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {profile.email}
          </Text>

          <Text style={[styles.label, { color: theme.muted }]}>Phone</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {profile.phone}
          </Text>
        </View>
      </View>
    </View>
  );
}

function WaveBusinessCard({ profile }: any) {
  const [avatarError, setAvatarError] = useState(false);

  return (
    <View style={styles.waveCardWrap}>
      {/* Background shapes */}
      <View style={styles.wavePrimary} />
      <View style={styles.waveSecondary} />
      <View style={styles.waveAccent} />

      {/* Content */}
      <View style={styles.waveContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.waveName}>
            {profile.display_name}
          </Text>

          <Text style={styles.waveRole}>
            {profile.job_title}
          </Text>

          {profile.phone && (
            <Text style={styles.waveText}>{profile.phone}</Text>
          )}

          {profile.email && (
            <Text style={styles.waveText}>{profile.email}</Text>
          )}
        </View>

        {/* Avatar (same logic as other card) */}
        {profile.avatar_url && !avatarError ? (
          <Image
            source={{
              uri: profile.avatar_url.startsWith("http")
                ? profile.avatar_url
                : `${BASE_URL}${profile.avatar_url}`,
            }}
            style={styles.waveAvatar}
            onError={() => setAvatarError(true)}
          />
        ) : (
          <View style={styles.waveAvatarFallback}>
            <Text style={styles.avatarInitial}>
              {profile.display_name?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}


/* ================= THEMES ================= */

function getTheme(type: string) {
  if (type === "dark") {
    return {
      bg: "#020617",
      text: "#FFFFFF",
      subText: "#CBD5E1",
      muted: "#94A3B8",
      icon: "#E5E7EB",
    };
  }

  if (type === "classic") {
    return {
      bg: "#FFFFFF",
      text: "#111827",
      subText: "#374151",
      muted: "#6B7280",
      icon: "#111827",
    };
  }

  return {
    bg: "#E0E7FF",
    text: "#111827",
    subText: "#374151",
    muted: "#6B7280",
    icon: "#111827",
  };
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  preview: {
    marginTop: 8,
    alignItems: "center",
  },

  cardWrap: {
    width: "90%",
    aspectRatio: 0.65,
    alignItems: "center",
    justifyContent: "center",
  },

  cardShadow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    borderRadius: 28,
    transform: [{ rotate: "-4deg" }],
  },

  card: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    elevation: 10,
  },

  avatarWrap: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginBottom: 14,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 45,
  },

  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
  },

  name: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },

  role: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
  },
  company: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 14,
    textAlign: "center",
  },

  socialRow: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 18,
  },

  contact: {
    width: "100%",
  },

  label: {
    fontSize: 14,
    marginTop: 8,
  },

  value: {
    fontSize: 14,
  },

  selector: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 28,
  },

  selectorItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
  },

  selectorActive: {
    backgroundColor: "#111827",
  },

  selectorText: {
    fontSize: 12,
    color: "#374151",
  },

  selectorTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  waveCardWrap: {
  width: "90%",
  height: 220,
  borderRadius: 24,
  overflow: "hidden",
  backgroundColor: "#FDE2E2",
},

wavePrimary: {
  position: "absolute",
  width: 380,
  height: 380,
  borderRadius: 190,
  backgroundColor: "#6D28D9",
  top: -200,
  right: -140,
},

waveSecondary: {
  position: "absolute",
  width: 320,
  height: 320,
  borderRadius: 160,
  backgroundColor: "#EC4899",
  bottom: -200,
  right: -140,
  opacity: 0.9,
},

waveAccent: {
  position: "absolute",
  width: 260,
  height: 260,
  borderRadius: 130,
  backgroundColor: "#A78BFA",
  top: -140,
  left: -180,
  opacity: 0.7,
},

waveContent: {
  flex: 1,
  padding: 20,
  flexDirection: "row",
  alignItems: "center",
  zIndex: 10,
},

waveName: {
  fontSize: 18,
  fontWeight: "800",
  color: "#4C1D95",
},

waveRole: {
  fontSize: 13,
  color: "#5B21B6",
  marginBottom: 12,
},

waveText: {
  fontSize: 12,
  color: "#4C1D95",
},

waveAvatar: {
  width: 96,
  height: 96,
  borderRadius: 48,
  borderWidth: 2,
  borderColor: "#6D28D9",
},

waveAvatarFallback: {
  width: 96,
  height: 96,
  borderRadius: 48,
  backgroundColor: "#DDD6FE",
  alignItems: "center",
  justifyContent: "center",
},
shareBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 30,
  backgroundColor: "#10B981",
  paddingVertical: 14,
  borderRadius: 14,
  gap: 8,
},

shareText: {
  color: "#FFFFFF",
  fontWeight: "700",
  fontSize: 15,
},


});
