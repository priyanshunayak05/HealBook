const express = require("express");
const {
  getAdminDashboardStats,
  getAdminAnalytics,
  getActivityLogs,
  bulkDeleteDoctors,
  bulkUpdateDoctors,
  getAdminNotifications,
  markAdminNotificationsRead,
  getPatientsList,
} = require("../controllers/adminController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// General admin endpoints
router.get("/dashboard", authenticate, authorize("admin", "superadmin"), getAdminDashboardStats);
router.get("/analytics", authenticate, authorize("admin", "superadmin"), getAdminAnalytics);
router.get("/notifications", authenticate, authorize("admin", "superadmin"), getAdminNotifications);
router.post("/notifications/read", authenticate, authorize("admin", "superadmin"), markAdminNotificationsRead);
router.post("/doctors/bulk-update", authenticate, authorize("admin", "superadmin"), bulkUpdateDoctors);
router.get("/patients", authenticate, authorize("admin", "superadmin"), getPatientsList);

// Elevated Super Admin only endpoints
router.get("/activity", authenticate, authorize("superadmin"), getActivityLogs);
router.post("/doctors/bulk-delete", authenticate, authorize("superadmin"), bulkDeleteDoctors);

module.exports = router;
