import axios from "axios";
const api = axios.create({ timeout: 15000 });
export const user_service = process.env.NEXT_PUBLIC_USER_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
export const chat_service = process.env.NEXT_PUBLIC_CHAT_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
export function errorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
    return error.response?.data?.message || "Cannot reach the server. Check that the backend is running.";
  }
  return "Something went wrong. Please try again.";
}
export default api;

