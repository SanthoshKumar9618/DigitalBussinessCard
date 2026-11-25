import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { updateProfile } from "../../services/profileService";
import api, { assetUrl } from "../../services/api";
import { useApp } from "../context/AppContext";
import SafeScreen from "../ui/Screen1";
import EditBusinessCard from "../../app/profile/ProfileCard";
import { sendEmailOtp, updateUser, verifyEmailOtp } from "../../services/userService";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import { Avatar, ListRow, ScreenHeader, SectionLabel, Segmented, Surface } from "../ui/kit";
import { Space } from "../../constants/design";

type TabType = "info" | "links";
type IconName = keyof typeof Ionicons.glyphMap;

const OPTIONAL_FIELDS: { key: string; label: string; placeholder: string; icon: IconName }[] = [
  { key: "website", label: "Website", placeholder: "example.com", icon: "globe-outline" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/your-name", icon: "logo-linkedin" },
  { key: "twitter", label: "Twitter / X", placeholder: "x.com/your-handle", icon: "logo-twitter" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/your-page", icon: "logo-facebook" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+91 98765 43210", icon: "logo-whatsapp" },
];

export default function EditProfile({ profile, onDone }: any) {
  const { colors } = useApp();

  const [mode, setMode] = useState<"profile" | "card">("profile");
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url);

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
  const [userForm, setUserForm] = useState({ phone: profile.phone || "", email: profile.email || "" });

  const [emailVerified, setEmailVerified] = useState(profile.email_verified ?? false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setIsDirty(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      setIsDirty(true);
    }
  };

  const emailChanged = userForm.email.trim() !== (profile.email || "");

  const handleSave = async () => {
    // Check before saving anything, so nothing is half-saved.
    if (emailChanged && !emailVerified) {
      Alert.alert("Verify your new email", "Tap Verify next to the email and enter the code we send.");
      return;
    }
    const payload: Record<string, string> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (typeof v === "string" && v.trim()) payload[k] = v.trim();
    });
    if (payload.website && !payload.website.startsWith("http")) payload.website = "https://" + payload.website;

    try {
      setSaving(true);
      if (Object.keys(payload).length > 0) await updateProfile(payload);
      if (userForm.phone !== (profile.phone || "")) await updateUser({ phone: userForm.phone });

      if (avatar && avatar !== profile.avatar_url) {
        const formData = new FormData();
        if (Platform.OS === "web") {
          const blob = await (await fetch(avatar)).blob();
          formData.append("file", blob, "avatar.jpg");
        } else {
          formData.append("file", { uri: avatar, name: "avatar.jpg", type: "image/jpeg" } as any);
        }
        const res = await api.post("/profile/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
        profile.avatar_url = res.data.avatar_url;
      }
      onDone();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      Alert.alert("Couldn't save", typeof detail === "string" ? detail : "Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!isDirty) return onDone();
    if (Platform.OS === "web") return onDone();
    Alert.alert("Discard changes?", "Your changes will be lost.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onDone },
    ]);
  };

  const handleSendEmailOtp = async () => {
    if (!userForm.email.trim()) return Alert.alert("Enter an email first");
    try {
      setVerifying(true);
      await sendEmailOtp(userForm.email.trim());
      setOtpSent(true);
    } catch (e: any) {
      Alert.alert("Couldn't send code", e?.response?.data?.detail || "Try again in a moment.");
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otp) return;
    try {
      setVerifying(true);
      await verifyEmailOtp(userForm.email.trim(), otp);
      setEmailVerified(true);
      setOtpSent(false);
    } catch {
      Alert.alert("That code didn't work", "Check it, or send a new one.");
    } finally {
      setVerifying(false);
    }
  };

  if (mode === "card") {
    return <EditBusinessCard profile={profile} onDone={() => setMode("profile")} />;
  }

  const avatarUri = avatar ? (avatar.startsWith("/") ? assetUrl(avatar) : avatar) : null;

  return (
    <SafeScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.headerWrap}>
          <ScreenHeader
            title="Edit profile"
            back={handleCancel}
            right={<Button title="Save" size="md" onPress={handleSave} loading={saving} style={{ minWidth: 84 }} />}
          />
          <Segmented<TabType>
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "info", label: "Details" },
              { value: "links", label: "Links & social" },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          {activeTab === "info" ? (
            <>
              <Pressable onPress={pickImage} style={styles.avatarWrap} accessibilityRole="button" accessibilityLabel="Change photo">
                <Avatar uri={avatarUri} name={form.display_name} size={104} />
                <View style={[styles.camBadge, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
                  <Ionicons name="camera" size={16} color={colors.onPrimary} />
                </View>
              </Pressable>
              <Text style={[styles.avatarHint, { color: colors.subText }]}>Tap to change photo</Text>

              <SectionLabel>About you</SectionLabel>
              <TextField label="Display name" icon="person-outline" value={form.display_name} onChangeText={set("display_name")} placeholder="Your name" />
              <TextField label="Job title" icon="briefcase-outline" value={form.job_title} onChangeText={set("job_title")} placeholder="e.g. Product Manager" />
              <TextField label="Company" icon="business-outline" value={form.company} onChangeText={set("company")} placeholder="Company name" />
              <TextField label="Bio" value={form.bio} onChangeText={set("bio")} placeholder="One or two lines about what you do" multiline maxLength={280} hint={`${form.bio.length}/280`} />

              <SectionLabel>Contact</SectionLabel>
              <TextField
                label="Phone"
                icon="call-outline"
                value={userForm.phone}
                onChangeText={(v) => {
                  setUserForm((u) => ({ ...u, phone: v }));
                  setIsDirty(true);
                }}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />
              <TextField
                label="Email"
                icon="mail-outline"
                value={userForm.email}
                onChangeText={(v) => {
                  setUserForm((u) => ({ ...u, email: v }));
                  setEmailVerified(v.trim() === (profile.email || "") ? profile.email_verified ?? false : false);
                  setIsDirty(true);
                }}
                placeholder="you@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                hint={emailVerified ? "Verified" : emailChanged ? "Verify the new email before saving" : undefined}
                containerStyle={{ marginBottom: emailChanged && !emailVerified ? 8 : 14 }}
              />
              {emailChanged && !emailVerified ? (
                otpSent ? (
                  <View style={styles.otpRow}>
                    <TextField
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="6-digit code"
                      keyboardType="number-pad"
                      maxLength={6}
                      containerStyle={{ flex: 1, marginBottom: 0 }}
                    />
                    <Button title="Confirm" size="md" onPress={handleVerifyEmailOtp} loading={verifying} />
                  </View>
                ) : (
                  <Button title="Verify email" icon="shield-checkmark-outline" variant="secondary" size="md" onPress={handleSendEmailOtp} loading={verifying} style={{ marginBottom: 14 }} />
                )
              ) : null}

              <SectionLabel>Your card</SectionLabel>
              <Surface style={{ paddingVertical: 2 }}>
                <ListRow icon="card-outline" title="Edit business card" subtitle="Layout, colours and what's shown" onPress={() => setMode("card")} last />
              </Surface>
            </>
          ) : (
            <>
              <Text style={[styles.linksIntro, { color: colors.subText }]}>
                These appear as buttons on your card. Leave any blank to hide it.
              </Text>
              {OPTIONAL_FIELDS.map((f) => (
                <TextField
                  key={f.key}
                  label={f.label}
                  icon={f.icon}
                  value={(form as any)[f.key]}
                  onChangeText={set(f.key as keyof typeof form)}
                  placeholder={f.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={f.key === "whatsapp" ? "phone-pad" : "url"}
                />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Space.lg, paddingTop: Space.sm, paddingBottom: Space.md },
  scroll: { paddingHorizontal: Space.lg, paddingBottom: 120 },
  avatarWrap: { alignSelf: "center", marginTop: Space.md },
  camBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { textAlign: "center", fontSize: 13, marginTop: Space.sm },
  otpRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, marginBottom: 14 },
  linksIntro: { fontSize: 14, lineHeight: 20, marginBottom: Space.lg },
});
