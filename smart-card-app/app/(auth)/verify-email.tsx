import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "@/components/context/AppContext";
import AuthLayout, { AuthLink, FormError } from "@/components/ui/AuthLayout";
import Button from "@/components/ui/Button";
import CodeInput from "@/components/ui/CodeInput";

const RESEND_SECONDS = 30;

export default function VerifyEmail() {
  const { userId, email } = useLocalSearchParams<{ userId: string; email?: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const { login } = useAuth();
  const { colors } = useApp();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async (code = otp) => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.post("/auth/verify-email", { user_id: userId, otp: code });
      await login(res.data.access_token);
      router.replace("/profile/ProfileSetup");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "That code is wrong or has expired");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setError(null);
      await api.post("/auth/resend-email-otp", { user_id: userId });
      setNotice("A new code is on its way.");
      setCooldown(RESEND_SECONDS);
    } catch {
      setError("Couldn't resend the code. Try again in a moment.");
    }
  };

  return (
    <AuthLayout
      icon="mail-open-outline"
      title="Check your email"
      subtitle={
        email
          ? `Enter the 6-digit code we sent to ${email}`
          : "Enter the 6-digit code we sent to your email"
      }
      onBack={() => router.back()}
      footer={
        cooldown > 0 ? (
          <Text style={{ color: colors.subText, fontSize: 14 }}>Resend code in {cooldown}s</Text>
        ) : (
          <AuthLink text="Didn't get it?" action="Resend code" onPress={handleResend} />
        )
      }
    >
      <CodeInput
        value={otp}
        onChange={(v) => {
          setOtp(v);
          setError(null);
        }}
        onComplete={(v) => handleVerify(v)}
        error={!!error}
      />
      <View style={{ height: 20 }} />
      {notice && !error ? (
        <Text style={{ color: colors.success, textAlign: "center", marginBottom: 12 }}>{notice}</Text>
      ) : null}
      <FormError message={error} />
      <Button title="Verify" onPress={() => handleVerify()} loading={loading} disabled={otp.length !== 6} />
    </AuthLayout>
  );
}
