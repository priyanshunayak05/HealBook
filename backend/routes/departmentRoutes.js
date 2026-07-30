const express = require("express");
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/multer");

const router = express.Router();

router.get("/", getDepartments);
router.get("/:id", getDepartmentById);

router.post("/", authenticate, authorize("admin", "superadmin"), upload.single("image"), createDepartment);
router.put("/:id", authenticate, authorize("admin", "superadmin"), upload.single("image"), updateDepartment);
router.delete("/:id", authenticate, authorize("admin", "superadmin"), deleteDepartment);

module.exports = router;
