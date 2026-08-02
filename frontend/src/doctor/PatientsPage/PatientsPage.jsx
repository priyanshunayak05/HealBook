import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Search, Activity, Plus, Mail, Phone, Calendar, ArrowRight, Share2, FileText } from "lucide-react";
import AddMedicalRecordModal from "../AddMedicalRecordModal/AddMedicalRecordModal";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDoctorPatients();
  }, []);

  const fetchDoctorPatients = async () => {
    const token = localStorage.getItem("doctorToken_v1");
    if (!token) return;
    setLoading(true);

    try {
      // 1. Fetch from doctor patients endpoint
      const res = await fetch(`${API_BASE}/api/doctor/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.data || data.patients)) {
        setPatients(data.data || data.patients);
      } else {
        // Fallback to appointments grouping
        const apptRes = await fetch(`${API_BASE}/api/doctor/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const apptData = await apptRes.json();
        if (apptRes.ok && apptData.success) {
          const uniqueMap = new Map();
          (apptData.data || apptData.appointments || []).forEach((a) => {
            const pId = a.createdBy || a.userId || a._id;
            if (pId && !uniqueMap.has(pId)) {
              uniqueMap.set(pId, {
                patientId: pId,
                name: a.patientName || "Patient",
                email: a.email || a.patientEmail || "N/A",
                phone: a.mobile || "N/A",
                age: a.age || "N/A",
                gender: a.gender || "N/A",
                lastVisit: a.date || a.createdAt || "N/A",
                consultationCount: 1,
                referralSource: "Self Registered",
              });
            }
          });
          setPatients(Array.from(uniqueMap.values()));
        }
      }
    } catch (err) {
      console.error("Fetch patients error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = patients.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || "").includes(search) ||
      (p.referralSource || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans space-y-8">
      {/* HEADER & SEARCH */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="text-blue-600 w-8 h-8" />
            My Patients
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            View patient profiles, consultation records, referral histories, and medical details.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, email, mobile, source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-full border border-slate-200 bg-white focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* PATIENT CARDS GRID */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 font-medium">Loading patients list...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-500">
          No patients found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((patient) => {
            const isReferral = (patient.referralSource || "").toLowerCase().includes("referral");

            return (
              <div
                key={patient.patientId}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* PATIENT HEADER */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-extrabold text-lg flex items-center justify-center shadow-xs">
                        {(patient.name || "P").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">{patient.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {patient.gender !== "N/A" ? patient.gender : ""}
                          {patient.age !== "N/A" ? ` • Age: ${patient.age}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DETAILS LIST */}
                  <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar size={13} /> Last Visit:
                      </span>
                      <span className="font-semibold text-slate-800">{patient.lastVisit}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <FileText size={13} /> Consultations:
                      </span>
                      <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px]">
                        {patient.consultationCount || 1} Total
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Share2 size={13} /> Source:
                      </span>
                      <span
                        className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                          isReferral
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {patient.referralSource || "Self Registered"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedPatient(patient);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add Record</span>
                  </button>

                  <Link
                    to={`../patient/${encodeURIComponent(patient.patientId)}`}
                    onClick={() => console.log("Selected patient:", patient)}
                    className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 group"
                  >
                    <span>View History</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MEDICAL RECORD MODAL */}
      <AddMedicalRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patient={selectedPatient}
      />
    </div>
  );
}
