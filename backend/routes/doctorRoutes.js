const express = require("express");
const { getDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor } = require("../controllers/doctorController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const upload = require("../middleware/multer");

const router = express.Router();

router.get("/", getDoctors);
router.get("/:id", getDoctorById);
router.post("/", protect, authorize("admin"), upload.single("image"), createDoctor);
router.put("/:id", protect, upload.single("image"), updateDoctor);
router.delete("/:id", protect, authorize("admin"), deleteDoctor);

module.exports = router;
