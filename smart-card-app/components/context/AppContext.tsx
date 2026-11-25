import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSettings, updateSettings } from "../../services/settingsService";
import { LANGUAGES, LanguageCode, TranslationKey } from "../../constants/i18n";


/* ---------------- TYPES ---------------- */

export type AppSettings = {
  public_profile: boolean;
  show_phone: boolean;
  show_email: boolean;
  watermark_enabled: boolean;
  nfc_enabled: boolean;
  theme: "dark" | "light";
  card_template: string;
  default_share_type: string;
  language: string;
};

type AppContextType = {
  settings: AppSettings | null;
  loading: boolean;
  updateSetting: (key: keyof AppSettings, value: any) => Promise<void>;
  refreshSettings: () => Promise<void>;
  theme: "dark" | "light";
  colors: typeof DarkColors;

  t: (key: TranslationKey) => string; // ✅ ADD THIS

  openEditProfile: boolean;
  setOpenEditProfile: (v: boolean) => void;
};


/* ---------------- THEMES ---------------- */

const DarkColors = {
  bg: "#0B0B0B",
  card: "#111827",
  elevated: "#1A2230",
  text: "#FFFFFF",
  subText: "#9CA3AF",
  border: "#1F2937",
  primary: "#C9A24D",
  primarySoft: "rgba(201,162,77,0.14)",
  onPrimary: "#0B0B0B",
  success: "#22C55E",
  danger: "#EF4444",
};

const LightColors: typeof DarkColors = {
  bg: "#FFFFFF",
  card: "#F3F4F6",
  elevated: "#FFFFFF",
  text: "#111827",
  subText: "#6B7280",
  border: "#E5E7EB",
  primary: "#B08A35",
  primarySoft: "rgba(176,138,53,0.12)",
  onPrimary: "#FFFFFF",
  success: "#16A34A",
  danger: "#DC2626",
};

/* ---------------- CONTEXT ---------------- */

const AppContext = createContext<AppContextType | null>(null);

/* ---------------- PROVIDER ---------------- */

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ MOVE HOOK HERE
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const language: LanguageCode =
  (settings?.language as LanguageCode) || "en";


  const refreshSettings = async () => {
  try {
    const data = await getSettings();

    setSettings(data);

  } catch (e: any) {
    console.log("SETTINGS ERROR STATUS =", e.response?.status);
    console.log("SETTINGS ERROR BODY =", e.response?.data);
    console.log("SETTINGS ERROR =", e.message);
  } finally {
    console.log("SETTINGS LOADING FINISHED");
    setLoading(false);
  }
};

  // Load settings for whoever is signed in; clear them on logout.
  useEffect(() => {
    if (!token) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refreshSettings().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    if (!settings) return;

    const previous = { ...settings };
    setSettings({ ...settings, [key]: value });

    try {
      await updateSettings({ [key]: value });
    } catch {
      setSettings(previous);
    }
  };

 const t = (key: TranslationKey): string => {
  return LANGUAGES[language][key] ?? LANGUAGES.en[key];
};


  const theme = settings?.theme || "dark";
  const colors = theme === "dark" ? DarkColors : LightColors;

  return (
    <AppContext.Provider
  value={{
    settings,
    loading,
    updateSetting,
    refreshSettings,
    theme,
    colors,
    t, // 👈 ADD
    openEditProfile,
    setOpenEditProfile,
  }}
>

      {children}
    </AppContext.Provider>
  );
}

/* ---------------- HOOK ---------------- */

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return ctx;
}
