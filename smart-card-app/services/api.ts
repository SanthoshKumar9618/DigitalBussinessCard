import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://digitalbussinesscard-backend.onrender.com";

// Where shared links / QR codes point. Defaults to the backend's public
// profile page; set EXPO_PUBLIC_PROFILE_BASE_URL to your web app's domain.
export const PROFILE_BASE_URL =
  process.env.EXPO_PUBLIC_PROFILE_BASE_URL || `${BASE_URL}/public/view`;

/** `src` tags where the visit came from, so Insights can show QR vs NFC vs link. */
export const publicProfileUrl = (
  slug?: string | null,
  src?: "qr" | "nfc" | "link"
) => `${PROFILE_BASE_URL}/${slug ?? ""}${src ? `?src=${src}` : ""}`;

/** Turn a stored avatar path into a loadable URL. */
export const assetUrl = (path?: string | null) =>
  !path ? null : path.startsWith("http") ? path : `${BASE_URL}${path}`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Which of the user's cards this request is about (multiple cards).
    const cardId = await AsyncStorage.getItem("active_card_id");
    if (cardId && !config.headers["X-Card-Id"]) {
      config.headers["X-Card-Id"] = cardId;
    }
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
    // The remembered card was deleted elsewhere: fall back to the primary card.
    if (error.response?.status === 404 && error.response?.data?.detail === "Card not found") {
      await AsyncStorage.removeItem("active_card_id");
    }

    if (__DEV__) {
      console.log("API ERROR:", error.response?.data || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;