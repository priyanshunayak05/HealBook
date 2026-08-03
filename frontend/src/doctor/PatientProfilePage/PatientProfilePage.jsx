import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  User,
  Activity,
  Calendar,
  Phone,
  Mail,
  Droplet,
  FileText,
  Pill,
  FileDown,
  Share2,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MapPin,
  ShieldCheck,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import AddMedicalRecordModal from "../AddMedicalRecordModal/AddMedicalRecordModal";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

export default function PatientProfilePage() {
  const { patientId } = useParams();
  const location = useLocation();

  const selectedPatient = location.state?.patient;

  const finalPatient = selectedPatient || { patientId };
  const [activeTab, setActiveTab] = useState("history"); // history, prescriptions, reports, referrals

  const [patientDetails, setPatientDetails] = useState(selectedPatient || null);;
  const [history, setHistory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [referrals, setReferrals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPatientData(1);
  }, [patientId, selectedPatient]);

  const fetchPatientData = async (targetPage = 1) => {
    const token = localStorage.getItem("doctorToken_v1");
    if (!token) return;

    console.log("History requested patientId:", patientId);

    if (targetPage === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      // 1. Fetch patient history & demographics
      const historyRes = await fetch(`${API_BASE}/api/patients/${encodeURIComponent(patientId)}/history?page=${targetPage}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const historyData = await historyRes.json();

      if (historyData.success) {
        const consults = historyData.consultations || historyData.data || historyData.records || [];
        if (targetPage === 1) {
          setHistory(consults);
        } else {
          setHistory((prev) => [...prev, ...consults]);
        }
        setHasMore(historyData.meta?.hasMore || false);

        if (historyData.patientDetails) {

          setPatientDetails((prev) => ({
            ...historyData.patientDetails,

            // Keep My Patients full name
            name:
              selectedPatient?.name ||
              historyData.patientDetails.name ||
              prev?.name ||
              "Patient",

            phone:
              selectedPatient?.phone ||
              historyData.patientDetails.phone ||
              prev?.phone ||
              "N/A",

            email:
              selectedPatient?.email ||
              historyData.patientDetails.email ||
              prev?.email ||
              "N/A",

            patientId:
              selectedPatient?.patientId ||
              patientId
          }));

        } else if (consults.length > 0 && targetPage === 1) {
          const latest = consults[0];
          setPatientDetails((prev) => ({
            name: latest.patientName || prev?.name || "Patient",
            email: latest.patientEmail || prev?.email || patientId,
            phone: latest.mobile || prev?.phone || "N/A",
            gender: latest.gender || prev?.gender || "N/A",
            age: latest.age || prev?.age || "N/A",
            bloodGroup: prev?.bloodGroup || "Not Specified",
            address: prev?.address || "N/A",
            emergencyContact: prev?.emergencyContact || "N/A",
          }));
        }

        // Referrals from API
        if (historyData.referralHistory || historyData.referrals) {
          setReferrals(historyData.referralHistory || historyData.referrals);
        }
      }

      // 2. Fetch prescriptions
      if (targetPage === 1) {
        const presRes = await fetch(`${API_BASE}/api/patient/${encodeURIComponent(patientId)}/prescriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const presData = await presRes.json();
        if (presData.success) {
          setPrescriptions(presData.data || presData.prescriptions || []);
        }

        // 3. Fallback fetch referrals if not present
        if (!historyData.referralHistory) {
          const refRes = await fetch(`${API_BASE}/api/referrals/outgoing`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const refData = await refRes.json();
          if (refData.success) {
            const patientRefs = (refData.data || []).filter((r) => String(r.patientId) === String(patientId));
            setReferrals(patientRefs);
          }
        }

        // 4. Fallback appointment search for details if missing
        try {
          const apptRes = await fetch(`${API_BASE}/api/doctor/appointments`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const apptData = await apptRes.json();
          if (apptData.success && Array.isArray(apptData.data || apptData.appointments)) {
            const appts = apptData.data || apptData.appointments;
            const match = appts.find(
              (a) =>
                String(a.createdBy) === String(patientId) ||
                String(a.userId) === String(patientId) ||
                String(a._id) === String(patientId) ||
                (a.email && a.email.toLowerCase() === String(patientId).toLowerCase())
            );
            if (match) {
              setPatientDetails((prev) => ({
                patientId: String(patientId),
                name: prev?.name && prev?.name !== "Patient" ? prev.name : match.patientName || "Patient",
                email: prev?.email && prev?.email !== "N/A" ? prev.email : match.email || match.patientEmail || patientId,
                phone: prev?.phone && prev?.phone !== "N/A" ? prev.phone : match.mobile || "N/A",
                gender: prev?.gender && prev?.gender !== "N/A" ? prev.gender : match.gender || "N/A",
                age: prev?.age && prev?.age !== "N/A" ? prev.age : match.age || "N/A",
                bloodGroup: prev?.bloodGroup || "Not Specified",
                address: prev?.address || "N/A",
                emergencyContact: prev?.emergencyContact || match.mobile || "N/A",
              }));
            }
          }
        } catch (e) {
          console.warn("Appointment lookup for profile fallback skipped:", e?.message);
        }
      }
    } catch (err) {
      console.error("Fetch patient profile error:", err);
      toast.error("Failed to load patient profile details.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPatientData(nextPage);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans space-y-8">
      {/* BASIC INFORMATION HEADER CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md">
              {patientDetails?.name ? patientDetails.name.charAt(0).toUpperCase() : "P"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {patientDetails?.name || "Patient Details"}
                </h1>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                  Patient ID: {patientId.slice(0, 12)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <User size={14} className="text-slate-400" />
                  {patientDetails?.gender || "N/A"} {patientDetails?.age && patientDetails.age !== "N/A" ? `• Age: ${patientDetails.age}` : ""}
                </span>
                <span className="flex items-center gap-1 text-rose-600 font-semibold">
                  <Droplet size={14} />
                  Blood Group: {patientDetails?.bloodGroup || "Not Specified"}
                </span>
                <span className="flex items-center gap-1">
                  <Mail size={14} className="text-slate-400" />
                  {patientDetails?.email || "No email"}
                </span>
                <span className="flex items-center gap-1">
                  <Phone size={14} className="text-slate-400" />
                  {patientDetails?.phone || "No phone"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 hover:shadow-lg transition"
            >
              <Plus size={16} />
              <span>Add Consultation Record</span>
            </button>
          </div>
        </div>

        {/* DEMOGRAPHICS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Address</span>
            <span className="font-semibold text-slate-800 mt-0.5 block truncate">{patientDetails?.address || "Registered Address"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Emergency Contact</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">{patientDetails?.emergencyContact || patientDetails?.phone || "N/A"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Access Privilege</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-200">
              ✓ Full Continuity Access
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Record Ownership</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">Permanent Single Profile</span>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="border-b border-slate-200 flex space-x-8 overflow-x-auto">
        {[
          { id: "history", label: "Medical History Timeline", icon: Activity, count: history.length },
          { id: "prescriptions", label: "Prescription History", icon: Pill, count: prescriptions.length },
          { id: "reports", label: "Diagnostic Reports", icon: FileDown, count: history.reduce((acc, r) => acc + (r.uploadedReports?.length || 0), 0) },
          { id: "referrals", label: "Referral History", icon: Share2, count: referrals.length },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-4 text-xs font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 font-medium">Loading patient history and medical records...</div>
      ) : (
        <div>
          {/* 1. MEDICAL HISTORY TIMELINE */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="text-blue-600 w-5 h-5" />
                  Medical History Consultations Timeline (Max Last 10 Records)
                </h2>
                <span className="text-xs text-slate-500 font-medium">Sorted latest first</span>
              </div>

              {history.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-500 space-y-3">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="font-semibold">No previous consultation records found for this patient.</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition"
                  >
                    Add Consultation Record
                  </button>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-blue-100">
                  {history.map((record, index) => (
                    <div key={record._id || index} className="relative pl-12">
                      {/* Timeline Node */}
                      <div className="absolute left-4 top-5 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-100 flex items-center justify-center"></div>

                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4 hover:border-blue-200 transition">
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">Dr. {record.doctorName || record.doctor || "Attending Doctor"}</div>
                            <div className="text-xs text-blue-600 font-semibold">{record.department || "General Practice"}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-800">{record.date || (record.createdAt ? new Date(record.createdAt).toLocaleDateString("en-GB") : "")}</div>
                            {record.followUpDate && (
                              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                                Follow-up: {record.followUpDate}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Symptoms & Diagnosis */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl">
                          {record.symptoms && (
                            <div>
                              <div className="text-[11px] font-bold text-slate-400 uppercase">Symptoms</div>
                              <div className="text-xs text-slate-700 font-medium mt-0.5">{record.symptoms}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase">Diagnosis</div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5">{record.diagnosis || "N/A"}</div>
                          </div>
                        </div>

                        {/* Prescription */}
                        {record.prescription && record.prescription.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Pill size={14} className="text-blue-600" />
                              Prescribed Medications:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {record.prescription.map((m, idx) => (
                                <div key={idx} className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl text-xs flex justify-between items-center">
                                  <div>
                                    <span className="font-bold text-slate-800">{m.medicineName}</span>
                                    <span className="text-slate-500 ml-1.5">({m.dosage})</span>
                                  </div>
                                  <div className="text-right text-[11px] text-blue-700 font-semibold">
                                    {m.frequency} • {m.duration}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {record.doctorNotes && (
                          <div className="text-xs text-slate-600 bg-amber-50/60 border border-amber-100 p-3 rounded-xl">
                            <span className="font-bold text-amber-900">Medical Notes: </span>
                            {record.doctorNotes}
                          </div>
                        )}

                        {/* Attached Reports */}
                        {record.uploadedReports && record.uploadedReports.length > 0 && (
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-xs font-bold text-slate-600">Reports:</span>
                            {record.uploadedReports.map((rep, rIdx) => (
                              <a
                                key={rIdx}
                                href={typeof rep === "string" ? rep : rep.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-full text-xs font-semibold transition border border-slate-200"
                              >
                                <FileDown size={12} />
                                {typeof rep === "string" ? `Report #${rIdx + 1}` : rep.name || `Report #${rIdx + 1}`}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasMore && (
                <div className="text-center pt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-blue-200 text-blue-700 font-bold text-xs rounded-full hover:bg-blue-50 shadow-xs transition"
                  >
                    <RefreshCw size={14} className={loadingMore ? "animate-spin" : ""} />
                    {loadingMore ? "Loading Records..." : "Load Older Consultations"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. PRESCRIPTIONS HISTORY (READ-ONLY) */}
          {activeTab === "prescriptions" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Pill className="text-blue-600 w-5 h-5" />
                  Prescription History across Consultations
                </h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[11px] font-bold">
                  <Lock size={12} />
                  <span>Previous prescriptions are read-only</span>
                </div>
              </div>

              {prescriptions.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-500">
                  No active or past prescription records found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prescriptions.map((p, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:border-blue-200 transition space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{p.medicineName}</h3>
                          <span className="text-xs font-semibold text-blue-600">{p.dosage}</span>
                        </div>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                          {p.date}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2">
                        <div><span className="font-semibold text-slate-700">Frequency:</span> {p.frequency}</div>
                        <div><span className="font-semibold text-slate-700">Duration:</span> {p.duration}</div>
                        <div><span className="font-semibold text-slate-700">Prescribed Doctor:</span> {p.doctorName}</div>
                        {p.diagnosis && <div><span className="font-semibold text-slate-700">For Diagnosis:</span> {p.diagnosis}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. DIAGNOSTIC REPORTS TAB */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileDown className="text-blue-600 w-5 h-5" />
                Uploaded Clinical & Diagnostic Reports
              </h2>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
                {history.flatMap((r) => r.uploadedReports || []).length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No uploaded diagnostic report files available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {history.flatMap((r) => r.uploadedReports || []).map((rep, idx) => (
                      <a
                        key={idx}
                        href={typeof rep === "string" ? rep : rep.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs group-hover:text-blue-700">
                              {typeof rep === "string" ? `Report File #${idx + 1}` : rep.name || `Report #${idx + 1}`}
                            </div>
                            <div className="text-[10px] text-slate-400">Click to view report</div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. REFERRAL HISTORY TIMELINE */}
          {activeTab === "referrals" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Share2 className="text-blue-600 w-5 h-5" />
                Doctor-to-Doctor Referral History Timeline
              </h2>

              {referrals.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-500 font-medium">
                  No active doctor referrals recorded for this patient.
                </div>
              ) : (
                <div className="space-y-4">
                  {referrals.map((ref) => (
                    <div key={ref._id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3 hover:border-blue-200 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Dr. {ref.fromDoctorName || "Doctor"} → Dr. {ref.toDoctorName || "Specialist"}
                          </div>
                          <div className="text-xs text-blue-600 font-semibold mt-0.5">
                            Specialization Required: {ref.specialization || "General Specialization"}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${ref.status === "accepted" ? "bg-emerald-100 text-emerald-800" :
                            ref.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                          }`}>
                          {ref.status}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-2xl text-xs text-slate-700 border border-slate-100">
                        <span className="font-bold text-slate-900">Clinical Reason: </span>
                        {ref.reason}
                        {ref.symptoms && (
                          <div className="mt-1">
                            <span className="font-bold text-slate-900">Symptoms: </span>
                            {ref.symptoms}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-2 border-t border-slate-100">
                        <span>Referred Date: {new Date(ref.createdAt).toLocaleDateString("en-GB")}</span>
                        {ref.acceptedAt && (
                          <span className="text-emerald-600 font-semibold">
                            Accepted: {new Date(ref.acceptedAt).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ADD MEDICAL RECORD MODAL */}
      <AddMedicalRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patient={patientDetails}
        onSuccess={() => fetchPatientData(1)}
      />
    </div>
  );
}
