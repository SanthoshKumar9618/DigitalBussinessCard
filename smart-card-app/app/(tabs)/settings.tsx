import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getPlan } from "@/services/integrationsService";
import { useAuth } from "@/context/AuthContext";
import { useCards } from "@/context/CardContext";
import { useApp } from "../../components/context/AppContext";
import { LANGUAGES, LanguageCode } from "../../constants/i18n";
import SafeScreen from "@/components/ui/Screen1";
import Button from "@/components/ui/Button";
import { Avatar, ListRow, Loading, OptionSheet, ScreenHeader, SectionLabel, Surface } from "@/components/ui/kit";
import { assetUrl } from "@/services/api";
import { Space } from "@/constants/design";

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { activeCard } = useCards();
  const { settings, loading, updateSetting, colors, theme, setOpenEditProfile, t } = useApp();

  const [planName, setPlanName] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    getPlan()
      .then((p) => setPlanName(p.plan.name))
      .catch(() => {});
  }, []);

  if (loading || !settings) {
    return (
      <SafeScreen>
        <Loading />
      </SafeScreen>
    );
  }

  const handleLogout = () => {
    const doLogout = async () => {
      // Clears the saved token too; the root screen then shows sign-in.
      await logout();
      router.replace("/(auth)/login");
    };
    if (Platform.OS === "web") {
      doLogout();
      return;
    }
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: doLogout },
    ]);
  };

  const toggle = (value: boolean, onChange: (v: boolean) => void, label: string) => (
    <Switch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor="#FFFFFF"
      {...(Platform.OS === "web" ? ({ activeThumbColor: "#FFFFFF" } as any) : {})}
    />
  );

  const languageName = LANGUAGES[(settings.language as LanguageCode) || "en"]?.name ?? "English";

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader large title={t("settings")} />

        {/* PROFILE CARD */}
        <Surface
          style={styles.profile}
          onPress={() => {
            setOpenEditProfile(true);
            router.push("/(tabs)/profile");
          }}
          accessibilityLabel="Edit profile"
        >
          <Avatar uri={assetUrl(activeCard?.avatar_url)} name={activeCard?.display_name} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
              {activeCard?.display_name || "Your profile"}
            </Text>
            <Text style={[styles.profileSub, { color: colors.subText }]} numberOfLines={1}>
              {planName ? `${planName} plan · ` : ""}Edit profile
            </Text>
          </View>
        </Surface>

        <SectionLabel>Privacy</SectionLabel>
        <Surface style={styles.group}>
          <ListRow
            icon="globe-outline"
            title="Public profile"
            subtitle="Anyone with your link can view your card"
            right={toggle(settings.public_profile, (v) => updateSetting("public_profile", v), "Public profile")}
          />
          <ListRow
            icon="call-outline"
            title="Show phone number"
            right={toggle(settings.show_phone, (v) => updateSetting("show_phone", v), "Show phone number")}
          />
          <ListRow
            icon="mail-outline"
            title="Show email address"
            right={toggle(settings.show_email, (v) => updateSetting("show_email", v), "Show email address")}
            last
          />
        </Surface>

        <SectionLabel>Sharing</SectionLabel>
        <Surface style={styles.group}>
          <ListRow icon="albums-outline" title="My cards" subtitle="Work, personal and more" onPress={() => router.push("/cards")} />
          <ListRow icon="link-outline" title="Card link & custom links" onPress={() => router.push("/share-kit")} />
          <ListRow icon="mail-unread-outline" title="Email signature & Wallet" onPress={() => router.push("/share-kit")} />
          <ListRow
            icon="qr-code-outline"
            title="Show my QR code"
            onPress={() => router.push({ pathname: "/(tabs)/tap", params: { showQr: "true" } })}
          />
          <ListRow
            icon="radio-outline"
            title="NFC tap"
            right={toggle(settings.nfc_enabled, (v) => updateSetting("nfc_enabled", v), "NFC tap")}
          />
          <ListRow
            icon="water-outline"
            title="SmartCard watermark"
            subtitle="Small badge on your shared card"
            right={toggle(settings.watermark_enabled, (v) => updateSetting("watermark_enabled", v), "Watermark")}
            last
          />
        </Surface>

        <SectionLabel>Business</SectionLabel>
        <Surface style={styles.group}>
          <ListRow icon="stats-chart-outline" title="Insights" subtitle="Views, saves and leads" onPress={() => router.push("/insights")} />
          <ListRow icon="people-outline" title="Team" subtitle="Members, branding, leaderboard" onPress={() => router.push("/team")} />
          <ListRow
            icon="git-network-outline"
            title="Integrations"
            subtitle="HubSpot, Zapier, webhooks"
            onPress={() => router.push("/integrations")}
            last
          />
        </Surface>

        <SectionLabel>App</SectionLabel>
        <Surface style={styles.group}>
          <ListRow
            icon={theme === "dark" ? "moon-outline" : "sunny-outline"}
            title={t("theme")}
            onPress={() => setShowThemePicker(true)}
            right={<Text style={{ color: colors.subText }}>{theme === "dark" ? "Dark" : "Light"}</Text>}
          />
          <ListRow
            icon="language-outline"
            title={t("language")}
            onPress={() => setShowLangPicker(true)}
            right={<Text style={{ color: colors.subText }}>{languageName}</Text>}
            last
          />
        </Surface>

        <Button title="Sign out" variant="danger" icon="log-out-outline" onPress={handleLogout} style={{ marginTop: Space.xxl }} />
      </ScrollView>

      <OptionSheet
        visible={showThemePicker}
        title={t("theme")}
        value={theme}
        options={[
          { value: "light", label: "Light", icon: "sunny-outline" },
          { value: "dark", label: "Dark", icon: "moon-outline" },
        ]}
        onSelect={(v) => updateSetting("theme", v)}
        onClose={() => setShowThemePicker(false)}
      />

      <OptionSheet
        visible={showLangPicker}
        title={t("language")}
        value={(settings.language as LanguageCode) || "en"}
        options={Object.entries(LANGUAGES).map(([key, v]) => ({ value: key as LanguageCode, label: v.name }))}
        onSelect={(v) => updateSetting("language", v)}
        onClose={() => setShowLangPicker(false)}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Space.lg, paddingBottom: 120 },
  profile: { flexDirection: "row", alignItems: "center", gap: Space.md },
  profileName: { fontSize: 17, fontWeight: "700" },
  profileSub: { fontSize: 13, marginTop: 2 },
  group: { paddingVertical: 2 },
});
