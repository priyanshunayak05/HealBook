import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, CheckCircle, XCircle, Search, User, Phone, BadgeIndianRupee, Activity, Plus } from "lucide-react";
import { listPageStyles } from "../../assets/dummyStyles";
import AddMedicalRecordModal from "../AddMedicalRecordModal/AddMedicalRecordModal";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

function parseDateTime(date, time) {
  return new Date(`${date}T${time || "00:00"}:00`);
}

function formatTimeAMPM(time24) {
  if (!time24) return "";
  const [hh, mm] = time24.split(":");
  let h = parseInt(hh, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mm} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function to24HourFromMaybe12(timeStr) {
  if (!timeStr) return "00:00";
  const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return timeStr;
  let hh = Number(m[1]);
  const mm = m[2];
  const ampm = m[3];
  if (!ampm) return `${String(hh).padStart(2, "0")}:${mm}`;
  const up = ampm.toUpperCase();
  if (up === "AM") {
    if (hh === 12) hh = 0;
  } else {
    if (hh !== 12) hh += 12;
  }
  return `${String(hh).padStart(2, "0")}:${mm}`;
}

function to12HourFrom24(hhmm) {
  if (!hhmm) return "12:00 AM";
  const [hh, mm] = hhmm.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(h12)}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function backendToFrontendStatus(s) {
  if (!s) return "pending";
  const v = String(s).toLowerCase();
  if (v === "pending") return "pending";
  if (v === "confirmed") return "confirmed";
  if (v === "completed" || v === "complete") return "complete";
  if (v === "canceled" || v === "cancelled") return "cancelled";
  if (v === "rescheduled") return "rescheduled";
  return v;
}

function frontendToBackendStatus(fs) {
  if (!fs) return "Pending";
  const v = String(fs).toLowerCase();
  if (v === "pending") return "Pending";
  if (v === "confirmed") return "Confirmed";
  if (v === "complete") return "Completed";
  if (v === "cancelled") return "Canceled";
  if (v === "rescheduled") return "Rescheduled";
  return fs;
}

function normalizeAppointment(a) {
  if (!a) return null;
  const id = a._id || a.id || String(Math.random()).slice(2);
  const patient = a.patientName || a.patient || a.name || "Unknown";
  const age = a.age ?? a.patientAge ?? "";
  const gender = a.gender || "";
  const doctorName =
    (a.doctorId && a.doctorId.name) || a.doctorName || a.doctor || "";
  const doctorImage =
    (a.doctorId && (a.doctorId.imageUrl || a.doctorId.image)) ||
    a.doctorImage ||
    a.doctorImageUrl ||
    "";
  const speciality =
    (a.doctorId && (a.doctorId.specialization || a.doctorId.speciality)) ||
    a.speciality ||
    a.specialization ||
    "";
  const mobile = a.mobile || a.phone || "";
  const fee = Number(a.fees ?? a.fee ?? a.payment?.amount ?? 0) || 0;
  const date = a.date || (a.slot && a.slot.date) || "";
  const rawTime =
    a.time ||
    (a.slot && a.slot.time) ||
    (a.hour != null
      ? `${String(a.hour).padStart(2, "0")}:${String(a.minute || 0).padStart(
          2,
          "0",
        )}`
      : "");
  const time = to24HourFromMaybe12(rawTime);
  const status = backendToFrontendStatus(
    a.status || "pending",
  );
  const paymentMethod = a.payment?.method || a.paymentMethod || "Cash";
  const paymentStatus = a.payment?.status || a.paymentStatus || "Pending";

  const email = a.email || a.patientEmail || "";
  const patientId = a.createdBy || a.userId || a.patientClerkId || a.patientId || email || id;

  return {
    id,
    patient,
    patientId,
    email,
    createdBy: a.createdBy || a.userId || patientId,
    userId: a.userId || a.createdBy || patientId,
    age,
    gender,
    doctorName,
    doctorImage,
    speciality,
    mobile,
    date,
    time,
    fee,
    status,
    paymentMethod,
    paymentStatus,
    raw: a,
  };
}

function PaymentBadge({ method, status }) {
  const isCashPending = method === "Cash" && status === "Pending";
  const isPaid = status === "Paid";

  if (isCashPending) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
        💰 Cash: Payment Pending
      </span>
    );
  }

  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        ✓ {method}: Paid
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
      {method}: {status}
    </span>
  );
}

function StatusBadge({ status }) {
  const base = listPageStyles.statusBadgeBase;
  if (status === "complete")
    return (
      <span className={`${base} ${listPageStyles.statusBadgeComplete}`}>
        Completed
      </span>
    );
  if (status === "cancelled")
    return (
      <span className={`${base} ${listPageStyles.statusBadgeCancelled}`}>
        Cancelled
      </span>
    );
  if (status === "confirmed")
    return (
      <span className={`${base} ${listPageStyles.statusBadgeConfirmed}`}>
        Confirmed
      </span>
    );
  if (status === "rescheduled")
    return (
      <span className={`${base} ${listPageStyles.statusBadgeRescheduled}`}>
        Rescheduled
      </span>
    );
  return (
    <span className={`${base} ${listPageStyles.statusBadgePending}`}>
      Pending
    </span>
  );
}

