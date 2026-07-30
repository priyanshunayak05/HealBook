const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Doctor = require("./models/Doctor");

dotenv.config();

const adminData = {
  name: "Admin User",
  email: "admin@medicare.com",
  password: "adminpassword",
  phone: "1234567890",
  role: "admin",
};

const doctorData = {
  name: "Dr. Rahul Sharma",
  email: "dr1@gmail.com",
  password: "123456",
  specialization: "Cardiologist",
  experience: "10 years",
  qualifications: "MBBS, MD (Cardiology)",
  location: "Delhi",
  about: "Experienced heart specialist",
  fee: 500,
  availability: "Available",
  schedule: {
    "2026-01-20": ["10:00 AM", "10:30 AM", "11:00 AM"],
    "2026-01-21": ["02:00 PM", "02:30 PM"],
  },
  success: "98%",
  patients: "5000+",
  rating: 4.7,
};

async function seedDatabase() {
  try {
    // Connect to Database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for seeding...");

    // Check / Seed Admin
    const adminExists = await User.findOne({ email: adminData.email });
    if (!adminExists) {
      const admin = new User(adminData);
      await admin.save();
      console.log("Admin account created successfully!");
    } else {
      console.log("Admin account already exists.");
    }

    // Check / Seed Doctor
    const doctorExists = await Doctor.findOne({ email: doctorData.email });
    if (!doctorExists) {
      const doctor = new Doctor(doctorData);
      await doctor.save();
      console.log("Test Doctor account created successfully!");
    } else {
      console.log("Test Doctor account already exists.");
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
