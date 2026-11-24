import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import api from "./api";

export type Lead = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  note?: string | null;
  source?: string | null;
  is_read: boolean;
  created_at: string;
  card_id?: string | null;
  card_label?: string | null;
};

export type InsightsSummary = {
  days: number;
  views: number;
  vcard_saves: number;
  connections: number;
  leads: number;
  unread_leads: number;
  sources: Record<string, number>;
  daily: { date: string; views: number }[];
};

export const getLeads = async (): Promise<Lead[]> => (await api.get("/leads")).data;

export const markLeadRead = (id: string, is_read = true) =>
  api.patch(`/leads/${id}`, { is_read });

export const deleteLead = (id: string) => api.delete(`/leads/${id}`);

export const getInsights = async (days = 7): Promise<InsightsSummary> =>
  (await api.get("/analytics/summary", { params: { days } })).data;

export const updateContactNotes = (id: string, data: { notes?: string; tag?: string }) =>
  api.patch(`/contacts/${id}`, data);

/** Download a CSV from the API and open the share sheet (Drive, Mail, Sheets…). */
export async function exportCsv(kind: "contacts" | "leads") {
  const res = await api.get(`/${kind}/export.csv`, { responseType: "text" });
  const uri = `${FileSystem.cacheDirectory}smartcard-${kind}-${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(uri, String(res.data));
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: `Export ${kind}`, UTI: "public.comma-separated-values-text" });
}

/** "3m", "5h", "2d", or a date. */
export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}
