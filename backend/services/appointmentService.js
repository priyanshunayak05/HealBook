/**
 * appointmentService.js
 *
 * Business logic for appointment slot availability.
 * Keeps controllers thin by centralizing the slot-query logic here.
 */

const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");

/**
 * Statuses that constitute an "active" (slot-blocking) appointment.
 * Canceled and Completed appointments do NOT block a slot.
 */
const ACTIVE_STATUSES = ["Pending", "Confirmed", "Rescheduled"];

/**
 * getAvailableSlots
 *
 * Given a doctorId, a date string (YYYY-MM-DD), and the doctor's full
 * schedule map, returns only the time slots that are not already taken
 * by an active appointment.
 *
 * @param {string|ObjectId} doctorId
 * @param {string}          dateStr   – "YYYY-MM-DD"
 * @param {string[]}        allSlots  – all slots from doctor.schedule[date]
 * @returns {Promise<string[]>}        – available slots (subset of allSlots)
 */
async function getAvailableSlots(doctorId, dateStr, allSlots = []) {
  if (!doctorId || !dateStr || allSlots.length === 0) return [];

  // Query active appointments for this doctor on this date
  const bookedAppointments = await Appointment.find(
    {
      doctorId: new mongoose.Types.ObjectId(String(doctorId)),
      date: dateStr,
      status: { $in: ACTIVE_STATUSES },
    },
    { time: 1, _id: 0 }
  ).lean();

  const bookedTimes = new Set(bookedAppointments.map((a) => a.time));

  return allSlots.filter((slot) => !bookedTimes.has(slot));
}

/**
 * checkSlotAvailability
 *
 * Returns true if the given slot is free for the given doctor+date.
 * Used for a quick boolean check inside createAppointment.
 *
 * @param {string|ObjectId} doctorId
 * @param {string}          dateStr  – "YYYY-MM-DD"
 * @param {string}          timeStr  – e.g. "10:30 AM"
 * @returns {Promise<boolean>}
 */
async function checkSlotAvailability(doctorId, dateStr, timeStr) {
  const existing = await Appointment.findOne({
    doctorId: new mongoose.Types.ObjectId(String(doctorId)),
    date: dateStr,
    time: timeStr,
    status: { $in: ACTIVE_STATUSES },
  })
    .select("_id")
    .lean();

  return existing === null; // true = slot is free
}

/**
 * isValidDateString
 *
 * Validates that a string is a real calendar date in YYYY-MM-DD format.
 * Rejects invalid calendar dates like 2026-02-30.
 *
 * @param {string} str
 * @returns {boolean}
 */
function isValidDateString(str) {
  if (!str || typeof str !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + "T00:00:00.000Z");
  return !isNaN(d.getTime()) && d.toISOString().startsWith(str);
}

/**
 * isDateInPast
 *
 * Compares a YYYY-MM-DD date string (treated as calendar day, no time) against
 * today's date (server local calendar day).
 *
 * Uses date-only comparison so a booking for "today" is allowed.
 *
 * @param {string} dateStr – "YYYY-MM-DD"
 * @returns {boolean} true if dateStr is strictly before today
 */
function isDateInPast(dateStr) {
  // Build a UTC midnight for the given date
  const [y, m, d] = dateStr.split("-").map(Number);
  const apptDay = new Date(Date.UTC(y, m - 1, d));

  // Today at UTC midnight (strip time)
  const now = new Date();
  const todayDay = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );

  return apptDay < todayDay;
}

module.exports = {
  getAvailableSlots,
  checkSlotAvailability,
  isValidDateString,
  isDateInPast,
  ACTIVE_STATUSES,
};
