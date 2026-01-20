import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_PORT = "8000";
const USING_PHYSICAL_DEVICE = true; 
const MY_LAPTOP_IP = "192.168.68.113";

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
