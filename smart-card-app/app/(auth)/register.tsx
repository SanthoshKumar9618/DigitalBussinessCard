import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView,Platform } from "react-native";
import { useState } from "react";
import { registerUser } from "../../services/authService";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext"; // ADD
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { login } = useAuth(); // ADD
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
 


 const handleRegister = async () => {
  if (!name || !email || !phone || !password || !confirmPassword) {
    alert("All fields are required");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      confirm_password: confirmPassword,
    };

    const data = await registerUser(payload);
     router.push({
     pathname: "/verify-email",
     params: { userId: data.user_id }
    });
await login(data.access_token);

// 🔑 FORCE INDEX.TSX TO MOUNT
router.replace("/");

  } catch (err: any) {
    alert("Registration failed");
  }
};

  return (
    <KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
>
  <ScrollView
    contentContainerStyle={styles.container}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.card}>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Your digital business card</Text>

        <TextInput
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
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


        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => router.back()}>
          Already have an account?
        </Text>
      </View>
    
  </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#16A34A",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "600",
  },
  link: {
    marginTop: 15,
    textAlign: "center",
    color: "#2563EB",
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
