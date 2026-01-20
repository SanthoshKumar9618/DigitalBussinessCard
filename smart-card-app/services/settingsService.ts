import api from "./api";

/**
 * Get user settings
 */
export const getSettings = async () => {
  const res = await api.get("/settings/");
  return res.data;
};

/**
 * Update one or more settings
 */
export const updateSettings = async (
  payload: Partial<{
    public_profile: boolean;
    show_phone: boolean;
    show_email: boolean;
    watermark_enabled: boolean;
    nfc_enabled: boolean;
    theme: string;
    language: string;
  }>
) => {
  const res = await api.put("/settings", payload);
  return res.data;
};
