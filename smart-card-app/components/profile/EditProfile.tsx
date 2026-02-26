import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { updateProfile } from "../../services/profileService";
import api, { BASE_URL } from "../../services/api";
import { useApp } from "../context/AppContext";
import SafeScreen from "../ui/Screen1";
import EditBusinessCard from "../../app/profile/ProfileCard";
import { sendEmailOtp, verifyEmailOtp, updateUser } from "../../services/userService";
/* ---------------- TYPES ---------------- */

type TabType = "info" | "fields";
type Mode = "profile" | "card";

/* ---------------- OPTIONAL FIELDS ---------------- */

const OPTIONAL_FIELDS = [
  { key: "website", label: "Website", placeholder: "https://example.com" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
  { key: "twitter", label: "Twitter", placeholder: "https://twitter.com/..." },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/..." },
];

/* ---------------- INPUT ---------------- */

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  colors,
}: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.subText }}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subText}
        multiline={multiline}
        style={{
          paddingVertical: Platform.OS === "ios" ? 14 : 10,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          color: colors.text,
          marginTop: 6,
          minHeight: multiline ? 90 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

/* ================== SCREEN ================== */

export default function EditProfile({ profile, onDone }: any) {
  const { colors } = useApp();

  const [mode, setMode] = useState<Mode>("profile");
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [isDirty, setIsDirty] = useState(false);

  const [avatar, setAvatar] = useState(profile.avatar_url);

  const [form, setForm] = useState({
    display_name: profile.display_name || "",
    job_title: profile.job_title || "",
    company: profile.company || "",
    bio: profile.bio || "",
    website: profile.website ?? "",
    linkedin: profile.linkedin ?? "",
    twitter: profile.twitter ?? "",
    facebook: profile.facebook ?? "",
    whatsapp: profile.whatsapp ?? "",
  });

  const [userForm, setUserForm] = useState({
  phone: profile.phone || "",
  email: profile.email || "",
});

const [emailVerified, setEmailVerified] = useState(
  profile.email_verified ?? false
);
const [otpSent, setOtpSent] = useState(false);
const [otp, setOtp] = useState("");
const [verifying, setVerifying] = useState(false);

  /* ---------------- IMAGE PICK ---------------- */

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      setIsDirty(true);
    }
  };

  /* ---------------- SAVE ---------------- */

  const handleSave = async () => {
    const payload: any = {};

    Object.entries(form).forEach(([k, v]) => {
      if (typeof v === "string" && v.trim()) {
        payload[k] = v.trim();
      }
    });

    if (payload.website && !payload.website.startsWith("http")) {
      payload.website = "https://" + payload.website;
    }

    if (Object.keys(payload).length > 0) {
      await updateProfile(payload);
    }

      if (userForm.phone !== profile.phone) {
    await updateUser({ phone: userForm.phone });
  }

  if (userForm.email !== profile.email && !emailVerified) {
    Alert.alert("Please verify your new email");
    return;
  }

   if (avatar && avatar !== profile.avatar_url) {
  const formData = new FormData();
  formData.append("file", {
    uri: avatar,
    name: "avatar.jpg",
    type: "image/jpeg",
  } as any);

  const res = await api.post("/profile/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // 🔥 IMPORTANT: update local profile
  profile.avatar_url = res.data.avatar_url;
}


    onDone();
  };

  const handleCancel = () => {
    if (!isDirty) return onDone();

    Alert.alert("Discard changes?", "Your changes will be lost.", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onDone },
    ]);
  };

  /* ================== CARD EDIT ================== */

  if (mode === "card") {
    return <EditBusinessCard profile={profile} onDone={() => setMode("profile")} />;
  }


  const handleSendEmailOtp = async () => {
  if (!userForm.email) {
    Alert.alert("Email required");
    return;
  }

  try {
    setVerifying(true);
    await sendEmailOtp(userForm.email);
    setOtpSent(true);
    Alert.alert("OTP sent to new email");
  } catch (e: any) {
    Alert.alert(e.response?.data?.detail || "Failed to send OTP");
  } finally {
    setVerifying(false);
  }
};

