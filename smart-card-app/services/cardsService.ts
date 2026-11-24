import api from "./api";

export type Card = {
  id: string;
  label: string;
  is_primary: boolean;
  slug: string;
  display_name: string;
  job_title?: string | null;
  company?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  profile_url: string;
};

export const ACTIVE_CARD_KEY = "active_card_id";

export const listCards = async (): Promise<Card[]> => (await api.get("/cards")).data;

export const createCard = async (label: string, opts: { copy_from?: string; blank?: boolean } = {}): Promise<Card> =>
  (await api.post("/cards", { label, ...opts })).data;

export const updateCard = async (
  id: string,
  data: { label?: string; contact_email?: string; contact_phone?: string }
): Promise<Card> => (await api.patch(`/cards/${id}`, data)).data;

export const makePrimary = async (id: string): Promise<Card[]> => (await api.post(`/cards/${id}/primary`)).data;

export const deleteCard = (id: string) => api.delete(`/cards/${id}`);
