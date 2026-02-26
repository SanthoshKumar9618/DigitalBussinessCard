import api from "./api";

 export const getCurrentUser = async () => {
   const res = await api.get("/auth/me");
    return res.data; 
  }; 
 export function updateUser(payload: { phone?: string }) { 
  return api.put("/user", payload); 
} 
 export function sendEmailOtp(email: string) { 
  return api.post("/user/email/send-otp", { email }); 
} 
 export function verifyEmailOtp(otp: string) { 
  return api.post("/user/email/verify-otp", { otp }); 
}