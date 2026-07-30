const express = require("express");
const { getServices, getServiceById, createService, updateService, deleteService } = require("../controllers/serviceController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const upload = require("../middleware/multer");

const router = express.Router();

router.get("/", getServices);
router.get("/:id", getServiceById);
router.post("/", protect, authorize("admin"), upload.single("image"), createService);
router.put("/:id", protect, authorize("admin"), upload.single("image"), updateService);
router.delete("/:id", protect, authorize("admin"), deleteService);

module.exports = router;
