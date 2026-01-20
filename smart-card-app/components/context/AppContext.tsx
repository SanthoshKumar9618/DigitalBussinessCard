import { createContext, useContext, useEffect, useState } from "react";
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
  text: "#FFFFFF",
  subText: "#9CA3AF",
  border: "#1F2937",
  primary: "#C9A24D",
};

const LightColors = {
  bg: "#FFFFFF",
  card: "#F3F4F6",
  text: "#111827",
  subText: "#6B7280",
  border: "#E5E7EB",
  primary: "#C9A24D",
};

/* ---------------- CONTEXT ---------------- */

const AppContext = createContext<AppContextType | null>(null);

/* ---------------- PROVIDER ---------------- */

export function AppProvider({ children }: { children: React.ReactNode }) {
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
    } catch {
      console.log("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

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
