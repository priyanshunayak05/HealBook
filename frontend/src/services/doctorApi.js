import api from "./api";

export const doctorApi = {
  getAll: async (params) => {
    const res = await api.get("/api/doctors", { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/api/doctors/${id}`);
    return res.data;
  },
  updateProfile: async (id, formData) => {
    const res = await api.put(`/api/doctors/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  }
};
