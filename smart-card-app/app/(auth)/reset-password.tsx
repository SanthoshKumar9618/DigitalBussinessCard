import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { resetPassword } from "../../services/authService";
import { Ionicons } from "@expo/vector-icons";

export default function ResetPasswordScreen() {
  const { identifier } = useLocalSearchParams<{ identifier: string }>();

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleReset = async () => {
    if (!otp || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await resetPassword(identifier!, otp, password);

      Alert.alert("Success", "Password reset successfully");
      router.replace("/login");

    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "Reset failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter OTP and set a new password.
        </Text>

        <TextInput
          placeholder="OTP"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          style={styles.input}
        />

        <View style={styles.passwordWrapper}>
  <TextInput
    placeholder="New password"
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


        <View style={styles.passwordWrapper}>
  <TextInput
    placeholder="Confirm password"
    secureTextEntry={!showConfirmPassword}
    value={confirmPassword}
    onChangeText={setConfirmPassword}
    style={styles.passwordInput}
  />

  <TouchableOpacity
    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
    style={styles.eyeButton}
    activeOpacity={0.7}
  >
    <Ionicons
      name={showConfirmPassword ? "eye-off" : "eye"}
      size={22}
      color="#64748B"
    />
  </TouchableOpacity>
</View>


        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.primaryText}>
            {loading ? "Resetting..." : "Reset Password"}
          </Text>
        </TouchableOpacity>
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
