import axios from "axios";
import { resolveBackendUrls } from "../../config/backend-urls.mjs";

const api = axios.create({ timeout: 15000 });
const backendUrls = resolveBackendUrls({
  userUrl: process.env.NEXT_PUBLIC_USER_BACKEND_URL,
  chatUrl: process.env.NEXT_PUBLIC_CHAT_BACKEND_URL,
  production: process.env.NODE_ENV !== "development",
});
export const user_service = backendUrls.user;
export const chat_service = backendUrls.chat;
export function errorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
    return error.response?.data?.message || "Cannot reach the server. Check that the backend is running.";
  }
  return "Something went wrong. Please try again.";
}
export default api;

