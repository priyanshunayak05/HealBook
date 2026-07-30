import api from "./api";

export const authApi = {
  login: async (email, password, role) => {
    const res = await api.post("/api/auth/login", { email, password, role });
    return res.data;
  },
  registerPatient: async (patientData) => {
    const res = await api.post("/api/auth/register", { ...patientData, role: "patient" });
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await api.get("/api/auth/me");
    return res.data;
  }
};
