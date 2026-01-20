import api from "./api";

export const login = async (identifier: string, password: string) => {
  const res = await api.post("/auth/login", {
    identifier,
    password,
  });
  return res.data;
};

export const registerUser = async (payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
}) => {
  const res = await api.post("/auth/register", payload);
  return res.data;
};

// ✅ Backend logout ONLY
export const logout = async () => {
  return api.post("/auth/logout");
};


// --------------------
// FORGOT PASSWORD
// --------------------
export async function forgotPassword(identifier: string) {
  const res = await api.post("/auth/forgot-password", {
    identifier,
  });
  return res.data;
}

// --------------------
// RESET PASSWORD
// --------------------
export async function resetPassword(
  identifier: string,
  otp: string,
  password: string
) {
  return api.post("/auth/reset-password", {
    identifier,
    otp,
    password,
    confirm_password: password,
  });
}
