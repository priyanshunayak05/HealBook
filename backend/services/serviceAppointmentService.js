/**
 * serviceAppointmentService.js
 *
 * Business logic for service appointment slot availability.
 * Keeps controllers thin by centralizing the slot-query logic here.
 */

const mongoose = require("mongoose");
const ServiceAppointment = require("../models/ServiceAppointment");

/**
 * Statuses that constitute an "active" (slot-blocking) appointment.
 * Canceled and Completed appointments do NOT block a slot.
 */
const ACTIVE_STATUSES = ["Pending", "Confirmed", "Rescheduled"];

/**
 * Helper to parse a time string like "10:30 AM" into { hour, minute, ampm }.
 * Copied/adapted from serviceAppointmentController for reuse here.
 */
function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const t = timeStr.trim();
  const m = t.match(/([0-9]{1,2}):?([0-9]{0,2})\s*(AM|PM|am|pm)?/);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  let mm = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = (m[3] || "").toUpperCase();
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  if (ampm) {
    if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;
    return { hour: hh, minute: mm, ampm };
  }

  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  if (hh === 0) return { hour: 12, minute: mm, ampm: "AM" };
  if (hh === 12) return { hour: 12, minute: mm, ampm: "PM" };
  if (hh > 12) return { hour: hh - 12, minute: mm, ampm: "PM" };
  return { hour: hh, minute: mm, ampm: "AM" };
}

/**
 * getServiceAvailableSlots
 *
 * Given a serviceId, a date string (YYYY-MM-DD), and the service's full
 * array of string slots for that date, returns only the time slots that
 * are not already taken by an active appointment.
 *
 * @param {string|ObjectId} serviceId
 * @param {string}          dateStr   – "YYYY-MM-DD"
 * @param {string[]}        allSlots  – all slots from service.slots[date]
 * @returns {Promise<string[]>}        – available slots (subset of allSlots)
 */
async function getServiceAvailableSlots(serviceId, dateStr, allSlots = []) {
  if (!serviceId || !dateStr || allSlots.length === 0) return [];

  // Query active appointments for this service on this date
  const bookedAppointments = await ServiceAppointment.find(
    {
      serviceId: new mongoose.Types.ObjectId(String(serviceId)),
      date: dateStr,
      status: { $in: ACTIVE_STATUSES },
    },
    { hour: 1, minute: 1, ampm: 1, _id: 0 }
  ).lean();

  // Create a fast lookup set of booked times formatted as "hh:mm AMPM"
  const bookedTimes = new Set();
  bookedAppointments.forEach((a) => {
    // Format hour and minute to match typical slot string representation
    // E.g., hour=10, minute=30, ampm=AM -> "10:30 AM"
    // E.g., hour=9, minute=0, ampm=AM -> "9:00 AM" or "09:00 AM"
    // To be perfectly robust, we parse the `allSlots` candidates instead of
    // formatting the DB values, because the string format might vary
    // (e.g., "9:00 AM" vs "09:00 AM").
  });

  // A more robust approach:
  // Convert booked DB objects into a predictable string key: "hour:minute ampm"
  bookedAppointments.forEach((a) => {
    const key = `${a.hour}:${a.minute} ${a.ampm}`;
    bookedTimes.add(key);
  });

  return allSlots.filter((slotStr) => {
    const parsed = parseTimeString(slotStr);
    if (!parsed) return false; // Ignore unparseable slots

    // Reconstruct the key based on parsed values
    const slotKey = `${parsed.hour}:${parsed.minute} ${parsed.ampm}`;
    return !bookedTimes.has(slotKey);
  });
}

/**
 * isValidDateString
 *
 * Validates that a string is a real calendar date in YYYY-MM-DD format.
 */
function isValidDateString(str) {
  if (!str || typeof str !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + "T00:00:00.000Z");
  return !isNaN(d.getTime()) && d.toISOString().startsWith(str);
}

module.exports = {
  getServiceAvailableSlots,
  parseTimeString,
  isValidDateString,
  ACTIVE_STATUSES,
};
