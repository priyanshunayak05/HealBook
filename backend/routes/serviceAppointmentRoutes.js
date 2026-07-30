const express = require("express");
const {
  createServiceAppointment,
  confirmServicePayment,
  getServiceAppointments,
  updateServiceAppointment,
  cancelServiceAppointment,
  getServiceAppointmentStats,
  getServiceAppointmentsByPatient,
} = require("../controllers/serviceAppointmentController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", protect, getServiceAppointments);
router.get("/me", protect, getServiceAppointments);
router.get("/patient/:patientId", protect, getServiceAppointmentsByPatient);
router.post("/", protect, createServiceAppointment);
router.post("/confirm-payment", confirmServicePayment);
router.put("/:id", protect, updateServiceAppointment);
router.delete("/:id", protect, cancelServiceAppointment);
router.post("/:id/cancel", protect, cancelServiceAppointment);
router.get("/stats/summary", protect, authorize("admin"), getServiceAppointmentStats);

module.exports = router;
