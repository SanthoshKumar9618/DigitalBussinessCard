export const Colors = {
  bg: "#020617",
  card: "#0F172A",
  border: "#1E293B",

  textPrimary: "#FFFFFF",
  textSecondary: "#94A3B8",

  accent: "#2563EB",     // Primary blue
  whatsapp: "#22C55E",   // WhatsApp green
  danger: "#DC2626",
};

export const Spacing = {
  sm: 8,
  md: 16,
  lg: 24,
};

export const Fonts = {
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  body: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
};
