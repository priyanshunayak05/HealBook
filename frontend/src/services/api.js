import axios from "axios";

const API_BASE = "http://localhost:4000";

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
