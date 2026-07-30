const express = require("express");
const {
  getAppointments,
  getAppointmentsByDoctor,
  createAppointment,
  confirmPayment,
  updateAppointment,
  getStats,
  getAppointmentsByPatient,
} = require("../controllers/appointmentController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", protect, getAppointments);
router.get("/me", protect, getAppointments);
router.get("/patient/:patientId", protect, getAppointmentsByPatient);
router.get("/doctor", protect, authorize("doctor", "admin"), getAppointmentsByDoctor);
router.get("/doctor/:id", getAppointmentsByDoctor);
router.post("/", protect, createAppointment);
router.post("/confirm-payment", confirmPayment);
router.post("/:id/cancel", protect, (req, res, next) => {
  req.body = { status: "Canceled" };
  updateAppointment(req, res, next);
});
router.put("/:id", protect, updateAppointment);
router.put("/:id/status", protect, updateAppointment);
router.put("/status/:id", protect, updateAppointment);
router.put("/reschedule/:id", protect, updateAppointment);
router.get("/admin/stats", protect, authorize("admin"), getStats);

module.exports = router;
