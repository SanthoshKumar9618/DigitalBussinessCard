import api from "./api";

export type ScannedCard = {
  name: string;
  job_title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  address: string;
  notes: string;
  other_emails: string[];
  other_phones: string[];
  confidence: "high" | "medium" | "low";
};

export type ManualContact = {
  name: string;
  job_title?: string;
  company?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  linkedin?: string;
  address?: string;
  notes?: string;
  tag?: string;
  met_at?: string;
  source?: "scan" | "lead" | "manual";
};

export type Channel = "email" | "whatsapp" | "linkedin";
export type Draft = { subject: string; message: string };
export type Reminders = { overdue: any[]; today: any[]; upcoming: any[] };

export const getAiStatus = async (): Promise<{ scan_card: boolean; follow_up_drafts: boolean }> =>
  (await api.get("/ai/status")).data;

/** Send a card photo to be read. Nothing is saved until the user confirms. */
export async function scanCard(uri: string): Promise<ScannedCard> {
  const form = new FormData();
  form.append("file", { uri, name: "card.jpg", type: "image/jpeg" } as any);
  const res = await api.post("/ai/scan-card", form, { timeout: 90000 });
  return res.data;
}

export const saveManualContact = async (data: ManualContact) => (await api.post("/contacts/manual", data)).data;

export const draftFollowUp = async (
  contactId: string,
  body: { channel: Channel; tone?: "friendly" | "formal" | "brief"; goal?: string }
): Promise<Draft> => (await api.post(`/contacts/${contactId}/follow-up-draft`, body, { timeout: 90000 })).data;

export const getReminders = async (): Promise<Reminders> =>
  // Minutes east of UTC so "today" means the user's today.
  (await api.get("/contacts/reminders", { params: { tz_offset: -new Date().getTimezoneOffset() } })).data;

/** ISO time for "in N days at 9:00 local". */
export function reminderIn(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}
