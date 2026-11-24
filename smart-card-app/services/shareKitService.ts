import api from "./api";

export type ShareKit = {
  slug: string;
  profile_url: string;
  signature_url: string;
  qr_png_url: string;
  vcard_url: string;
  wallet: { apple_url: string | null; google_url: string | null };
};

export type ProfileLink = { id: string; label: string; url: string; position: number };

export const getShareKit = async (): Promise<ShareKit> => (await api.get("/profile/share-kit")).data;

export const checkSlug = async (slug: string): Promise<{ available: boolean; reason: string | null; url: string }> =>
  (await api.get("/profile/slug/check", { params: { slug } })).data;

export const changeSlug = async (slug: string) => (await api.put("/profile/slug", { slug })).data;

export const getLinks = async (): Promise<ProfileLink[]> => (await api.get("/profile/links")).data;

export const addLink = async (label: string, url: string): Promise<ProfileLink> =>
  (await api.post("/profile/links", { label, url })).data;

export const deleteLink = (id: string) => api.delete(`/profile/links/${id}`);

export const reorderLinks = async (ids: string[]): Promise<ProfileLink[]> =>
  (await api.put("/profile/links/order", { ids })).data;

/** Pull a readable message out of a FastAPI error (string or validation list). */
export function apiError(e: any, fallback: string) {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg).replace(/^Value error, /, "");
  return fallback;
}
