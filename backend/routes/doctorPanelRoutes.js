const express = require("express");
const {
  getDoctorDashboardStats,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorAppointments,
  updateDoctorAppointment,
} = require("../controllers/doctorPanelController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/multer");

const router = express.Router();

router.get("/dashboard", authenticate, authorize("doctor"), getDoctorDashboardStats);
router.get("/profile", authenticate, authorize("doctor"), getDoctorProfile);
router.put("/profile", authenticate, authorize("doctor"), upload.single("image"), updateDoctorProfile);
router.get("/appointments", authenticate, authorize("doctor"), getDoctorAppointments);
router.put("/appointments/:id", authenticate, authorize("doctor"), updateDoctorAppointment);

module.exports = router;
