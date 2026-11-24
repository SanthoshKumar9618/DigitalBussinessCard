import api from "./api";

export type WebhookInfo = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  last_status?: string | null;
  last_delivery_at?: string | null;
  failure_count: number;
  secret?: string; // only returned once, when created
};

export type Integrations = {
  event_types: string[];
  webhooks_allowed: boolean;
  crm_allowed: boolean;
  webhooks: WebhookInfo[];
  hubspot: {
    connected: boolean;
    auto_sync: boolean | null;
    last_sync_at: string | null;
    last_sync_count: number | null;
    last_error: string | null;
  };
};

export type Plan = {
  plan: { key: string; name: string; max_cards: number; max_links: number; insights_days: number; webhooks: boolean; crm_sync: boolean; teams: boolean };
  usage: { cards: number };
  billing_enabled: boolean;
};

export const getIntegrations = async (): Promise<Integrations> => (await api.get("/integrations")).data;
export const addWebhook = async (url: string, events: string[]): Promise<WebhookInfo> =>
  (await api.post("/integrations/webhooks", { url, events })).data;
export const toggleWebhook = (id: string, active: boolean) => api.patch(`/integrations/webhooks/${id}`, { active });
export const deleteWebhook = (id: string) => api.delete(`/integrations/webhooks/${id}`);
export const testWebhook = async (id: string): Promise<{ ok: boolean; status: string }> =>
  (await api.post(`/integrations/webhooks/${id}/test`)).data;
export const connectHubSpot = (access_token: string, auto_sync = true) =>
  api.put("/integrations/hubspot", { access_token, auto_sync });
export const setHubSpotAutoSync = (auto_sync: boolean) => api.patch("/integrations/hubspot", { auto_sync });
export const disconnectHubSpot = () => api.delete("/integrations/hubspot");
export const syncHubSpot = async (): Promise<{ queued: number; skipped_without_email: number }> =>
  (await api.post("/integrations/hubspot/sync")).data;
export const getPlan = async (): Promise<Plan> => (await api.get("/user/plan")).data;
