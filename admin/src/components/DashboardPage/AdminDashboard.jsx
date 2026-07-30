import React, { useState, useEffect, useMemo } from "react";
import { useAdminAuth } from "../../context/AuthContext";
import { Users, Calendar, Award, IndianRupee, Activity, Grid, Sparkles, TrendingUp, Search, Plus, Loader2 } from "lucide-react";
import { dashboardStyles as s } from "../../assets/dummyStyles";

const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function normalizeDoctor(doc) {
  const id = doc._id || doc.id || String(Math.random()).slice(2);
  const name =
    doc.name ||
    doc.fullName ||
    `${doc.firstName || ""} ${doc.lastName || ""}`.trim() ||
    "Unknown";
  const specialization =
    doc.specialization ||
    doc.speciality ||
    (Array.isArray(doc.specializations)
      ? doc.specializations.join(", ")
      : "") ||
    "General";
  const fee = safeNumber(
    doc.fee ?? doc.fees ?? doc.consultationFee ?? doc.consultation_fee ?? 0,
    0
  );
  const image =
    doc.imageUrl ||
    doc.image ||
    doc.avatar ||
    `https://i.pravatar.cc/150?u=${id}`;

  const appointments = {
    total:
      doc.appointments?.total ??
      doc.totalAppointments ??
      doc.appointmentsTotal ??
      0,
    completed:
      doc.appointments?.completed ??
      doc.completedAppointments ??
      doc.appointmentsCompleted ??
      0,
    canceled:
      doc.appointments?.canceled ??
      doc.canceledAppointments ??
      doc.appointmentsCanceled ??
      0,
  };

  let earnings = null;
  if (doc.earnings !== undefined && doc.earnings !== null)
    earnings = safeNumber(doc.earnings, 0);
  else if (doc.revenue !== undefined && doc.revenue !== null)
    earnings = safeNumber(doc.revenue, 0);
  else if (appointments.completed && fee)
    earnings = fee * safeNumber(appointments.completed, 0);
  else earnings = 0;

  return {
    id,
    name,
    specialization,
    fee,
    image,
    appointments,
    earnings,
    raw: doc,
  };
}

