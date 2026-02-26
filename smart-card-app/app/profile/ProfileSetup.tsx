import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { createProfile } from "../../services/profileService";
import api from "../../services/api";
import { useApp } from "../../components/context/AppContext";
import { router } from "expo-router";
//import { useAuth } from "../../context/AuthContext";
import SafeScreen from "../../components/ui/Screen1";
import AsyncStorage from "@react-native-async-storage/async-storage";


type ProfileForm = {
  job_title?: string;
  company?: string;
  bio?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  whatsapp?: string;
};

export default function ProfileSetup() {
  const { colors } = useApp();
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");

  const [form, setForm] = useState<ProfileForm>({
    job_title: "",
    company: "",
    bio: "",
    website: "",
    linkedin: "",
    twitter: "",
    facebook: "",
    whatsapp: "",
  });

  /* ---------------- HELPERS ---------------- */

  const cleanPayload = (data: ProfileForm) => {
    const cleaned: any = {};
    Object.entries(data).forEach(([key, value]) => {
      if (!value) return; // ⛔ removes empty string, null, undefined
      cleaned[key] = value.trim();
    });
    return cleaned;
  };

  /* ---------------- IMAGE PICK ---------------- */

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  /* ---------------- SAVE ---------------- */

  const handleSave = async () => {
  if (saving) return;


  setSaving(true);

  try {
    const payload = cleanPayload(form);

    await createProfile(payload);

    if (avatar) {
      const formData = new FormData();
      formData.append("file", {
        uri: avatar,
        name: "avatar.jpg",
        type: "image/jpeg",
      } as any);

      await api.post("/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    await AsyncStorage.setItem("profile_setup_done", "true");
    router.replace("/(tabs)/network");


  } catch (err: any) {
    if (err.response?.status === 400) {
      router.replace("/(tabs)/network");
      return;
    }

    console.error("PROFILE SETUP ERROR", err);
    Alert.alert("Error", "Failed to create profile");

  } finally {
    setSaving(false);
  }
};
const handleSkip = async () => {
  await AsyncStorage.setItem("profile_setup_done", "true");
  router.replace("/(tabs)/network");
};
useEffect(() => {
  api.get("/profile/me")
   .then(res => {
  setFullName(res.data.display_name);
})
.catch(err => {
  console.log("PROFILE ME ERROR", err.response?.status);
});

}, []);



  /* ---------------- UI ---------------- */

 return (
    <SafeScreen>
      <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
      
        <View style={styles.container}>
          {/* Avatar */}
          <TouchableOpacity
            style={[styles.avatarBox, { backgroundColor: colors.card }]}
            onPress={pickImage}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
            ) : (
              <>
                <Ionicons name="image-outline" size={22} color={colors.text} />
                <Text style={{ color: colors.subText, marginTop: 6 }}>
                  Add Photo
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>
            Set up your profile
          </Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            This information will be visible to others.
          </Text>
          <View style={styles.fieldGroup}>
  <Text style={[styles.label, { color: colors.subText }]}>
    Name
  </Text>

  <View
    style={[
      styles.input,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
        opacity: 0.6,
        justifyContent: "space-between",
        flexDirection: "row",
        alignItems: "center",
      },
    ]} >
       
  </View>

  <Text style={{ fontSize: 12, color: colors.subText, marginTop: 4 }}>
    You can change your name from Edit Profile
  </Text>
</View>


          {/* Inputs */}
          {[
            { key: "job_title", label: "Job Title" },
            { key: "company", label: "Company" },
            { key: "bio", label: "Bio", multiline: true },
            { key: "website", label: "Website", hint: "https://example.com" },
            { key: "linkedin", label: "LinkedIn" },
            { key: "twitter", label: "Twitter" },
            { key: "facebook", label: "Facebook" },
            { key: "whatsapp", label: "WhatsApp" },
          ].map(({ key, label, multiline, hint }) => (
            <View key={key} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.subText }]}>
                {label}
              </Text>

              <TextInput
                value={(form as any)[key]}
                placeholder={hint || label}
                placeholderTextColor={colors.subText}
                multiline={multiline}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                onChangeText={(v) =>
                  setForm({ ...form, [key]: v })
                }
              />
            </View>
          ))}

          <View style={styles.actionRow}>
  {/* Skip */}
  <TouchableOpacity
    onPress={handleSkip}
    disabled={saving}
    style={[
      styles.skipBtnInline,
      { borderColor: colors.border },
    ]}
  >
    <Text style={[styles.skipText, { color: colors.subText }]}>
      Skip
    </Text>
  </TouchableOpacity>

  {/* Save */}
  <TouchableOpacity
    onPress={handleSave}
    disabled={saving}
    style={[
      styles.primaryBtnInline,
      {
        backgroundColor: colors.primary,
        opacity: saving ? 0.6 : 1,
      },
    ]}
  >
    <Text style={styles.primaryText}>
      {saving ? "Saving..." : "Save & Continue"}
    </Text>
  </TouchableOpacity>
</View>

        </View>

        

        </ScrollView>
    </SafeScreen>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
  },

  avatarBox: {
    alignSelf: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  avatarImg: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },

  subtitle: {
    textAlign: "center",
    marginBottom: 24,
  },

  fieldGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 4,
  },

  input: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },

  primaryBtn: {
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
  },

  primaryText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
  skipBtn: {
  alignSelf: "flex-end",
  marginBottom: 8,
},
actionRow: {
  flexDirection: "row",
  gap: 12,
  marginTop: 16,
},

skipBtnInline: {
  flex: 1,
  padding: 16,
  borderRadius: 14,
  borderWidth: 1,
  alignItems: "center",
},

skipText: {
  fontSize: 14,
  fontWeight: "600",
},

primaryBtnInline: {
  flex: 2,
  padding: 16,
  borderRadius: 14,
  alignItems: "center",
},


});