const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Doctor = require("../models/Doctor");

// Helper to decode or verify Clerk tokens
const verifyClerkToken = (token) => {
  const pemKey = process.env.CLERK_PEM_PUBLIC_KEY;
  
  if (pemKey) {
    try {
      // Format PEM key correctly if it is configured as a single line
      const formattedKey = pemKey.includes("-----BEGIN PUBLIC KEY-----")
        ? pemKey
        : `-----BEGIN PUBLIC KEY-----\n${pemKey.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
        
      return jwt.verify(token, formattedKey, { algorithms: ["RS256"] });
    } catch (err) {
      console.error("Clerk Signature Verification Failed:", err.message);
      // Fallback to decode if verification fails in development mode
      if (process.env.NODE_ENV !== "production") {
        return jwt.decode(token);
      }
      throw err;
    }
  }
  
  // If no PEM key is provided, decode without signature verification (development fallback)
  return jwt.decode(token);
};

const authenticate = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // Try validating as standard local JWT first
      try {
        if (process.env.JWT_SECRET) {
          const decodedLocal = jwt.verify(token, process.env.JWT_SECRET);
          if (decodedLocal && (decodedLocal.id || decodedLocal._id)) {
            const userId = decodedLocal.id || decodedLocal._id;
            let account = await Doctor.findById(userId);
            if (!account) {
              account = await User.findById(userId);
            }
            if (!account) {
              const Admin = require("../models/Admin");
              account = await Admin.findById(userId);
            }

            if (account) {
              req.user = account;
              req.role = account.role;
              return next();
            }
          }
        }
      } catch (localErr) {
        // Not a valid standard JWT, proceed to Clerk validation
      }

      // Verify/decode as Clerk JWT
      const decodedClerk = verifyClerkToken(token);
      
      if (decodedClerk && decodedClerk.sub) {
        const clerkId = decodedClerk.sub;

        // Search MongoDB: Admin collection, then Doctor collection, then User collection
        const Admin = require("../models/Admin");
        let account = await Admin.findOne({ clerkId });
        if (!account) {
          account = await Doctor.findOne({ clerkId });
        }
        if (!account) {
          account = await User.findOne({ clerkId });
        }

        // Self-Healing Sync: If Clerk user is authenticated but not in database, sync them automatically!
        if (!account) {
          let realEmail = null;
          let realName = null;
          let realImage = null;

          if (process.env.CLERK_SECRET_KEY) {
            try {
              const { createClerkClient } = require("@clerk/backend");
              const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
              const clerkUser = await clerkClient.users.getUser(clerkId);
              if (clerkUser) {
                realEmail = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
                realName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username;
                realImage = clerkUser.imageUrl;
              }
            } catch (err) {
              console.warn("clerkClient.getUser in auth.js warning:", err?.message || err);
            }
          }

          const rawEmail =
            realEmail ||
            decodedClerk.email ||
            decodedClerk.email_address ||
            decodedClerk.email_addresses?.[0]?.email_address ||
            decodedClerk.primary_email_address?.email_address ||
            decodedClerk.claims?.email ||
            `clerk_${String(clerkId).replace(/[^a-zA-Z0-9._-]/g, "_")}@medicare.com`;

          const email = String(rawEmail).toLowerCase().trim();
          const name = realName || decodedClerk.name || `${decodedClerk.given_name || ""} ${decodedClerk.family_name || ""}`.trim() || "Patient";
          const profileImage = realImage || decodedClerk.picture || decodedClerk.image_url || "";

          // Check if existing Doctor has this email
          let doctor = await Doctor.findOne({ email });
          if (doctor) {
            doctor.clerkId = clerkId;
            await doctor.save();
            account = doctor;
          }

          // Check if existing Admin has this email
          if (!account) {
            let admin = await Admin.findOne({ email });
            if (admin) {
              admin.clerkId = clerkId;
              await admin.save();
              account = admin;
            }
          }

          // Check if existing User has this email or clerkId
          if (!account) {
            let user = await User.findOne({ $or: [{ email }, { clerkId }] });
            if (user) {
              user.clerkId = clerkId;
              if (name && user.name === "Patient") user.name = name;
              if (profileImage) user.image = profileImage;
              await user.save();
              account = user;
            }
          }

          // Create new record if still not found
          if (!account) {
            const origin = req.get("origin") || req.get("referer") || "";
            const isAdminPortal =
              origin.includes("5174") ||
              origin.includes("heal-book-admin") ||
              req.originalUrl.includes("/admin") ||
              req.originalUrl.includes("/doctor");

            if (isAdminPortal) {
              account = new Admin({
                clerkId,
                name,
                email,
                profileImage,
                role: "admin",
              });
            } else {
              account = new User({
                clerkId,
                name,
                email,
                image: profileImage || "",
                role: "patient",
              });
            }

            try {
              await account.save();
              console.log(`Automatically synchronized new Clerk ${isAdminPortal ? "Admin" : "Patient"} to database: ${email}`);
            } catch (saveErr) {
              if (saveErr.code === 11000) {
                console.warn(`Duplicate key on Clerk sync (${email}), linking existing account...`);
                account = (await User.findOne({ $or: [{ email }, { clerkId }] })) ||
                          (await Doctor.findOne({ $or: [{ email }, { clerkId }] })) ||
                          (await Admin.findOne({ $or: [{ email }, { clerkId }] }));
                if (account && !account.clerkId) {
                  account.clerkId = clerkId;
                  await account.save();
                }
              } else {
                throw saveErr;
              }
            }
          }
        }

        req.user = account;
        req.role = account.role;
        return next();
      }

      return res.status(401).json({ success: false, message: "Not authorized, token validation failed" });
    } catch (error) {
      console.error("Authentication error:", error);
      return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
  }
};

// RBAC Authorization Middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Required role: [${allowedRoles.join(" or ")}]`,
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
