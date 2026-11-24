// Set VITE_API_BASE_URL in smartcard-web/.env (e.g. http://localhost:8000 for local dev).
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://digitalbussinesscard-backend.onrender.com";