const handleVerifyEmailOtp = async () => {
  if (!otp) return;

  try {
    setVerifying(true);
    await verifyEmailOtp(otp);
    setEmailVerified(true);
    setOtpSent(false);
    Alert.alert("Email verified");
  } catch {
    Alert.alert("Invalid or expired OTP");
  } finally {
    setVerifying(false);
  }
};
  /* ================== PROFILE EDIT ================== */

  return (
    <SafeScreen>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Edit Profile
        </Text>

        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.headerSave, { color: colors.primary }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      {/* EDIT CARD BUTTON */}
      <TouchableOpacity
        style={[
          styles.editCardBtn,
          { backgroundColor: colors.card, borderColor: colors.primary },
        ]}
        onPress={() => setMode("card")}
      >
        <Ionicons name="card-outline" size={18} color={colors.primary} />
        <Text style={[styles.editCardText, { color: colors.primary }]}>
          Edit Business Card
        </Text>
      </TouchableOpacity>

      {/* TABS */}
      <View style={[styles.tabs, { backgroundColor: colors.card }]}>
        {["info", "fields"].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t as TabType)}
            style={[
              styles.tab,
              activeTab === t && { backgroundColor: colors.primary + "22" },
            ]}
          >
            <Text style={{ color: colors.text }}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardDismissMode="on-drag"
      >
        {/* INFO TAB */}
        {activeTab === "info" && (
          <>
            <Text style={styles.sectionTitle}>Profile Photo</Text>

            <TouchableOpacity
              style={[styles.avatarBox, { backgroundColor: colors.card }]}
              onPress={pickImage}
            >
              {avatar ? (
                <Image
                  source={{
                    uri: avatar.startsWith("http")
                      ? avatar
                      : `${BASE_URL}${avatar}`,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <Ionicons name="image-outline" size={22} color={colors.subText} />
              )}
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Profile Details</Text>

            <LabeledInput
              label="Display Name"
              value={form.display_name}
              onChangeText={(v: string) => {
                setForm({ ...form, display_name: v });
                setIsDirty(true);
              }}
              placeholder="Your name"
              colors={colors}
            />

            <LabeledInput
  label="Phone Number"
  value={userForm.phone}
  onChangeText={(v: string) => {
    setUserForm({ ...userForm, phone: v });
    setIsDirty(true);
  }}
  placeholder="+91 98765 43210"
  colors={colors}
/>

<View style={{ marginBottom: 16 }}>
  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.subText }}>
    Email
  </Text>

  <View
    style={{
      marginTop: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: emailVerified ? "green" : colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "ios" ? 14 : 10,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <TextInput
        value={userForm.email}
        onChangeText={(v) => {
          setUserForm({ ...userForm, email: v });
          setEmailVerified(false);
          setIsDirty(true);
        }}
        keyboardType="email-address"
        placeholder="email@example.com"
        placeholderTextColor={colors.subText}
        style={{ flex: 1, color: colors.text }}
      />

      {emailVerified ? (
        <Ionicons name="checkmark-circle" size={20} color="green" />
      ) : (
        <TouchableOpacity onPress={handleSendEmailOtp}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Verify
          </Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
</View>


{otpSent && !emailVerified && (
  <View style={{ marginBottom: 16 }}>
    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.subText }}>
      Enter OTP
    </Text>

    <View
      style={{
        marginTop: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === "ios" ? 14 : 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TextInput
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          placeholder="6-digit OTP"
          placeholderTextColor={colors.subText}
          style={{ flex: 1, color: colors.text }}
        />

        <TouchableOpacity onPress={handleVerifyEmailOtp}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Submit
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}


            <LabeledInput
              label="Job Title"
              value={form.job_title}
              onChangeText={(v: string) => {
                setForm({ ...form, job_title: v });
                setIsDirty(true);
              }}
              placeholder="e.g. Product Manager"
              colors={colors}
            />

            <LabeledInput
              label="Company"
              value={form.company}
              onChangeText={(v: string) => {
                setForm({ ...form, company: v });
                setIsDirty(true);
              }}
              placeholder="Company name"
              colors={colors}
            />

            <LabeledInput
              label="Bio"
              value={form.bio}
              onChangeText={(v: string) => {
                setForm({ ...form, bio: v });
                setIsDirty(true);
              }}
              placeholder="Short bio"
              multiline
              colors={colors}
            />
          </>
        )}

        {/* FIELDS TAB */}
        {activeTab === "fields" && (
          <>
            <Text style={styles.sectionTitle}>Links & Social</Text>

            {OPTIONAL_FIELDS.map((f) => (
              <LabeledInput
                key={f.key}
                label={f.label}
                value={(form as any)[f.key]}
                onChangeText={(v: string) => {
                  setForm({ ...form, [f.key]: v });
                  setIsDirty(true);
                }}
                placeholder={f.placeholder}
                colors={colors}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSave: { fontSize: 16, fontWeight: "700" },

  tabs: { flexDirection: "row", margin: 16, borderRadius: 14 },
  tab: { flex: 1, padding: 12, alignItems: "center", borderRadius: 14 },

  container: { padding: 16 },

  sectionTitle: { fontSize: 16, fontWeight: "600", marginVertical: 12 },

  avatarBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },

  editCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  editCardText: {
    fontWeight: "600",
    fontSize: 15,
  },


});