export default function AdminDashboard() {
  const { getToken } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState(null);
  const [patientCount, setPatientCount] = useState(0);
  const [patientCountLoading, setPatientCountLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const API_BASE = "http://localhost:4000";
  const PATIENT_COUNT_API = `${API_BASE}/api/patients/count`;

  useEffect(() => {
    let mounted = true;
    async function loadDoctors() {
      setLoading(true);
      setError(null);
      try {
        const url = `${API_BASE}/api/doctors?limit=200`;
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.message || `Failed to fetch doctors (${res.status})`
          );
        }
        const body = await res.json();
        let list = [];
        if (Array.isArray(body)) list = body;
        else if (Array.isArray(body.doctors)) list = body.doctors;
        else if (Array.isArray(body.data)) list = body.data;
        else if (Array.isArray(body.items)) list = body.items;
        else {
          const firstArray = Object.values(body).find((v) => Array.isArray(v));
          if (firstArray) list = firstArray;
        }
        const normalized = list.map((d) => normalizeDoctor(d));
        if (mounted) setDoctors(normalized);
      } catch (err) {
        console.error("Failed to load doctors:", err);
        if (mounted) {
          setError(err.message || "Failed to load doctors");
          setDoctors([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDoctors();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadPatientCount() {
      setPatientCountLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/api/admin/patients`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          console.warn("Patient count fetch failed:", res.status);
          if (mounted) setPatientCount(0);
          return;
        }

        const body = await res.json().catch(() => ({}));
        const list = body?.data || [];
        const count = Array.isArray(list) ? list.length : 0;
        if (mounted) setPatientCount(count);
      } catch (err) {
        console.error("Failed to fetch patient count:", err);
        if (mounted) setPatientCount(0);
      } finally {
        if (mounted) setPatientCountLoading(false);
      }
    }
    loadPatientCount();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const totalDoctors = doctors.length;
    const totalAppointments = doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.total, 0),
      0
    );
    const totalEarnings = doctors.reduce(
      (s, d) => s + safeNumber(d.earnings, 0),
      0
    );
    const completed = doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.completed, 0),
      0
    );
    const canceled = doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.canceled, 0),
      0
    );
    const totalLoginPatients =
      doctors.reduce((s, d) => s + (d.raw?.loginPatientsCount ?? 0), 0) || 0;
    return {
      totalDoctors,
      totalAppointments,
      totalEarnings,
      completed,
      canceled,
      totalLoginPatients,
    };
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (!query) return doctors;
    const q = query.trim().toLowerCase();
    const qNum = Number(q);
    return doctors.filter((d) => {
      if (d.name.toLowerCase().includes(q)) return true;
      if ((d.specialization || "").toLowerCase().includes(q)) return true;
      if (d.fee.toString().includes(q)) return true;
      if (!Number.isNaN(qNum) && d.fee <= qNum) return true;
      return false;
    });
  }, [doctors, query]);

  const INITIAL_COUNT = 8;
  const visibleDoctors = showAll
    ? filteredDoctors
    : filteredDoctors.slice(0, INITIAL_COUNT);

  if (loading || patientCountLoading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Loading HMS Dashboard Stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-rose-50 border border-rose-100 text-rose-600 p-6 rounded-3xl text-center">
          <h3 className="text-lg font-bold mb-2">Error Loading Dashboard</h3>
          <p className="text-sm mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Sparkles className="text-emerald-500 w-7 h-7" />
              HMS Enterprise Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">Real-time clinician performance, consultation metrics, and roster analytics.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-emerald-50 flex items-center gap-4 hover:shadow-md transition">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Users size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Doctors</div>
              <div className="text-2xl font-bold text-slate-800 mt-0.5">{totals.totalDoctors}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-emerald-50 flex items-center gap-4 hover:shadow-md transition">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Activity size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Patients</div>
              <div className="text-2xl font-bold text-slate-800 mt-0.5">{patientCount}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-emerald-50 flex items-center gap-4 hover:shadow-md transition">
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
              <Calendar size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bookings</div>
              <div className="text-2xl font-bold text-slate-800 mt-0.5">{totals.totalAppointments}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-emerald-50 flex items-center gap-4 hover:shadow-md transition">
            <div className="p-3.5 bg-teal-50 text-teal-600 rounded-2xl">
              <Award size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</div>
              <div className="text-2xl font-bold text-slate-800 mt-0.5">{totals.completed}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-emerald-50 flex items-center gap-4 hover:shadow-md transition">
            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
              <IndianRupee size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</div>
              <div className="text-2xl font-bold text-slate-800 mt-0.5">₹ {totals.totalEarnings.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 bg-white p-5 rounded-3xl border border-emerald-100/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search doctors by name, specialty, or fee..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-100 bg-slate-50/50 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Doctors Directory Table */}
        <div className="bg-white rounded-3xl border border-emerald-100/50 shadow-sm overflow-hidden font-sans">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">Hospital Clinicians Directory</h3>
            <span className="text-xs text-slate-400 font-semibold">{filteredDoctors.length} doctors found</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className={s.tableHead}>
                <tr>
                  <th className={s.tableHeaderCell}>Doctor</th>
                  <th className={s.tableHeaderCell}>Specialization</th>
                  <th className={s.tableHeaderCell}>Fee</th>
                  <th className={s.tableHeaderCell}>Appointments</th>
                  <th className={s.tableHeaderCell}>Completed</th>
                  <th className={s.tableHeaderCell}>Canceled</th>
                  <th className={s.tableHeaderCell}>Total Earnings</th>
                </tr>
              </thead>

              <tbody className={s.tableBody}>
                {visibleDoctors.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={s.tableRow + " " + 
                      (idx % 2 === 0 ? s.tableRowEven : s.tableRowOdd)}
                  >
                    <td className={s.tableCell + " " + s.tableCellFlex}>
                      <div className={s.verticalLine} />
                      <img
                        src={d.image}
                        alt={d.name}
                        className={s.doctorImage}
                      />
                      <div>
                        <div className={s.doctorName}>
                          {d.name}
                        </div>
                        <div className={s.doctorId}>
                          ID: {d.id}
                        </div>
                      </div>
                    </td>

                    <td className={s.tableCell + " " + s.doctorSpecialization}>
                      {d.specialization}
                    </td>

                    <td className={s.tableCell + " " + s.feeText}>
                      ₹ {d.fee}
                    </td>

                    <td className={s.tableCell + " " + s.appointmentsText}>
                      {d.appointments.total}
                    </td>

                    <td className={s.tableCell + " " + s.completedText}>
                      {d.appointments.completed}
                    </td>

                    <td className={s.tableCell + " " + s.canceledText}>
                      {d.appointments.canceled}
                    </td>

                    <td className={s.tableCell + " " + s.earningsText}>
                      ₹ {d.earnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDoctors.length > INITIAL_COUNT && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-6 py-2 rounded-full border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition text-xs cursor-pointer shadow-xs"
              >
                {showAll ? "Show Less" : "Show All Doctors"}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
