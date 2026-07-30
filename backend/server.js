const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Route imports
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const serviceAppointmentRoutes = require("./routes/serviceAppointmentRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const doctorPanelRoutes = require("./routes/doctorPanelRoutes");
const User = require("./models/User");

// Connect to Database
connectDB();

const app = express();

// Security Middlewares
app.use(helmet());
app.use(mongoSanitize());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
    data: {},
  },
});
app.use("/api", limiter);

// Middlewares
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.endsWith(".onrender.com") ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".netlify.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder statically if needed
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/service-appointments", serviceAppointmentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorPanelRoutes);

// Patient count endpoint for admin dashboard
app.get("/api/patients/count", async (req, res) => {
  try {
    const count = await User.countDocuments({ role: "patient" });
    return res.json({ success: true, count, data: count });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("MediCare API is running...");
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
