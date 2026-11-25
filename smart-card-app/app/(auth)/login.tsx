import { useEffect, useRef, useState } from "react";
import { Platform, TextInputInstance, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import api from "@/services/api";
import { useAuth } from "../../context/AuthContext";
import AuthLayout, { AuthDivider, AuthLink, FormError } from "@/components/ui/AuthLayout";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import { useApp } from "@/components/context/AppContext";

// Finish Google auth redirects that land back in the app.
WebBrowser.maybeCompleteAuthSession();

const apiError = (err: any, fallback: string) =>
  err?.response?.data?.detail && typeof err.response.data.detail === "string"
    ? err.response.data.detail
    : err?.message === "Network Error"
      ? "Can't reach the server. Check your connection and try again."
      : fallback;

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const { login } = useAuth();
  const { colors } = useApp();
  const router = useRouter();

  // Replace with real client IDs from Google Cloud Console.
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
    webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
    scopes: ["profile", "email"],
  });

  const handleSocialLogin = async (provider: "google" | "apple", token: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post("/auth/social-login", { provider, token });
      await login(res.data.access_token);
      router.replace("/");
    } catch (err: any) {
      setError(apiError(err, `${provider === "google" ? "Google" : "Apple"} sign-in failed`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (response?.type === "success") {
      const token = response.authentication?.idToken || response.authentication?.accessToken;
      if (token) handleSocialLogin("google", token);
    } else if (response?.type === "error") {
      setError("Google sign-in failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      if (credential.identityToken) handleSocialLogin("apple", credential.identityToken);
      else setError("Apple didn't return a sign-in token.");
    } catch (e: any) {
      if (e.code !== "ERR_CANCELED") setError("Apple sign-in failed");
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setError("Enter your email or phone and your password.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.post("/auth/login", { identifier: identifier.trim(), password });
      await login(res.data.access_token);
      router.replace("/");
    } catch (err: any) {
      setError(apiError(err, "Sign-in failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your card and your network"
      footer={
        <AuthLink text="New to SmartCard?" action="Create an account" onPress={() => router.push("/register")} />
      }
    >
      <TextField
        label="Email or phone"
        icon="mail-outline"
        placeholder="you@company.com"
        value={identifier}
        onChangeText={(v) => {
          setIdentifier(v);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <TextField
        ref={passwordRef}
        label="Password"
        icon="lock-closed-outline"
        placeholder="Your password"
        password
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(null);
        }}
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        containerStyle={{ marginBottom: 6 }}
      />

      <View style={{ alignItems: "flex-end", marginBottom: 18 }}>
        <AuthLink action="Forgot password?" onPress={() => router.push("/forgot-password")} />
      </View>

      <FormError message={error} />

      <Button title="Sign in" onPress={handleLogin} loading={loading} />

      <AuthDivider label="or" />

      <Button
        title="Continue with Google"
        variant="secondary"
        left={<Ionicons name="logo-google" size={18} color={colors.text} />}
        onPress={() => promptAsync()}
        disabled={!request || loading}
      />

      {Platform.OS === "ios" ? (
        <Button
          title="Continue with Apple"
          variant="secondary"
          left={<Ionicons name="logo-apple" size={20} color={colors.text} />}
          onPress={handleAppleLogin}
          disabled={loading}
          style={{ marginTop: 12 }}
        />
      ) : null}
    </AuthLayout>
  );
}
