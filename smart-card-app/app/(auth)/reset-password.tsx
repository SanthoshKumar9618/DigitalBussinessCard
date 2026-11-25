import { useRef, useState } from "react";
import { Alert, TextInputInstance, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { resetPassword } from "../../services/authService";
import AuthLayout, { FormError } from "@/components/ui/AuthLayout";
import Button from "@/components/ui/Button";
import CodeInput from "@/components/ui/CodeInput";
import TextField from "@/components/ui/TextField";

export default function ResetPasswordScreen() {
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  const handleReset = async () => {
    if (otp.length !== 6) return setError("Enter the 6-digit code from your email");
    if (password.length < 8) return setError("Use at least 8 characters for the new password");
    if (password !== confirmPassword) return setError("Passwords don't match");

    try {
      setLoading(true);
      setError(null);
      await resetPassword(identifier!, otp, password);
      Alert.alert("Password updated", "Sign in with your new password.");
      router.replace("/login");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Reset failed. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon="shield-checkmark-outline"
      title="Set a new password"
      subtitle={identifier ? `Enter the code sent to ${identifier}` : "Enter the code from your email"}
      onBack={() => router.back()}
    >
      <CodeInput
        value={otp}
        onChange={(v) => {
          setOtp(v);
          setError(null);
        }}
      />
      <View style={{ height: 20 }} />
      <TextField
        label="New password"
        icon="lock-closed-outline"
        placeholder="At least 8 characters"
        password
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(null);
        }}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Confirm new password"
        icon="lock-closed-outline"
        placeholder="Type it again"
        password
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          setError(null);
        }}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleReset}
      />
      <FormError message={error} />
      <Button title="Update password" onPress={handleReset} loading={loading} />
    </AuthLayout>
  );
}
