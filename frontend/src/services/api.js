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

api.interceptors.request.use(
  (config) => {
    // Only attach local token if Authorization header was not explicitly provided
    if (!config.headers["Authorization"] && !config.headers["authorization"]) {
      const localToken = localStorage.getItem("doctorToken_v1") || localStorage.getItem("token");
      if (localToken) {
        config.headers["Authorization"] = `Bearer ${localToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
