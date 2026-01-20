import api from "./api";

export async function getProfileCard() {
  const res = await api.get("/profile-card/card");
  return res.data;
}

export async function saveProfileCard(card: any) {
  return api.put("/profile-card/card", card);
}

