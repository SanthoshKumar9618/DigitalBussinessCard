import api from "./api"; 
 export function updateUser(payload: { phone?: string }) { 
  return api.put("/user", payload); 
} 
 export function sendEmailOtp(email: string) { 
  return api.post("/user/email/send-otp", { email }); 
} 
 export function verifyEmailOtp(email: string, otp: string) {
  return api.post("/user/email/verify-otp", { email, otp });
}