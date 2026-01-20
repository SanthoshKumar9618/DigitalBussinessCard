import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function VerifyEmail() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit code");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/verify-email", {
        user_id: userId,
        otp,
      });

      // 🔑 save token
      await login(res.data.access_token);

      // 🚀 go directly to profile setup
      router.replace("/profile/ProfileSetup");
    } catch (err: any) {
      Alert.alert(
        "Verification Failed",
        err?.response?.data?.detail || "Invalid or expired OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post("/auth/resend-email-otp", { user_id: userId });
      Alert.alert("OTP Sent", "A new OTP has been sent to your email");
    } catch {
      Alert.alert("Error", "Unable to resend OTP. Try again later.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Email</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to your email
      </Text>

      <TextInput
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        placeholder="••••••"
        maxLength={6}
        style={styles.input}
        textAlign="center"
      />

      <View style={styles.button}>
        <Button
          title={loading ? "Verifying..." : "Verify OTP"}
          onPress={handleVerify}
          disabled={loading}
        />
      </View>

      <View style={styles.resend}>
        <Button title="Resend OTP" onPress={handleResend} />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 8,
    marginBottom: 24,
  },
  button: {
    marginBottom: 12,
  },
  resend: {
    marginTop: 6,
  },
});
