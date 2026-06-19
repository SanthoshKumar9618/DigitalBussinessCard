// import axios from "axios";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// export const BASE_URL = "https://digitalbussinesscard-backend.onrender.com";

// const api = axios.create({
//   baseURL: BASE_URL,
//   timeout: 15000,
// });

// api.interceptors.request.use(async (config) => {
//   const token = await AsyncStorage.getItem("access_token");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// api.interceptors.response.use(
//   (res) => res,
//   async (error) => {
//     const originalRequest = error.config;

//     // 💤 Render cold start / network drop
//     if (!error.response && !originalRequest._retry) {
//       originalRequest._retry = true;

//       // wait 3 seconds and retry once
//       await new Promise((r) => setTimeout(r, 3000));
//       return api(originalRequest);
//     }

//     // 🔒 Token expired / invalid
//     if (error.response?.status === 401) {
//       await AsyncStorage.removeItem("access_token");
//       // DO NOT auto-redirect here — let UI decide
//     }

//     return Promise.reject(error);
//   }
// );

// export default api;

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL =
  "https://digitalbussinesscard-backend.onrender.com";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers["Content-Type"] = "application/json";

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("access_token");
    }

    console.log("API ERROR:", error.response?.data || error.message);

    return Promise.reject(error);
  }
);

export default api;