const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");

dotenv.config();

const makeSuperAdmin = async () => {
  const identifier = process.argv[2]; // Can be Clerk ID or Email
  const newRole = process.argv[3] || "superadmin";

  if (!identifier) {
    console.error("Error: Please provide a Clerk User ID or Email address.");
    console.log("Usage: node make-superadmin.js <clerkId_or_email> [role]");
    console.log("Example: node make-superadmin.js user_2XYZ... superadmin");
    process.exit(1);
  }

  const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/medical";
  console.log(`Connecting to MongoDB at: ${mongoURI.split("@").pop()} ...`);

  try {
    await mongoose.connect(mongoURI);
    console.log("Database connected successfully!");

    // Search by clerkId first, then by email
    let user = await User.findOne({
      $or: [
        { clerkId: identifier },
        { email: identifier.toLowerCase().trim() }
      ]
    });

    if (!user) {
      console.log(`User matching "${identifier}" not found in database.`);
      console.log("Adding temporary record for when they log in via Clerk...");
      
      const isEmail = identifier.includes("@");
      user = new User({
        name: isEmail ? "Admin User" : "Clerk Admin",
        email: isEmail ? identifier.toLowerCase().trim() : `clerk_${identifier}@medicare.com`,
        clerkId: isEmail ? undefined : identifier,
        role: newRole,
        phone: "N/A"
      });
    } else {
      user.role = newRole;
    }

    await user.save();
    console.log("\n==============================================");
    console.log(` SUCCESS: User successfully promoted!`);
    console.log(` Name:  ${user.name}`);
    console.log(` Email: ${user.email}`);
    console.log(` Clerk ID: ${user.clerkId || "N/A"}`);
    console.log(` New Role: ${user.role}`);
    console.log("==============================================\n");

  } catch (error) {
    console.error("Error setting role:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed.");
  }
};

makeSuperAdmin();
