import { useRef, useState } from "react";
import { TextInputInstance } from "react-native";
import { router } from "expo-router";
import { registerUser } from "../../services/authService";
import AuthLayout, { AuthLink, FormError } from "@/components/ui/AuthLayout";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";

type Field = "name" | "email" | "phone" | "password" | "confirm";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const emailRef = useRef<TextInputInstance>(null);
  const phoneRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  const clear = (f: Field) => {
    setErrors((e) => ({ ...e, [f]: undefined }));
    setFormError(null);
  };

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    if (!name.trim()) e.name = "Enter your name";
    if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email";
    if (phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number";
    if (password.length < 8) e.password = "Use at least 8 characters";
    if (confirmPassword !== password) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      setFormError(null);
      const data = await registerUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        confirm_password: confirmPassword,
      });
      // No token yet: the user signs in by verifying the emailed code.
      router.push({ pathname: "/verify-email", params: { userId: data.user_id, email: email.trim() } });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setFormError(
        typeof detail === "string"
          ? detail
          : err?.message === "Network Error"
            ? "Can't reach the server. Check your connection and try again."
            : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your card"
      subtitle="Set up your digital business card in a minute"
      onBack={() => router.back()}
      footer={<AuthLink text="Already have an account?" action="Sign in" onPress={() => router.back()} />}
    >
      <TextField
        label="Full name"
        icon="person-outline"
        placeholder="Priya Sharma"
        value={name}
        onChangeText={(v) => {
          setName(v);
          clear("name");
        }}
        error={errors.name}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Email"
        icon="mail-outline"
        placeholder="you@company.com"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clear("email");
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <TextField
        ref={phoneRef}
        label="Phone"
        icon="call-outline"
        placeholder="+91 98765 43210"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          clear("phone");
        }}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        icon="lock-closed-outline"
        placeholder="At least 8 characters"
        password
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          clear("password");
        }}
        error={errors.password}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Confirm password"
        icon="lock-closed-outline"
        placeholder="Type it again"
        password
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          clear("confirm");
        }}
        error={errors.confirm}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleRegister}
      />

      <FormError message={formError} />
      <Button title="Create account" onPress={handleRegister} loading={loading} style={{ marginTop: 4 }} />
    </AuthLayout>
  );
}
