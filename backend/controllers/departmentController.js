const Department = require("../models/Department");
const Doctor = require("../models/Doctor");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");
const { logActivity } = require("../services/logService");

// @desc    Get all departments (with search, pagination, status filters)
// @route   GET /api/departments
// @access  Public
const getDepartments = async (req, res) => {
  try {
    const { q = "", limit: limitRaw = 50, page: pageRaw = 1, status } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (q && typeof q === "string" && q.trim()) {
      filter.name = new RegExp(q.trim(), "i");
    }

    const items = await Department.find(filter)
      .populate("headDoctor", "name email specialization")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    // Fetch doctor count for each department
    const departmentsWithCounts = await Promise.all(
      items.map(async (dept) => {
        const doctorCount = await Doctor.countDocuments({ departmentId: dept._id });
        const plainDept = dept.toObject();
        return {
          ...plainDept,
          id: dept._id,
          doctorCount,
        };
      })
    );

    const total = await Department.countDocuments(filter);
    return res.json({
      success: true,
      data: departmentsWithCounts,
      departments: departmentsWithCounts,
      meta: { total, page, limit },
    });
  } catch (err) {
    console.error("getDepartments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get single department by ID
// @route   GET /api/departments/:id
// @access  Public
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id).populate("headDoctor", "name email specialization");
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const doctorCount = await Doctor.countDocuments({ departmentId: department._id });
    const plainDept = department.toObject();
    const result = {
      ...plainDept,
      id: department._id,
      doctorCount,
    };

    return res.json({ success: true, data: result, department: result });
  } catch (err) {
    console.error("getDepartmentById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private/Admin
const createDepartment = async (req, res) => {
  try {
    const { name, description, headDoctor, status } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Department name is required" });
    }

    const exists = await Department.findOne({ name: name.trim() });
    if (exists) {
      return res.status(409).json({ success: false, message: "Department name already exists" });
    }

    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      try {
        const up = await uploadToCloudinary(req.file.path, "departments");
        imageUrl = up?.secure_url || null;
        imagePublicId = up?.public_id || null;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    }

    const department = new Department({
      name: name.trim(),
      description: description || "",
      headDoctor: headDoctor || null,
      status: status || "Active",
      imageUrl,
      imagePublicId,
    });

    await department.save();

    // If head doctor is assigned, update that doctor's departmentId
    if (headDoctor) {
      await Doctor.findByIdAndUpdate(headDoctor, { departmentId: department._id });
    }

    await logActivity(req, "Department Created", { name: department.name, id: department._id });

    return res.status(201).json({ success: true, data: department });
  } catch (err) {
    console.error("createDepartment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private/Admin
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, headDoctor, status } = req.body || {};

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    if (name && name.trim() && name.trim() !== department.name) {
      const exists = await Department.findOne({ name: name.trim() });
      if (exists) {
        return res.status(409).json({ success: false, message: "Department name already exists" });
      }
      department.name = name.trim();
    }

    if (description !== undefined) department.description = description;
    if (headDoctor !== undefined) department.headDoctor = headDoctor || null;
    if (status !== undefined) department.status = status;

    if (req.file) {
      const up = await uploadToCloudinary(req.file.path, "departments");
      if (up) {
        const previousPublicId = department.imagePublicId;
        department.imageUrl = up.secure_url;
        department.imagePublicId = up.public_id;
        if (previousPublicId) {
          deleteFromCloudinary(previousPublicId).catch((err) =>
            console.warn("deleteFromCloudinary warning:", err.message)
          );
        }
      }
    }

    await department.save();

    if (headDoctor) {
      await Doctor.findByIdAndUpdate(headDoctor, { departmentId: department._id });
    }

    await logActivity(req, "Department Updated", { name: department.name, id: department._id });

    return res.json({ success: true, data: department });
  } catch (err) {
    console.error("updateDepartment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    // Check if doctors belong to this department
    const doctorCount = await Doctor.countDocuments({ departmentId: id });
    if (doctorCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. There are ${doctorCount} doctors assigned to it.`,
      });
    }

    if (department.imagePublicId) {
      deleteFromCloudinary(department.imagePublicId).catch((err) =>
        console.warn("deleteFromCloudinary warning:", err.message)
      );
    }

    await Department.findByIdAndDelete(id);

    await logActivity(req, "Department Deleted", { name: department.name, id: department._id });

    return res.json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    console.error("deleteDepartment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
