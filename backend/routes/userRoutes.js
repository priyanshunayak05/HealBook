const express = require("express");
const { syncUser, deleteAccount } = require("../controllers/userController");
const clerkAuth = require("../middleware/clerkAuth");

const router = express.Router();

router.post("/sync", syncUser);
router.delete("/account", clerkAuth, deleteAccount);

module.exports = router;
