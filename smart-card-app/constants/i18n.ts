export type LanguageCode = "en" | "te" | "kn" | "hi";

export type TranslationKey =
  | "settings"
  | "theme"
  | "language"
  | "enableNfc"
  | "publicProfile";

export const LANGUAGES: Record<
  LanguageCode,
  Record<TranslationKey, string> & { name: string }
> = {
  en: {
    name: "English",
    settings: "Settings",
    theme: "Theme",
    language: "Language",
    enableNfc: "Enable NFC",
    publicProfile: "Public Profile",
  },
  te: {
    name: "తెలుగు",
    settings: "సెట్టింగ్స్",
    theme: "థీమ్",
    language: "భాష",
    enableNfc: "ఎన్‌ఎఫ్‌సీ ప్రారంభించు",
    publicProfile: "పబ్లిక్ ప్రొఫైల్",
  },
  kn: {
    name: "ಕನ್ನಡ",
    settings: "ಸೆಟ್ಟಿಂಗ್ಗಳು",
    theme: "ಥೀಮ್",
    language: "ಭಾಷೆ",
    enableNfc: "ಎನ್‌ಎಫ್‌ಸಿ ಸಕ್ರಿಯಗೊಳಿಸಿ",
    publicProfile: "ಸಾರ್ವಜನಿಕ ಪ್ರೊಫೈಲ್",
  },
  hi: {
    name: "हिंदी",
    settings: "सेटिंग्स",
    theme: "थीम",
    language: "भाषा",
    enableNfc: "एनएफसी सक्षम करें",
    publicProfile: "पब्लिक प्रोफ़ाइल",
  },
};
