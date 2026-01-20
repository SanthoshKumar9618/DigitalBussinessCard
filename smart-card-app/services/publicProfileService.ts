import api from "./api";

export const getPublicProfile = async (slug: string) => {
  const res = await api.get(`/public/${slug}`);
  return res.data;
};

export const trackProfileView = async (slug: string) => {
  await api.get(`/public/view/${slug}`);
};
