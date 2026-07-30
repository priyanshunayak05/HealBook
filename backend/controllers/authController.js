const User = require("../models/User");
const Doctor = require("../models/Doctor");
const generateToken = require("../utils/generateToken");
const { validationResult } = require("express-validator");

// @desc    Register a new user / doctor / admin
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, phone, role } = req.body;
  const userRole = role || "patient";

  if (userRole === "patient") {
    return res.status(400).json({
      success: false,
      message: "Patient authentication is managed by Clerk. Please sign up using Clerk.",
    });
  }

  try {
    const doctorExists = await Doctor.findOne({ email: email.toLowerCase() });

    if (doctorExists) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    let account = new Doctor({
      name,
      email: email.toLowerCase(),
      password,
      specialization: "",
      experience: "",
      qualifications: "",
      location: "",
      about: "",
      fee: 0,
      availability: "Available",
      schedule: {},
    });
    await account.save();

    const token = generateToken(account._id);

    return res.status(201).json({
      success: true,
      token,
      data: {
        _id: account._id,
        name: account.name,
        email: account.email,
        role: "doctor",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ success: false, message: "Server error during registration" });
  }
};

// @desc    Authenticate user / doctor / admin & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    let account = await Doctor.findOne({ email: email.toLowerCase() });
    let isDoctor = true;

    if (!account) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        return res.status(400).json({
          success: false,
          message: "Patient authentication is managed by Clerk. Please sign in using Clerk.",
        });
      }
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!(await account.matchPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(account._id);

    const responseData = {
      _id: account._id,
      name: account.name,
      email: account.email,
      role: account.role,
      doctor: account,
    };

    return res.json({
      success: true,
      token,
      data: responseData,
      doctor: account,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
};

const getMe = async (req, res) => {
  try {
    return res.json({ success: true, data: req.user, role: req.role });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { registerUser, loginUser, getMe };
