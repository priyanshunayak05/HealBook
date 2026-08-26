import axios from "axios";

export const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "");
  }
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168."))
  ) {
    return "http://localhost:4000";
  }
  return "https://healbook-backend.onrender.com";
};

const API_BASE = getBackendUrl();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Store for Clerk token getter function
let clerkTokenGetter = null;

/**
 * Set the Clerk token getter function (called from components using Clerk)
 * This allows the API client to dynamically fetch fresh tokens for each request
 */
export const setClerkTokenGetter = (tokenGetter) => {
  clerkTokenGetter = tokenGetter;
};

api.interceptors.request.use(
  async (config) => {
    // Only attach token if Authorization header was not explicitly provided
    if (!config.headers["Authorization"] && !config.headers["authorization"]) {
      let token = null;

      // Try to get Clerk token first (for authenticated Clerk users)
      if (clerkTokenGetter) {
        try {
          token = await clerkTokenGetter();
        } catch (err) {
          console.warn("Failed to get Clerk token:", err?.message);
        }
      }

      // Fallback to legacy tokens in localStorage
      if (!token) {
        token = localStorage.getItem("doctorToken_v1") || localStorage.getItem("token");
      }

      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
