import api from "./api";

type CategorySearchParams = {
  name?: string;
  company?: string;
  job?: string;
  tag?: string;
};

export const searchCategories = async (params: CategorySearchParams) => {
  const query = new URLSearchParams(params as any).toString();
  const res = await api.get(`/categories/search?${query}`);
  return res.data;
};
