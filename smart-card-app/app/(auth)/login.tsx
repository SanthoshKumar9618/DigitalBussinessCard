import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import api from "@/services/api";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// 1️⃣ Initialize WebBrowser for Google Auth redirects
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  // 2️⃣ STATE HOOKS
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 3️⃣ CONTEXT / ROUTER HOOKS
  const { login } = useAuth();
  const router = useRouter();

  // 4️⃣ GOOGLE AUTH CONFIGURATION
  // Ensure you replace these with your actual Client IDs from Google Cloud Console
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
    webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com", 
    scopes: ["profile", "email"],
  });

  // 5️⃣ SHARED SOCIAL LOGIN HANDLER (Defined before UseEffect)
  const handleSocialLogin = async (
    provider: "google" | "apple",
    token: string
  ) => {
    try {
      setLoading(true);
      
      // Send the token to your backend
      const res = await api.post("/auth/social-login", {
        provider,
        token,
      });

      // Login to context
      await login(res.data.access_token);
      
      // Navigate to home
      router.replace("/");
    } catch (err: any) {
      console.error("Social login error:", err);
      alert(err?.response?.data?.detail || `${provider} login failed`);
    } finally {
      setLoading(false);
    }
  };

  // 6️⃣ GOOGLE RESPONSE LISTENER
  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      // Use idToken if available (standard for backend verification), otherwise accessToken
      const token = authentication?.idToken || authentication?.accessToken;
      
      if (token) {
        handleSocialLogin("google", token);
      }
    } else if (response?.type === "error") {
      alert("Google sign-in failed. Please try again.");
    }
  }, [response]);

  // 7️⃣ APPLE LOGIN HANDLER
  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      if (credential.identityToken) {
        handleSocialLogin("apple", credential.identityToken);
      } else {
        throw new Error("No identity token received from Apple");
      }
    } catch (e: any) {
      if (e.code === 'ERR_CANCELED') {
        // User canceled, do nothing
      } else {
        alert("Apple Login failed");
        console.error(e);
      }
    }
  };

  // 8️⃣ STANDARD EMAIL LOGIN HANDLER
  const handleLogin = async () => {
    if (!identifier || !password) {
      alert("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/login", {
        identifier,
        password,
      });
      await login(res.data.access_token);
      router.replace("/");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to access your network</Text>

        {/* Google Button - Works on Android & iOS */}
        <TouchableOpacity 
          style={[styles.socialButton, styles.googleBtn]} 
          onPress={() => promptAsync()}
          disabled={!request || loading}
        >
          <View style={[styles.socialIconWrap, styles.googleIconWrap]}>
            <Ionicons name="logo-google" size={18} color="#EA4335" />
          </View>
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Apple Button - HIDDEN on Android to prevent crashes */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity 
            style={[styles.socialButton, styles.appleBtn]} 
            onPress={handleAppleLogin}
            disabled={loading}
          >
            <View style={[styles.socialIconWrap, styles.appleIconWrap]}>
              <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.appleText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.or}>OR CONTINUE WITH EMAIL</Text>

        <TextInput
          placeholder="Email or phone"
          value={identifier}
          onChangeText={setIdentifier}
          style={styles.input}
          autoCapitalize="none"
        />

        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Password" // Changed "New password" to "Password" for login
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            style={styles.passwordInput}
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#64748B"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginText}>
            {loading ? "Signing in..." : "Sign In"}
          </Text>
        </TouchableOpacity>

        <Text
          style={styles.link}
          onPress={() => router.push("/register")}
        >
          New user? Create an account
        </Text>

        <Text
          style={[styles.link, { marginTop: 8 }]}
          onPress={() => router.push("/forgot-password")}
        >
          Forgot password?
        </Text>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#020617",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 22,
    fontSize: 14,
  },
  socialButton: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative", // Ensure relative for absolute icon
    height: 50, // Fixed height ensures alignment
  },
  socialIconWrap: {
    position: "absolute",
    left: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconWrap: {
    backgroundColor: "#FFFFFF",
  },
  googleBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  googleText: {
    color: "#020617",
    fontWeight: "600",
    fontSize: 15,
  },
  appleBtn: {
    backgroundColor: "#000000", // Apple btn usually black
    borderWidth: 1,
    borderColor: "#000000",
  },
  appleIconWrap: {
    backgroundColor: "transparent", 
  },
  appleText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  or: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 12,
    marginVertical: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    color: "#020617",
    fontSize: 15,
  },
  loginBtn: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  loginText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    color: "#2563EB",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
    fontWeight: "500",
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#020617",
  },
  eyeButton: {
    paddingLeft: 8,
  },
});