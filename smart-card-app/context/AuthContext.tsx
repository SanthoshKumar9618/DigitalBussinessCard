import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logout } from "../services/authService";

type AuthContextType = {
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Load token on app start
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem("access_token");
      if (storedToken) setToken(storedToken);
      setLoading(false);
    };
    loadToken();
  }, []);

  // ✅ LOGIN
  const login = async (newToken: string) => {
    await AsyncStorage.setItem("access_token", newToken);
    setToken(newToken);
  };

  // ✅ LOGOUT (WITH BACKEND CALL – THIS IS WHAT YOU WANT)
  const logout = async () => {
    try {
      await logout(); // optional backend invalidation
    } catch (e) {
      // backend token may already be expired – ignore
    } finally {
      await AsyncStorage.removeItem("access_token");
      setToken(null); // 🔥 THIS TRIGGERS NAVIGATION
    }
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
