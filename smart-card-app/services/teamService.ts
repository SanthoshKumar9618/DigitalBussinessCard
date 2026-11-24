import api from "./api";

export type Team = {
  id: string;
  name: string;
  plan: string;
  brand_company?: string | null;
  brand_logo_url?: string | null;
  brand_color?: string | null;
};

export type Member = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "invited";
  name?: string | null;
  job_title?: string | null;
  card_slug?: string | null;
  avatar_url?: string | null;
};

export type MyTeam =
  | { team: null; can_create: boolean; invites: { id: string; team_name: string; role: string }[] }
  | { team: Team; my_role: Member["role"]; seats: { used: number; max: number }; members: Member[] };

export type DashboardRow = Member & { views: number; leads: number; connections: number };

export const getMyTeam = async (): Promise<MyTeam> => (await api.get("/teams/me")).data;
export const createTeam = async (name: string): Promise<Team> => (await api.post("/teams", { name })).data;
export const updateTeam = async (data: Partial<Omit<Team, "id" | "plan">>): Promise<Team> =>
  (await api.patch("/teams/me", data)).data;
export const deleteTeam = () => api.delete("/teams/me");
export const leaveTeam = () => api.post("/teams/me/leave");
export const inviteMember = async (email: string, role: "member" | "admin") =>
  (await api.post("/teams/me/invites", { email, role })).data as { link: string; email: string };
export const acceptInvite = async (inviteId: string): Promise<Team> => (await api.post(`/teams/invites/${inviteId}/accept`)).data;
export const joinWithToken = async (token: string): Promise<Team> => (await api.post("/teams/join", { token })).data;
export const setRole = (memberId: string, role: "member" | "admin") => api.patch(`/teams/me/members/${memberId}`, { role });
export const removeMember = (memberId: string) => api.delete(`/teams/me/members/${memberId}`);
export const getDashboard = async (days = 30): Promise<{ days: number; totals: Record<string, number>; members: DashboardRow[] }> =>
  (await api.get("/teams/me/dashboard", { params: { days } })).data;
