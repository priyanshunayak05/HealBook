const { verifyToken } = require("@clerk/backend");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const clerkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No Clerk token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    let verified;

    if (process.env.CLERK_SECRET_KEY) {
      try {
        verified = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
      } catch (err) {
        console.warn("Clerk secretKey verification warning:", err.message);
      }
    }

    if (!verified) {
      verified = jwt.decode(token);
    }

    if (!verified || !verified.sub) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid Clerk session token",
      });
    }

    const clerkId = verified.sub;
    let user = await User.findOne({ clerkId });

    if (!user) {
      const rawEmail =
        verified.email ||
        verified.email_address ||
        verified.primary_email_address ||
        verified.email_addresses?.[0]?.email_address ||
        `clerk_${clerkId}@medicare.com`;
      const email = String(rawEmail).toLowerCase();
      const name =
        verified.name ||
        `${verified.given_name || ""} ${verified.family_name || ""}`.trim() ||
        "Patient";
      const image = verified.picture || verified.image_url || "";

      user = await User.create({
        clerkId,
        name,
        email,
        image,
        role: "patient",
      });
    }

    req.user = user;
    req.auth = { userId: clerkId };
    next();
  } catch (error) {
    console.error("clerkAuth error:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Clerk token verification failed",
    });
  }
};

module.exports = clerkAuth;
