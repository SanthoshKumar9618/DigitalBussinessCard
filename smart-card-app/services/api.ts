import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://digitalbussinesscard-backend.onrender.com";

// Where shared links / QR codes point. Defaults to the backend's public
// profile page; set EXPO_PUBLIC_PROFILE_BASE_URL to your web app's domain.
export const PROFILE_BASE_URL =
  process.env.EXPO_PUBLIC_PROFILE_BASE_URL || `${BASE_URL}/public/view`;

export const publicProfileUrl = (slug?: string | null) =>
  `${PROFILE_BASE_URL}/${slug ?? ""}`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Let axios set multipart boundaries for file uploads.
  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("access_token");
    }

    if (__DEV__) {
      console.log("API ERROR:", error.response?.data || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;