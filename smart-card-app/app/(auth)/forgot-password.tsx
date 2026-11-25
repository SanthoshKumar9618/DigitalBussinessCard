import { useState } from "react";
import { router } from "expo-router";
import { forgotPassword } from "../../services/authService";
import AuthLayout, { AuthLink, FormError } from "@/components/ui/AuthLayout";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError("Enter the email you signed up with");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await forgotPassword(email.trim());
      router.push({ pathname: "/reset-password", params: { identifier: email.trim() } });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Couldn't send the code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon="key-outline"
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a code to reset it"
      onBack={() => router.back()}
      footer={<AuthLink text="Remembered it?" action="Back to sign in" onPress={() => router.back()} />}
    >
      <TextField
        label="Email"
        icon="mail-outline"
        placeholder="you@company.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setError(null);
        }}
        returnKeyType="send"
        onSubmitEditing={handleSendOtp}
      />
      <FormError message={error} />
      <Button title="Send reset code" onPress={handleSendOtp} loading={loading} />
    </AuthLayout>
  );
}
