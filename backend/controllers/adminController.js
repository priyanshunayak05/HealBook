const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Department = require("../models/Department");
const Service = require("../models/Service");
const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");
const { logActivity } = require("../services/logService");

// @desc    Get dashboard metrics / counts
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getAdminDashboardStats = async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const totalPatients = await User.countDocuments({ role: "patient" });
    const totalAppointments = await Appointment.countDocuments();

    // Today's boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Filter appointments for today
    // Note: date fields are stored in string format (YYYY-MM-DD) or Dates.
    // Let's check both or fetch all and filter in JavaScript, or format date
    const todayStr = startOfToday.toISOString().split("T")[0]; // YYYY-MM-DD
    const todayAppointments = await Appointment.countDocuments({ date: todayStr });

    const completedAppointments = await Appointment.countDocuments({ status: "Completed" });
    const cancelledAppointments = await Appointment.countDocuments({ status: "Canceled" });

    // Calculate revenue
    const revenueAgg = await Appointment.aggregate([
      { $match: { "payment.status": "Paid" } },
      { $group: { _id: null, total: { $sum: "$fees" } } },
    ]);
    const revenue = (revenueAgg[0] && revenueAgg[0].total) || 0;

    const totalDepartments = await Department.countDocuments();
    const totalServices = await Service.countDocuments();

    // Average rating
    const ratingAgg = await Doctor.aggregate([{ $group: { _id: null, avgRating: { $avg: "$rating" } } }]);
    const averageRating = (ratingAgg[0] && ratingAgg[0].avgRating) || 0;

    // Recent activities
    const recentActivities = await ActivityLog.find().sort({ createdAt: -1 }).limit(8);

    // Recent appointments
    const recentAppointments = await Appointment.find().sort({ createdAt: -1 }).limit(5);

    return res.json({
      success: true,
      data: {
        metrics: {
          totalDoctors,
          totalPatients,
          totalAppointments,
          todayAppointments,
          completedAppointments,
          cancelledAppointments,
          revenue,
          totalDepartments,
          totalServices,
          averageRating: parseFloat(averageRating.toFixed(1)),
        },
        recentActivities,
        recentAppointments,
      },
    });
  } catch (err) {
    console.error("getAdminDashboardStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get dashboard charts / analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAdminAnalytics = async (req, res) => {
  try {
    // 1. Monthly appointments & revenue
    // Standard Mongoose aggregation by month (for last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const appointmentsByMonth = await Appointment.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ["$payment.status", "Paid"] }, "$fees", 0],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const formattedMonthly = appointmentsByMonth.map((item) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        appointments: item.count,
        revenue: item.revenue,
      };
    });

    // 2. Doctor Performance (Top 5 earners/active)
    const doctorPerformance = await Appointment.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: "$doctorId",
          doctorName: { $first: "$doctorName" },
          completed: { $sum: 1 },
          earnings: { $sum: "$fees" },
        },
      },
      { $sort: { earnings: -1 } },
      { $limit: 5 },
    ]);

    // 3. Department Performance
    const depts = await Department.find();
    const departmentPerformance = await Promise.all(
      depts.map(async (d) => {
        const doctorCount = await Doctor.countDocuments({ departmentId: d._id });
        const appointmentsCount = await Appointment.countDocuments({ speciality: d.name });
        return {
          name: d.name,
          doctors: doctorCount,
          appointments: appointmentsCount,
        };
      })
    );

    // 4. Patient growth (last 6 months)
    const patientsByMonth = await User.aggregate([
      { $match: { role: "patient", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const formattedPatients = patientsByMonth.map((item) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        patients: item.count,
      };
    });

    return res.json({
      success: true,
      data: {
        monthlyTrends: formattedMonthly,
        doctorPerformance: doctorPerformance.map((dp) => ({
          name: dp.doctorName || "Unknown Doctor",
          completed: dp.completed,
          earnings: dp.earnings,
        })),
        departmentPerformance,
        patientGrowth: formattedPatients,
      },
    });
  } catch (err) {
    console.error("getAdminAnalytics error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get activity logs (paginated, searchable)
// @route   GET /api/admin/activity
// @access  Private/Super Admin
const getActivityLogs = async (req, res) => {
  try {
    const { limit: limitRaw = 50, page: pageRaw = 1, search = "" } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), "i");
      filter.$or = [{ action: re }, { userEmail: re }, { userName: re }];
    }

    const items = await ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

    const total = await ActivityLog.countDocuments(filter);
    return res.json({
      success: true,
      data: items,
      meta: { total, page, limit },
    });
  } catch (err) {
    console.error("getActivityLogs error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Bulk delete doctors
// @route   POST /api/admin/doctors/bulk-delete
// @access  Private/Super Admin
const bulkDeleteDoctors = async (req, res) => {
  try {
    const { doctorIds } = req.body;
    if (!Array.isArray(doctorIds) || doctorIds.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or empty doctorIds array" });
    }

    await Doctor.deleteMany({ _id: { $in: doctorIds } });

    await logActivity(req, "Doctors Bulk Deleted", { count: doctorIds.length });

    return res.json({ success: true, message: `Successfully deleted ${doctorIds.length} doctors` });
  } catch (err) {
    console.error("bulkDeleteDoctors error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Bulk update doctors availability
// @route   POST /api/admin/doctors/bulk-update
// @access  Private/Admin
const bulkUpdateDoctors = async (req, res) => {
  try {
    const { doctorIds, availability } = req.body;
    if (!Array.isArray(doctorIds) || doctorIds.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or empty doctorIds array" });
    }
    if (availability !== "Available" && availability !== "Unavailable") {
      return res.status(400).json({ success: false, message: "Availability must be Available or Unavailable" });
    }

    await Doctor.updateMany({ _id: { $in: doctorIds } }, { $set: { availability } });

    await logActivity(req, "Doctors Bulk Updated", { count: doctorIds.length, availability });

    return res.json({ success: true, message: `Successfully updated ${doctorIds.length} doctors to ${availability}` });
  } catch (err) {
    console.error("bulkUpdateDoctors error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get notification list for admins
// @route   GET /api/admin/notifications
// @access  Private/Admin
const getAdminNotifications = async (req, res) => {
  try {
    const items = await Notification.find({ recipientId: "admin" }).sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, data: items, notifications: items });
  } catch (err) {
    console.error("getAdminNotifications error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Mark notifications read
// @route   POST /api/admin/notifications/read
// @access  Private/Admin
const markAdminNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: "admin", isRead: false }, { $set: { isRead: true } });
    return res.json({ success: true, message: "Notifications marked as read" });
  } catch (err) {
    console.error("markAdminNotificationsRead error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getPatientsList = async (req, res) => {
  try {
    const patients = await User.find({ role: "patient" }).select("-password");
    return res.json({ success: true, data: patients });
  } catch (err) {
    console.error("getPatientsList error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAdminDashboardStats,
  getAdminAnalytics,
  getActivityLogs,
  bulkDeleteDoctors,
  bulkUpdateDoctors,
  getAdminNotifications,
  markAdminNotificationsRead,
  getPatientsList,
};
