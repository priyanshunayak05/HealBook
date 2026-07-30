import React, { useState, useEffect, useMemo } from "react";
import { useAdminAuth } from "../../context/AuthContext";
import { Calendar, Search, BadgeIndianRupee, AlertCircle, Loader2, Check, XCircle, Clock, Edit } from "lucide-react";
import { pageStyles, statusClasses } from "../../assets/dummyStyles";

const API_BASE = "http://localhost:4000";

function formatDateISO(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return iso;
  }
}

function dateTimeFromSlot(slot) {
  try {
    const [y, m, d] = slot.date.split("-");
    const base = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);

    const [time, ampm] = slot.time.split(" ");
    let [hh, mm] = time.split(":").map(Number);
    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
    base.setHours(hh, mm, 0, 0);
    return base;
  } catch (e) {
    return new Date(slot.date + "T00:00:00");
  }
}

function PaymentBadge({ payment }) {
  const method = payment?.method || "Cash";
  const status = payment?.status || "Pending";

  if (method === "Cash" && status === "Pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
        💰 Cash: Payment Pending
      </span>
    );
  }

  if (status === "Paid") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        ✓ {method}: Paid
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
      {method}: {status}
    </span>
  );
}

export default function AppointmentsPage() {
  const { getToken, role } = useAdminAuth();
  const isDoctor = role === "doctor";
  const isAdmin = role === "admin" || role === "superadmin";

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSpeciality, setFilterSpeciality] = useState("all");
  const [showAll, setShowAll] = useState(false);

  // Reschedule & Notes Modals
  const [activeActionId, setActiveActionId] = useState(null);
  const [newTime, setNewTime] = useState("");
  const [newDate, setNewDate] = useState("");
  const [notes, setNotes] = useState("");

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const endpoint = isDoctor ? "doctor/appointments" : "appointments";
      const q = query.trim();
      const url = `${API_BASE}/api/${endpoint}?limit=200${
        q ? `&search=${encodeURIComponent(q)}` : ""
      }`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      const items = (data?.appointments || data?.data || []).map((a) => {
        const doctorName =
          (a.doctorId && a.doctorId.name) || a.doctorName || "";
        const speciality =
          (a.doctorId && a.doctorId.specialization) ||
          a.speciality ||
          a.specialization ||
          "General";
        const fee = typeof a.fees === "number" ? a.fees : a.fee || 0;
        return {
          id: a._id || a.id,
          patientName: a.patientName || "",
          age: a.age || "",
          gender: a.gender || "",
          mobile: a.mobile || "",
          doctorName,
          speciality,
          fee,
          slot: {
            date: a.date || (a.slot && a.slot.date) || "",
            time: a.time || (a.slot && a.slot.time) || "00:00 AM",
          },
          status: a.status || "Pending",
          payment: {
            method: a.payment?.method || "Cash",
            status: a.payment?.status || "Pending",
          },
          notes: a.notes || "",
          raw: a,
        };
      });
      setAppointments(items);
    } catch (err) {
      console.error("Load appointments error:", err);
      setError(err.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [role, query]);

  const specialities = useMemo(() => {
    const set = new Set(appointments.map((a) => a.speciality || "General"));
    return ["all", ...Array.from(set)];
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((a) => {
      if (
        filterSpeciality !== "all" &&
        (a.speciality || "").toLowerCase() !== filterSpeciality.toLowerCase()
      )
        return false;
      if (filterDate && a.slot?.date !== filterDate) return false;
      if (!q) return true;
      return (
        (a.doctorName || "").toLowerCase().includes(q) ||
        (a.speciality || "").toLowerCase().includes(q) ||
        (a.patientName || "").toLowerCase().includes(q) ||
        (a.mobile || "").toLowerCase().includes(q)
      );
    });
  }, [appointments, query, filterDate, filterSpeciality]);

  const sortedFiltered = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      const da = dateTimeFromSlot(a.slot).getTime();
      const db = dateTimeFromSlot(b.slot).getTime();
      return db - da;
    });
  }, [filtered]);

  const displayed = useMemo(
    () => (showAll ? sortedFiltered : sortedFiltered.slice(0, 8)),
    [sortedFiltered, showAll]
  );

  async function adminCancelAppointment(id) {
    const appt = appointments.find((x) => x.id === id);
    if (!appt) return;

    const statusLower = (appt.status || "").toLowerCase();
    const isCancelled =
      statusLower === "canceled" || statusLower === "cancelled";
    const isCompleted = statusLower === "completed";

    if (isCancelled || isCompleted) return;

    const ok = window.confirm(
      `As admin, mark appointment for ${appt.patientName} with ${
        appt.doctorName
      } on ${formatDateISO(appt.slot.date)} at ${appt.slot.time} as CANCELLED?`
    );
    if (!ok) return;

    try {
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Canceled" } : p))
      );
      setShowAll(true);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/appointments/${id}/cancel`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Cancel failed (${res.status})`);
      }
      const data = await res.json();
      const updated = data?.appointment || data?.appointments || null;
      if (updated) {
        setAppointments((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: updated.status || "Canceled",
                  slot: {
                    date: updated.date || p.slot.date,
                    time: updated.time || p.slot.time,
                  },
                  raw: updated,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Cancel error:", err);
      setError(err.message || "Failed to cancel appointment");
      loadAppointments();
    }
  }

  // Doctor Actions
  const handleDoctorAction = async (id, status, extraBody = {}) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/doctor/appointments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, ...extraBody }),
      });

      if (!res.ok) {
        throw new Error("Action failed");
      }
      
      setActiveActionId(null);
      loadAppointments();
    } catch (err) {
      console.error(err);
      setError("Failed to perform action");
    }
  };

  return (
    <div className={pageStyles.container}>
      <div className={pageStyles.maxWidthContainer}>
        
        {/* Header */}
        <div className={pageStyles.headerContainer}>
          <div className={pageStyles.headerTitleSection}>
            <h2 className={pageStyles.headerTitle}>
              {isDoctor ? "My Patients Consultations" : "HMS Appointments"}
            </h2>
            <p className={pageStyles.headerSubtitle}>
              {isDoctor ? "Manage your schedule, complete check-ins, and record clinical notes." : "Monitor, filter, and audit patient-doctor consultations"}
            </p>
          </div>

          <div className={pageStyles.filterContainer}>
            <div className={pageStyles.searchContainer}>
              <Search size={16} className={pageStyles.searchIcon} />
              <input
                type="text"
                placeholder="Search patient, doctor, speciality..."
                className={pageStyles.searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className={pageStyles.dateFilter}>
              <Calendar size={16} className={pageStyles.dateFilterIcon} />
              <input
                type="date"
                className={pageStyles.dateInput}
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            <select
              className={pageStyles.selectFilter}
              value={filterSpeciality}
              onChange={(e) => setFilterSpeciality(e.target.value)}
            >
              {specialities.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Specialities" : s}
                </option>
              ))}
            </select>

            {(query || filterDate || filterSpeciality !== "all") && (
              <button
                onClick={() => {
                  setQuery("");
                  setFilterDate("");
                  setFilterSpeciality("all");
                }}
                className={pageStyles.clearButton}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className={pageStyles.loadingErrorContainer}>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
            <span>Loading consultations...</span>
          </div>
        )}

        {!loading && error && (
          <div className={pageStyles.errorContainer}>
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className={pageStyles.noResultsContainer}>
            <Calendar size={32} className="mx-auto mb-2 text-emerald-400" />
            <span>No consultations booked.</span>
          </div>
        )}

        {/* Card Grid */}
        <div className={pageStyles.gridContainer}>
          {!loading && !error && displayed.map((a, idx) => {
            const statusLower = (a.status || "").toLowerCase();
            const isCompleted = statusLower === "completed";
            const isCancelled = statusLower === "canceled" || statusLower === "cancelled";
            const isDisabled = isCompleted || isCancelled;

            return (
              <div
                key={a.id}
                style={{
                  animation: `fadeUp 420ms cubic-bezier(.2,.9,.2,1) forwards`,
                  animationDelay: `${idx * 70}ms`,
                  opacity: 0,
                }}
                className={`${pageStyles.card} flex flex-col justify-between h-full`}
              >
                <div>
                  <div className={pageStyles.cardHeader}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={pageStyles.cardTitle}>
                          {a.patientName}
                        </h3>

                        <div className={pageStyles.patientInfo}>
                          <span>{a.age ? `${a.age} yrs` : ""}</span>
                          <span> {a.age ? ":" : ""} </span>
                          <span>{a.gender}</span>
                          <span className="hidden md:inline"> : </span>
                          <span className=" max-w-[120px]">{a.mobile}</span>
                        </div>
                      </div>

                      <div className={pageStyles.doctorInfo}>
                        {a.doctorName} :{" "}
                        <span className={pageStyles.doctorSpeciality}>
                          {a.speciality}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={pageStyles.feeLabel}>
                        Fees
                      </div>
                      <div className={pageStyles.feeAmount}>
                        <BadgeIndianRupee size={16} />
                        <span>{a.fee}</span>
                      </div>
                    </div>
                  </div>

                  {a.notes && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-500">
                      <span className="font-bold text-slate-700 block mb-0.5">Clinical Notes:</span>
                      {a.notes}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100/50 flex flex-wrap items-center justify-between gap-3">
                  <div className={pageStyles.slotContainer}>
                    <Calendar size={14} className={pageStyles.slotIcon} />
                    <span>
                      {formatDateISO(a.slot.date)} — {a.slot.time}
                    </span>
                  </div>

                  <PaymentBadge payment={a.payment} />

                  <div
                    className={`${pageStyles.statusBadge} ${statusClasses(a.status)}`}
                  >
                    {a.status ? a.status.toUpperCase() : "PENDING"}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Admin Cancel */}
                    {isAdmin && (
                      <button
                        onClick={() => adminCancelAppointment(a.id)}
                        title={
                          isDisabled
                            ? isCompleted
                              ? "Cannot cancel a completed appointment"
                              : "Already cancelled"
                            : "Admin Cancel (mark as cancelled)"
                        }
                        disabled={isDisabled}
                        aria-disabled={isDisabled}
                        className={pageStyles.cancelButton(isDisabled, isCompleted)}
                      >
                        {isDisabled
                          ? isCompleted
                            ? "Completed"
                            : "Admin Cancelled"
                          : "Admin Cancel"}
                      </button>
                    )}

                    {/* Doctor Interactive Console */}
                    {isDoctor && !isDisabled && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDoctorAction(a.id, "Completed")}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl transition cursor-pointer"
                          title="Mark Consultation Completed"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleDoctorAction(a.id, "Canceled")}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl transition cursor-pointer"
                          title="Cancel Consultation"
                        >
                          <XCircle size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setActiveActionId(activeActionId === a.id ? null : a.id);
                            setNewTime(a.slot.time);
                            setNewDate(a.slot.date);
                            setNotes(a.notes);
                          }}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
                          title="Reschedule / Add Notes"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reschedule/Notes Inner Console for Doctors */}
                {activeActionId === a.id && (
                  <div className="mt-4 p-4 border border-slate-100 bg-slate-50 rounded-2xl space-y-3.5 animate-fadeIn">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Doctor Clinical Console</h4>
                    
                    {/* Reschedule Slot */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Date</label>
                        <input
                          type="date"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2 py-1 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Time</label>
                        <input
                          type="text"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          placeholder="e.g. 10:30 AM"
                          className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2 py-1 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Medical Notes */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Clinical Notes / Prescription</label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add patient diagnosis or prescription..."
                        className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>

                    {/* Console actions */}
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => setActiveActionId(null)}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => handleDoctorAction(a.id, "Confirmed", { time: newTime, date: newDate, notes })}
                        className="px-3.5 py-1 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                      >
                        Update Record
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {!loading && !error && sortedFiltered.length > 8 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setShowAll(!showAll)}
              className={pageStyles.showMoreButton}
            >
              {showAll ? "Show Less" : "Show More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
