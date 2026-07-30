const Service = require("../models/Service");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");

const parseJsonArrayField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed;
      return typeof parsed === "string" ? [parsed] : [];
    } catch {
      return field
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
};

function normalizeSlotsToMap(slotStrings = []) {
  const map = {};
  slotStrings.forEach((raw) => {
    const m = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*•\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) {
      map["unspecified"] = map["unspecified"] || [];
      map["unspecified"].push(raw);
      return;
    }
    const [, day, monShort, year, hour, minute, ampm] = m;
    const monthIdx = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      .findIndex(x => x.toLowerCase() === monShort.toLowerCase());
    const mm = String(monthIdx + 1).padStart(2, "0");
    const dd = String(Number(day)).padStart(2, "0");
    const dateKey = `${year}-${mm}-${dd}`;
    const timeStr = `${String(Number(hour)).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm.toUpperCase()}`;
    map[dateKey] = map[dateKey] || [];
    map[dateKey].push(timeStr);
  });
  return map;
}

const sanitizePrice = (v) => Number(String(v ?? "0").replace(/[^\d.-]/g, "")) || 0;
const parseAvailability = (v) => {
  const s = String(v ?? "available").toLowerCase();
  return s === "available" || s === "true";
};

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const query = {};
    if (search) {
      query.name = new RegExp(search, "i");
    }
    
    const services = await Service.find(query);
    
    const normalized = services.map((s) => ({
      _id: s._id,
      id: s._id,
      name: s.name,
      about: s.about || "",
      shortDescription: s.shortDescription || "",
      price: s.price || 0,
      available: s.available ?? true,
      imageUrl: s.imageUrl,
      imagePublicId: s.imagePublicId,
      dates: s.dates || [],
      slots: s.slots || {},
      instructions: s.instructions || [],
      totalAppointments: s.totalAppointments || 0,
      completed: s.completed || 0,
      canceled: s.canceled || 0
    }));

    return res.json({ success: true, data: normalized, services: normalized });
  } catch (err) {
    console.error("getServices error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const s = await Service.findById(id);
    if (!s) return res.status(404).json({ success: false, message: "Service not found" });
    
    const out = {
      _id: s._id,
      id: s._id,
      name: s.name,
      about: s.about || "",
      shortDescription: s.shortDescription || "",
      price: s.price || 0,
      available: s.available ?? true,
      imageUrl: s.imageUrl,
      imagePublicId: s.imagePublicId,
      dates: s.dates || [],
      slots: s.slots || {},
      instructions: s.instructions || [],
      totalAppointments: s.totalAppointments || 0,
      completed: s.completed || 0,
      canceled: s.canceled || 0
    };

    return res.json({ success: true, data: out });
  } catch (err) {
    console.error("getServiceById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Create service
// @route   POST /api/services
// @access  Private/Admin
const createService = async (req, res) => {
  try {
    const b = req.body || {};
    const instructions = parseJsonArrayField(b.instructions);
    const rawSlots = parseJsonArrayField(b.slots);
    const slots = normalizeSlotsToMap(rawSlots);
    const numericPrice = sanitizePrice(b.price);
    const available = parseAvailability(b.availability);

    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      try {
        const up = await uploadToCloudinary(req.file.path, "services");
        imageUrl = up?.secure_url || null;
        imagePublicId = up?.public_id || null;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    } else if (b.imageUrl) {
      imageUrl = b.imageUrl;
    }

    const dates = Object.keys(slots).filter(d => d !== "unspecified");

    const service = new Service({
      name: b.name || "Unnamed Service",
      about: b.about || "",
      shortDescription: b.shortDescription || "",
      price: numericPrice,
      available,
      imageUrl,
      imagePublicId,
      dates,
      slots,
      instructions,
    });

    await service.save();
    return res.status(201).json({ success: true, data: service });
  } catch (err) {
    console.error("createService error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private/Admin
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const existing = await Service.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Service not found" });

    const updateData = {};
    if (b.name !== undefined) updateData.name = b.name;
    if (b.about !== undefined) updateData.about = b.about;
    if (b.shortDescription !== undefined) updateData.shortDescription = b.shortDescription;
    if (b.price !== undefined) updateData.price = sanitizePrice(b.price);
    if (b.availability !== undefined) updateData.available = parseAvailability(b.availability);
    if (b.instructions !== undefined) updateData.instructions = parseJsonArrayField(b.instructions);
    
    if (b.slots !== undefined) {
      const rawSlots = parseJsonArrayField(b.slots);
      updateData.slots = normalizeSlotsToMap(rawSlots);
      updateData.dates = Object.keys(updateData.slots).filter(d => d !== "unspecified");
    }

    if (req.file) {
      try {
        const up = await uploadToCloudinary(req.file.path, "services");
        if (up?.secure_url) {
          updateData.imageUrl = up.secure_url;
          updateData.imagePublicId = up.public_id || null;
          if (existing.imagePublicId) {
            try {
              await deleteFromCloudinary(existing.imagePublicId);
            } catch (err) {
              console.warn("Cloudinary delete failed:", err?.message || err);
            }
          }
        }
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    } else if (b.imageUrl) {
      updateData.imageUrl = b.imageUrl;
    }

    const updated = await Service.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateService error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private/Admin
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const s = await Service.findById(id);
    if (!s) return res.status(404).json({ success: false, message: "Service not found" });

    if (s.imagePublicId) {
      try {
        await deleteFromCloudinary(s.imagePublicId);
      } catch (err) {
        console.warn("Cloudinary image delete failed:", err);
      }
    }

    await Service.findByIdAndDelete(id);
    return res.json({ success: true, message: "Service deleted successfully" });
  } catch (err) {
    console.error("deleteService error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};