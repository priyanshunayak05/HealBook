import api from "./api";

export const serviceApi = {
  getAll: async () => {
    const res = await api.get("/api/services");
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/api/services/${id}`);
    return res.data;
  },
  createBooking: async (bookingData, token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await api.post("/api/service-appointments", bookingData, { headers });
    return res.data;
  }
};
