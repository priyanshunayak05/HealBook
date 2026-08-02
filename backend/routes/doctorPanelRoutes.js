const express = require("express");
const {
  getDoctorDashboardStats,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorAppointments,
  updateDoctorAppointment,
  getDoctorPatients,
} = require("../controllers/doctorPanelController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/multer");

const {
  getPatientMedicalHistory,
} = require("../controllers/medicalRecordController");

const router = express.Router();

router.get("/dashboard", authenticate, authorize("doctor"), getDoctorDashboardStats);
router.get("/profile", authenticate, authorize("doctor"), getDoctorProfile);
router.put("/profile", authenticate, authorize("doctor"), upload.single("image"), updateDoctorProfile);
router.get("/appointments", authenticate, authorize("doctor"), getDoctorAppointments);
router.put("/appointments/:id", authenticate, authorize("doctor"), updateDoctorAppointment);
router.get("/patients", authenticate, authorize("doctor"), getDoctorPatients);
router.get("/patient/:patientId/history", authenticate, authorize("doctor", "admin"), getPatientMedicalHistory);

module.exports = router;
