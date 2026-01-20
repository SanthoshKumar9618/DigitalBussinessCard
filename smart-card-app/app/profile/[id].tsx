import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getPublicProfile,
  trackProfileView,
} from "../../services/publicProfileService";
import { SafeAreaView } from "react-native-safe-area-context";
import { Linking } from "react-native";
import {
  saveContact,
  deleteContact,
} from "../../services/contactService";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";


import { Animated, Easing } from "react-native";


export default function ProfileDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [saved, setSaved] = useState(profile?.is_saved);
  const BASE_DIR =
  (FileSystem as any).documentDirectory ??
  (FileSystem as any).cacheDirectory;
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(20);

  useEffect(() => {
  loadProfile();

  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }),
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }),
  ]).start();
}, []);


  const loadProfile = async () => {
    const res = await getPublicProfile(id as string);
    setProfile(res.data);
    trackProfileView(id as string);
  };

  if (!profile) return null;
      const exportToContacts = async () => {
  try {
    const vcard = `
BEGIN:VCARD
VERSION:3.0
N:${profile.full_name}
FN:${profile.full_name}
ORG:${profile.company}
TITLE:${profile.job_title}
TEL;TYPE=CELL:${profile.phone}
EMAIL:${profile.email}
END:VCARD
    `.trim();

    const fileUri =
      BASE_DIR +
      `${profile.full_name.replace(/\s/g, "_")}.vcf`;

    await FileSystem.writeAsStringAsync(fileUri, vcard, {
      encoding: "utf8" as any,
    });

    await Sharing.shareAsync(fileUri);
  } catch (err) {
    console.log("Export error:", err);
  }
};



  return (
     <SafeAreaView style={styles.safe}>
    <Animated.View
  style={{
    flex: 1,
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  }}
>
  <ScrollView style={styles.container}>

      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <Image source={{ uri: profile.avatar }} style={styles.avatar} />

      <Text style={styles.name}>{profile.full_name}</Text>
      <Text style={styles.role}>{profile.job_title}</Text>
      <Text style={styles.company}>@ {profile.company}</Text>

      {/* ACTION BUTTONS */}
      <View style={styles.actions}>
        <TouchableOpacity  style={styles.callBtn} activeOpacity={0.7}
         onPress={() => Linking.openURL(`tel:${profile.phone}`)}>
          <Ionicons name="call" size={18} color="#FFF" />
          <Text style={styles.btnText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.whatsappBtn}
          onPress={() => Linking.openURL(`https://wa.me/${profile.whatsapp}`)
           }>
          <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
          <Text style={styles.btnText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.emailBtn}
  onPress={() =>
    Linking.openURL(`mailto:${profile.email}`)
  }>   <Ionicons name="mail-outline" size={18} color="#FFF" />
        <Text style={styles.btnText}>Email</Text>
      </TouchableOpacity>

      <TouchableOpacity
  style={saved ? styles.removeBtn : styles.saveBtn}
  onPress={async () => {
    if (saved) {
      await deleteContact(profile.contact_id);
      setSaved(false);
    } else {
      await saveContact({ profile_id: profile.id });
      setSaved(true);
    }
  }}
>
  <Text style={styles.btnText}>
    {saved ? "Remove Connection" : "Save to Network"}
  </Text>
</TouchableOpacity>
 <TouchableOpacity style={styles.exportBtn} onPress={exportToContacts}>
  <Ionicons name="download-outline" size={18} color="#FFF" />
  <Text style={styles.btnText}>Export to Contacts</Text>
</TouchableOpacity>



      {/* BIO */}
      <Text style={styles.section}>BIO</Text>
      <View style={styles.box}>
        <Text style={styles.text}>{profile.bio}</Text>
      </View>
      <Text style={styles.section}>PRIVATE NOTES</Text>

<View style={styles.box}>
  <Text style={styles.note}>Met at conference</Text>
</View>

      </ScrollView>
</Animated.View>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: {
  flex: 1,
  backgroundColor: "#000",
},

  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
  },

  /* Header */
  header: {
    marginTop: 16,
    marginBottom: 20,
  },

  /* Avatar */
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginTop: 24,
    marginBottom: 16,
  },

  /* Name & Role */
  name: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  role: {
    color: "#C9A24D",
    fontSize: 16,
    textAlign: "center",
    marginTop: 6,
  },
  company: {
    color: "#8E8E93",
    fontSize: 14,
    textAlign: "center",
    marginTop: 2,
  },

  /* Actions */
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 12,
  },
  callBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  emailBtn: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
  },
  btnText: {
    color: "#FFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  note: {
  color: "#C9A24D",
  fontSize: 13,
},
saveBtn: {
  backgroundColor: "#3B82F6", // blue
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: "center",
  marginTop: 16,
},

removeBtn: {
  backgroundColor: "#DC2626", // red
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: "center",
  marginTop: 16,
},
exportBtn: {
  flexDirection: "row",
  backgroundColor: "#1C1C1E",
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 12,
},


  /* Sections */
  section: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 28,
    marginBottom: 8,
    letterSpacing: 1,
  },
  box: {
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    padding: 14,
  },
  text: {
    color: "#FFF",
    fontSize: 14,
    lineHeight: 20,
  },
});
