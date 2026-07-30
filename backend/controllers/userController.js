const User = require("../models/User");

// @desc    Sync Clerk User with MongoDB users collection
// @route   POST /api/user/sync
// @access  Public
const syncUser = async (req, res) => {
  try {
    let { clerkId, name, email, image } = req.body || {};

    if (!clerkId && req.user?.clerkId) {
      clerkId = req.user.clerkId;
    }

    if (process.env.CLERK_SECRET_KEY && clerkId) {
      try {
        const { createClerkClient } = require("@clerk/backend");
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUser = await clerkClient.users.getUser(clerkId);
        if (clerkUser) {
          const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
          if (clerkEmail) email = clerkEmail;
          const clerkName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
          if (clerkName) name = clerkName;
          if (clerkUser.imageUrl) image = clerkUser.imageUrl;
        }
      } catch (err) {
        console.warn("clerkClient.getUser in syncUser warning:", err?.message || err);
      }
    }

    if (!clerkId || !email) {
      return res.status(400).json({
        success: false,
        message: "clerkId and email are required to sync user",
      });
    }

    const emailLC = String(email).toLowerCase().trim();

    // Check if user exists by clerkId or email
    let user = await User.findOne({ $or: [{ clerkId }, { email: emailLC }] });

    if (!user) {
      user = await User.create({
        clerkId,
        name: name || "Patient",
        email: emailLC,
        image: image || "",
        role: "patient",
      });
      console.log(`Created new patient document in MongoDB: ${emailLC} (${clerkId})`);
    } else {
      let updated = false;
      if (user.clerkId !== clerkId) {
        user.clerkId = clerkId;
        updated = true;
      }
      if (name && user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (image && user.image !== image) {
        user.image = image;
        updated = true;
      }
      if (emailLC && user.email !== emailLC) {
        user.email = emailLC;
        updated = true;
      }
      if (updated) {
        await user.save();
        console.log(`Updated patient document in MongoDB: ${emailLC} (${clerkId})`);
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role || "patient",
      },
    });
  } catch (err) {
    console.error("syncUser error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to sync user with database",
      error: err?.message || String(err),
    });
  }
};

// @desc    Delete patient account from MongoDB and Clerk
// @route   DELETE /api/user/account
// @access  Private (Clerk Authenticated)
const deleteAccount = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId || req.auth?.userId || req.body?.clerkId || req.query?.clerkId;
    const email = req.user?.email || req.body?.email || req.query?.email;

    if (!clerkId && !email) {
      return res.status(400).json({
        success: false,
        message: "Clerk User ID or email is required to delete account",
      });
    }

    // 1. Delete patient document from MongoDB users collection
    if (clerkId) {
      await User.findOneAndDelete({ clerkId });
    }
    if (email) {
      await User.findOneAndDelete({ email: String(email).toLowerCase() });
    }
    if (req.user?._id) {
      await User.findByIdAndDelete(req.user._id);
    }

    // 2. Clean up patient doctor appointments and service appointments
    try {
      const Appointment = require("../models/Appointment");
      const ServiceAppointment = require("../models/ServiceAppointment");

      const matchQuery = [];
      if (clerkId) {
        matchQuery.push({ createdBy: clerkId }, { patientClerkId: clerkId });
      }
      if (email) {
        matchQuery.push({ email: String(email).toLowerCase() }, { userEmail: String(email).toLowerCase() });
      }

      if (matchQuery.length > 0) {
        await Appointment.deleteMany({ $or: matchQuery });
        await ServiceAppointment.deleteMany({ $or: matchQuery });
      }
    } catch (cleanErr) {
      console.warn("Appointment cleanup warning:", cleanErr.message);
    }

    // 3. Delete user from Clerk backend if CLERK_SECRET_KEY is configured
    if (clerkId && process.env.CLERK_SECRET_KEY) {
      try {
        const { createClerkClient } = require("@clerk/backend");
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        await clerkClient.users.deleteUser(clerkId);
      } catch (clerkErr) {
        console.warn("Clerk backend delete user warning:", clerkErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Account and associated data deleted successfully",
    });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
      error: err?.message || String(err),
    });
  }
};

module.exports = { syncUser, deleteAccount };
