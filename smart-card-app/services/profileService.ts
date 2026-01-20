import api from "./api";

/**
 * GET my profile
 */
export const getMyProfile = async () => {
  const res = await api.get("/profile/me");
  return res.data;
};

/**
 * CREATE profile (first time)
 */
export type ProfileCreatePayload = {
  display_name: string;
  job_title?: string;
  company?: string;
  bio?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  whatsapp?: string;
  
  card_color?: string;
  card_template?: string;
};

export const createProfile = async (payload: ProfileCreatePayload) => {
  const res = await api.post("/profile/", payload);
  return res.data;
};


/**
 * UPDATE profile
 */
export type ProfileUpdatePayload = {
  display_name?: string;
  job_title?: string;
  company?: string;
  bio?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  whatsapp?: string;

   card_color?: string;
  card_template?: string;
};

export const updateProfile = async (payload: ProfileUpdatePayload) => {
  const res = await api.put("/profile/", payload);
  return res.data;
};


/**
 * DELETE profile
 */
export const deleteProfile = async () => {
  const res = await api.delete("/profile/");
  return res.data;
};
