const express = require("express");
const {
  createMedicalRecord,
  getPatientMedicalHistory,
  getPatientPrescriptions,
} = require("../controllers/medicalRecordController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticate, authorize("doctor", "admin"), createMedicalRecord);
router.get("/", authenticate, getPatientMedicalHistory);
router.get("/patient/:patientId/history", authenticate, getPatientMedicalHistory);
router.get("/patient/:patientId", authenticate, getPatientMedicalHistory);
router.get("/prescriptions/patient/:patientId", authenticate, getPatientPrescriptions);

module.exports = router;
