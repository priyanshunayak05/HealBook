const express = require("express");
const {
  createReferral,
  getPendingReferrals,
  getOutgoingReferrals,
  getIncomingReferrals,
  acceptReferral,
  rejectReferral,
  updateReferralStatus,
} = require("../controllers/referralController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticate, authorize("doctor", "admin"), createReferral);
router.post("/create", authenticate, authorize("doctor", "admin"), createReferral);

router.get("/", authenticate, authorize("doctor", "admin"), getOutgoingReferrals);
router.get("/pending", authenticate, authorize("doctor", "admin"), getPendingReferrals);
router.get("/outgoing", authenticate, authorize("doctor", "admin"), getOutgoingReferrals);
router.get("/incoming", authenticate, authorize("doctor", "admin"), getIncomingReferrals);

router.put("/:id/accept", authenticate, authorize("doctor", "admin"), acceptReferral);
router.put("/:id/reject", authenticate, authorize("doctor", "admin"), rejectReferral);
router.put("/:id/status", authenticate, authorize("doctor", "admin"), updateReferralStatus);

module.exports = router;
