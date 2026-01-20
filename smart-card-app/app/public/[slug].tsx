import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  getPublicProfile,
  trackProfileView,
} from "../../services/publicProfileService";

export default function PublicProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadProfile();
      trackProfileView(slug);
    }
  }, [slug]);

  const loadProfile = async () => {
    try {
      const data = await getPublicProfile(slug!);
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Save contact (VCF)
  const saveContact = () => {
    const vcf = `
BEGIN:VCARD
VERSION:3.0
FN:${profile.display_name}
ORG:${profile.company}
TITLE:${profile.job_title}
TEL:${profile.phone}
EMAIL:${profile.email}
END:VCARD`;

    Linking.openURL(
      `data:text/vcard;charset=utf-8,${encodeURIComponent(vcf)}`
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Profile not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.name}>{profile.display_name}</Text>
      <Text style={styles.title}>
        {profile.job_title} @ {profile.company}
      </Text>

      {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

      {/* ACTION BUTTONS */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={saveContact}>
          <Text style={styles.btnText}>Save Contact</Text>
        </TouchableOpacity>

        {profile.whatsapp && (
          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              Linking.openURL(`https://wa.me/${profile.whatsapp}`)
            }
          >
            <Text style={styles.btnText}>WhatsApp</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 20,
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },
  title: {
    color: "#94A3B8",
    marginTop: 6,
  },
  bio: {
    color: "#CBD5E1",
    marginTop: 16,
    lineHeight: 22,
  },
  actions: {
    marginTop: 30,
  },
  btn: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  error: {
    color: "#F87171",
  },
});
