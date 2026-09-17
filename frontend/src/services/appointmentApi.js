import api from "./api";

export const appointmentApi = {
  /**
   * Fetch currently available time slots for a doctor on a specific date.
   * Returns { availableSlots: string[] }
   */
  getAvailableSlots: async (doctorId, date) => {
    const res = await api.get("/api/appointments/availability", {
      params: { doctorId, date },
    });
    return res.data;
  },

  create: async (appointmentData, token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await api.post("/api/appointments", appointmentData, { headers });
    return res.data;
  },
  getByDoctor: async (doctorId) => {
    const res = await api.get(`/api/appointments/doctor/${doctorId}`);
    return res.data;
  },
  updateStatus: async (id, status) => {
    const res = await api.put(`/api/appointments/status/${id}`, { status });
    return res.data;
  },
  reschedule: async (id, date, time) => {
    const res = await api.put(`/api/appointments/reschedule/${id}`, { date, time });
    return res.data;
  }
};
