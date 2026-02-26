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

import { Platform } from "react-native";
const API_PORT = "8000";
const USING_PHYSICAL_DEVICE = true; 
const MY_LAPTOP_IP = "10.49.229.15";

export const BASE_URL = Platform.select({
  android: `http://${MY_LAPTOP_IP}:${API_PORT}`,
  ios: `http://localhost:${API_PORT}`,
  default: `http://${MY_LAPTOP_IP}:${API_PORT}`,
});

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("access_token");
    }
    return Promise.reject(error);
  }
);

export default api;
