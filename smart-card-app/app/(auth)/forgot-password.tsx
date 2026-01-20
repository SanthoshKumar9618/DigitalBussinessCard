import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { forgotPassword } from "../../services/authService";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert("Error", "Email is required");
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(email);

      Alert.alert("OTP Sent", "Check your email for the OTP");
      router.push({
              pathname: "/reset-password",
              params: { identifier: email },
       });

    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your registered email to receive an OTP.
        </Text>

        <TextInput
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSendOtp}
          disabled={loading}
        >
          <Text style={styles.primaryText}>
            {loading ? "Sending..." : "Send OTP"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => router.back()}>
          Back to login
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
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: "#020617",
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 20,
    fontSize: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#020617",
  },

  primaryButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    marginTop: 6,
  },

  primaryText: {
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
});