function StatusSelect({ appointment, onChange }) {
  const terminal =
    appointment.status === "complete" || appointment.status === "cancelled";

  if (appointment.status === "rescheduled") {
    return (
      <select
        value={appointment.status}
        onChange={(e) => onChange(e.target.value)}
        className={`${listPageStyles.statusSelect} ${
          terminal
            ? listPageStyles.statusSelectDisabled
            : listPageStyles.statusSelectEnabled
        }`}
        title="After reschedule you can mark Completed or Cancelled"
      >
        <option value="rescheduled" disabled>
          Rescheduled
        </option>
        <option value="complete">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    );
  }

  const options = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "complete", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <select
      value={appointment.status}
      onChange={(e) => onChange(e.target.value)}
      disabled={terminal}
      className={`${listPageStyles.statusSelect} ${
        terminal
          ? listPageStyles.statusSelectDisabled
          : listPageStyles.statusSelectEnabled
      }`}
      title={terminal ? "Status cannot be changed" : "Change status"}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="text-sm">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function RescheduleButton({ appointment, onReschedule }) {
  const terminal =
    appointment.status === "complete" || appointment.status === "cancelled";
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(appointment.date || "");
  const [time, setTime] = useState(appointment.time || "09:00");

  const minDate = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  useEffect(() => {
    const apptRaw = appointment.date ? String(appointment.date) : "";
    const apptDate = apptRaw.slice(0, 10);
    setDate(apptDate && apptDate >= minDate ? apptDate : minDate);
    setTime(appointment.time || "09:00");
  }, [appointment.date, appointment.time, minDate]);

  function save() {
    if (!date || !time) return;
    if (date < minDate) {
      setDate(minDate);
      return;
    }
    onReschedule(date, time);
    setEditing(false);
  }

  function cancel() {
    const apptRaw = appointment.date ? String(appointment.date) : "";
    const apptDate = apptRaw.slice(0, 10);
    setDate(apptDate && apptDate >= minDate ? apptDate : minDate);
    setTime(appointment.time || "09:00");
    setEditing(false);
  }

  return (
    <div className="w-full">
      {!editing ? (
        <div className="flex justify-end">
          <button
            onClick={() => setEditing(true)}
            disabled={terminal}
            title={
              terminal ? "Cannot reschedule completed/cancelled" : "Reschedule"
            }
            className={`${listPageStyles.rescheduleButton} ${
              terminal
                ? listPageStyles.rescheduleButtonDisabled
                : listPageStyles.rescheduleButtonEnabled
            }`}
          >
            Reschedule
          </button>
        </div>
      ) : (
        <div className={listPageStyles.rescheduleForm}>
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={(e) => setDate(e.target.value)}
            className={listPageStyles.dateInput}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={listPageStyles.timeInput}
          />
          <div className={listPageStyles.rescheduleButtons}>
            <button onClick={save} className={listPageStyles.saveButton}>
              Save
            </button>
            <button onClick={cancel} className={listPageStyles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListPage() {
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRecordAppt, setActiveRecordAppt] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const params = useParams();
  const doctorId = params.id;

  async function fetchAppointments() {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/api/appointments/doctor/${encodeURIComponent(
        doctorId,
      )}`;

      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message || `Failed to fetch appointments (${res.status})`,
        );
      }
      const body = await res.json();
      const list = Array.isArray(body.appointments)
        ? body.appointments
        : Array.isArray(body)
          ? body
          : (body.items ?? body.data ?? []);

      const normalized = (Array.isArray(list) ? list : [])
        .map(normalizeAppointment)
        .filter(Boolean);

      setAppointments(normalized);
    } catch (err) {
      console.error("fetchAppointments:", err);
      setError(err.message || "Failed to load appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (doctorId) {
      fetchAppointments();
    }
  }, [doctorId]);

  async function updateStatusRemote(id, newStatus) {
    try {
      const backendStatus = frontendToBackendStatus(newStatus);
      const token = localStorage.getItem("doctorToken_v1");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/appointments/status/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: backendStatus }),
      });
      if (!res.ok) {
        throw new Error(`Failed to update status (${res.status})`);
      }
      const body = await res.json();
      const updated = body.appointment || body.data;
      if (updated) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: backendToFrontendStatus(updated.status || newStatus) } : a
          )
        );
      }
    } catch (err) {
      console.error("updateStatusRemote:", err);
      alert("Failed to update status.");
    }
  }

  async function rescheduleRemote(id, newDate, newTime) {
    try {
      const token = localStorage.getItem("doctorToken_v1");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/appointments/reschedule/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ date: newDate, time: newTime }),
      });
      if (!res.ok) {
        throw new Error(`Failed to reschedule (${res.status})`);
      }
      const body = await res.json();
      const updated = body.appointment || body.data;
      if (updated) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  date: updated.date || newDate,
                  time: to24HourFromMaybe12(updated.time || newTime),
                  status: backendToFrontendStatus(updated.status || "rescheduled"),
                }
              : a
          )
        );
      }
    } catch (err) {
      console.error("rescheduleRemote:", err);
      alert("Failed to reschedule.");
    }
  }

  function updateStatus(id, newStatus) {
    updateStatusRemote(id, newStatus);
  }

  function updateDateTime(id, newDate, newTime) {
    rescheduleRemote(id, newDate, newTime);
  }

  const filtered = useMemo(() => {
    return [...appointments]
      .filter((a) =>
        search
          ? (a.patient || "").toLowerCase().includes(search.toLowerCase())
          : true,
      )
      .filter((a) => (statusFilter ? a.status === statusFilter : true))
      .sort(
        (a, b) => parseDateTime(b.date, b.time) - parseDateTime(a.date, a.time),
      );
  }, [appointments, search, statusFilter]);

  return (
    <div className={listPageStyles.pageContainer}>
      <div className={listPageStyles.contentWrapper}>
        <div className={listPageStyles.headerContainer}>
          <div>
            <h1 className={listPageStyles.headerTitle}>Patient Appointments</h1>
            <p className={listPageStyles.headerSubtitle}>
              View and manage your patient appointment schedules and consultations
            </p>
          </div>

          <div className={listPageStyles.searchFilterContainer}>
            <div className={listPageStyles.searchContainer}>
              <span className={listPageStyles.searchIconContainer}>
                <Search className={listPageStyles.searchIcon} />
              </span>
              <input
                type="text"
                placeholder="Search patient name..."
                className={listPageStyles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className={listPageStyles.clearSearchButton}
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={listPageStyles.statusFilter}
              title="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="complete">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className={listPageStyles.loadingContainer}>
            <p className="text-lg font-semibold animate-pulse">Loading appointments...</p>
          </div>
        )}

        {!loading && error && (
          <div className={listPageStyles.errorContainer}>
            <p className="text-lg font-semibold">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-blue-100 shadow-sm">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-blue-300" />
            <p className="text-gray-600 font-medium">No appointments found.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className={listPageStyles.appointmentsGrid}>
            {filtered.map((a) => (
              <div key={a.id} className={listPageStyles.appointmentCard}>
                <div>
                  <div className={listPageStyles.cardHeader}>
                    <div className={listPageStyles.cardAvatar}>
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className={listPageStyles.cardContent}>
                      <h3 className={listPageStyles.cardPatientName}>{a.patient}</h3>
                      <p className={listPageStyles.cardPatientInfo}>
                        {a.gender} • {a.age} years
                      </p>
                    </div>
                  </div>

                  <div className={listPageStyles.contactStatusSection}>
                    {a.mobile && (
                      <div className={listPageStyles.phoneContainer}>
                        <Phone className={listPageStyles.phoneIcon} />
                        <span className={listPageStyles.phoneNumber}>{a.mobile}</span>
                      </div>
                    )}
                    <div className={listPageStyles.statusContainer}>
                      <StatusBadge status={a.status} />
                      <StatusSelect
                        appointment={a}
                        onChange={(s) => updateStatus(a.id, s)}
                      />
                    </div>
                  </div>

                  <div className="mt-2 mb-2 flex items-center justify-between">
                    <PaymentBadge method={a.paymentMethod} status={a.paymentStatus} />
                  </div>

                  <div className={listPageStyles.dateTimeSection}>
                    <div className={listPageStyles.dateTimeContainer}>
                      <Calendar className={listPageStyles.calendarIcon} />
                      <span className={listPageStyles.dateText}>{formatDate(a.date)}</span>
                      <span>•</span>
                      <span>{formatTimeAMPM(a.time)}</span>
                    </div>
                    <div className={listPageStyles.feeText}>Fees: ₹{a.fee}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => {
                        setActiveRecordAppt(a);
                        setIsRecordModalOpen(true);
                      }}
                      className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Add Record</span>
                    </button>

                    <Link
                      to={`../patient/${encodeURIComponent(a.patientId)}`}
                      className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                    >
                      <Activity size={14} />
                      <span>Patient Profile</span>
                    </Link>
                  </div>
                </div>

                <div className={listPageStyles.rescheduleContainer}>
                  <RescheduleButton
                    appointment={a}
                    onReschedule={(newDate, newTime) => updateDateTime(a.id, newDate, newTime)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddMedicalRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        appointment={activeRecordAppt?.raw || activeRecordAppt}
        patient={{
          patientId: activeRecordAppt?.patientId,
          name: activeRecordAppt?.patient,
          email: activeRecordAppt?.email,
          clerkId: activeRecordAppt?.patientId,
        }}
      />
    </div>
  );
}
