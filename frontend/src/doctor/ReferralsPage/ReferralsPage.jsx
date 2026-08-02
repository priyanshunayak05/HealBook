import React, { useState, useEffect } from "react";
import { Share2, UserCheck, Send, CheckCircle2, XCircle, Clock, AlertCircle, FileText, Check, X, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

export default function ReferralsPage() {
  const [activeTab, setActiveTab] = useState("incoming"); // incoming, outgoing, new

  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);

  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [reason, setReason] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [attachedReportsUrl, setAttachedReportsUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReferralsData();
    fetchDoctorsAndPatients();
  }, []);

  const fetchReferralsData = async () => {
    const token = localStorage.getItem("doctorToken_v1");
    if (!token) return;
    setLoading(true);
    try {
      const [incRes, outRes] = await Promise.all([
        fetch(`${API_BASE}/api/referrals/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/referrals/outgoing`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const incData = await incRes.json();
      const outData = await outRes.json();

      if (incData.success) setIncoming(incData.data || incData.referrals || []);
      if (outData.success) setOutgoing(outData.data || outData.referrals || []);
    } catch (err) {
      console.error("Fetch referrals error:", err);
      toast.error("Failed to load doctor referrals.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorsAndPatients = async () => {
    const token = localStorage.getItem("doctorToken_v1");
    try {
      // Fetch list of doctors for target selection
      const docsRes = await fetch(`${API_BASE}/api/doctors`);
      const docsData = await docsRes.json();
      if (docsData.success) setDoctorsList(docsData.data || docsData.doctors || []);

      // Fetch doctor's patients list
      if (token) {
        const patientsRes = await fetch(`${API_BASE}/api/doctor/patients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const patientsData = await patientsRes.json();
        if (patientsData.success && Array.isArray(patientsData.data || patientsData.patients)) {
          setPatientsList(patientsData.data || patientsData.patients);
        } else {
          // Fallback to appointments
          const apptsRes = await fetch(`${API_BASE}/api/doctor/appointments`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const apptsData = await apptsRes.json();
          if (apptsData.success) {
            const uniqueMap = new Map();
            (apptsData.data || apptsData.appointments || []).forEach((a) => {
              const pId = a.createdBy || a.userId || a._id;
              if (pId && !uniqueMap.has(pId)) {
                uniqueMap.set(pId, { patientId: pId, name: a.patientName, email: a.email || a.patientEmail || "" });
              }
            });
            setPatientsList(Array.from(uniqueMap.values()));
          }
        }
      }
    } catch (err) {
      console.warn("Fetch metadata error:", err);
    }
  };

  const handleSendReferral = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("doctorToken_v1");
    if (!token) return;

    if (!selectedPatientId || !selectedDoctorId || !reason.trim()) {
      toast.error("Please select a patient, target doctor, and enter a reason.");
      return;
    }

    const patientObj = patientsList.find((p) => (p.patientId || p.id) === selectedPatientId);
    const doctorObj = doctorsList.find((d) => d._id === selectedDoctorId || d.id === selectedDoctorId);

    setSubmitting(true);
    try {
      const reports = attachedReportsUrl.trim() ? [attachedReportsUrl.trim()] : [];

      const res = await fetch(`${API_BASE}/api/referrals/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatientId,
          patientName: patientObj?.name || "Patient",
          patientEmail: patientObj?.email || "",
          toDoctorId: selectedDoctorId,
          specialization: selectedSpecialization || doctorObj?.specialization || doctorObj?.speciality || "",
          reason: reason.trim(),
          symptoms: symptoms.trim(),
          attachedReports: reports,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Referral sent successfully to Dr. ${doctorObj?.name || "Specialist"}!`);
        setSelectedPatientId("");
        setSelectedDoctorId("");
        setSelectedSpecialization("");
        setReason("");
        setSymptoms("");
        setAttachedReportsUrl("");
        setActiveTab("outgoing");
        fetchReferralsData();
      } else {
        toast.error(data.message || "Failed to send referral");
      }
    } catch (err) {
      console.error("Send referral error:", err);
      toast.error("Network error while sending referral.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptReferral = async (referral) => {
    const token = localStorage.getItem("doctorToken_v1");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/referrals/${referral._id}/accept`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Referral accepted! ${referral.patientName} is now in your patient list.`);
        fetchReferralsData();
      } else {
        toast.error(data.message || "Failed to accept referral");
      }
    } catch (err) {
      console.error("Accept referral error:", err);
      toast.error("Network error while accepting referral.");
    }
  };

  const handleRejectReferral = async (referral) => {
    const token = localStorage.getItem("doctorToken_v1");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/referrals/${referral._id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Referral rejected.");
        fetchReferralsData();
      } else {
        toast.error(data.message || "Failed to reject referral");
      }
    } catch (err) {
      console.error("Reject referral error:", err);
      toast.error("Network error while rejecting referral.");
    }
  };

  const filteredDoctors = selectedSpecialization
    ? doctorsList.filter((d) => (d.specialization || d.speciality || "").toLowerCase().includes(selectedSpecialization.toLowerCase()))
    : doctorsList;

  const pendingCount = incoming.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Share2 className="text-blue-600 w-8 h-8" />
            Referral Requests & Continuity
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Accept patient referrals to automatically grant access to their complete medical history without duplicate profiles.
          </p>
        </div>

        <button
          onClick={() => setActiveTab("new")}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-full font-bold text-xs shadow-md hover:bg-blue-700 transition inline-flex items-center gap-2"
        >
          <Send size={14} />
          <span>New Doctor Referral</span>
        </button>
      </div>

      {/* NOTIFICATION BANNER IF PENDING REFERRALS EXIST */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-center justify-between gap-4 text-amber-900 text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">
                You have {pendingCount} pending patient referral request{pendingCount > 1 ? "s" : ""} waiting for your review.
              </p>
              <p className="text-[11px] text-amber-700 font-normal">
                Accepting a referral automatically connects the patient to your patient dashboard with full history access.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("incoming")}
            className="px-3.5 py-1.5 bg-amber-600 text-white rounded-full font-bold text-[11px] hover:bg-amber-700 transition shrink-0"
          >
            Review Now
          </button>
        </div>
      )}

      {/* TABS */}
      <div className="border-b border-slate-200 flex space-x-8">
        {[
          { id: "incoming", label: "Referral Requests (Pending)", count: pendingCount },
          { id: "outgoing", label: "Outgoing Referrals (Sent)", count: outgoing.length },
          { id: "new", label: "+ Send New Referral", count: null },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>{t.label}</span>
            {t.count !== null && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === t.id ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: REFERRAL REQUESTS (INCOMING) */}
      {activeTab === "incoming" && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 font-medium">Loading referral requests...</div>
          ) : incoming.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-500 font-medium">
              No pending referral requests at this time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {incoming.map((ref) => (
                <div key={ref._id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 hover:border-blue-200 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                        From Dr. {ref.fromDoctorName || "Doctor"}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2.5">{ref.patientName}</h3>
                      <p className="text-xs text-slate-500 font-medium">Specialization: {ref.specialization || "General"}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                      ref.status === "accepted" ? "bg-emerald-100 text-emerald-800" :
                      ref.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {ref.status}
                    </span>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl text-xs text-slate-700 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900">Reason for Referral: </span>
                      <span>{ref.reason}</span>
                    </div>

                    {ref.symptoms && (
                      <div>
                        <span className="font-bold text-slate-900">Clinical Symptoms: </span>
                        <span>{ref.symptoms}</span>
                      </div>
                    )}

                    {Array.isArray(ref.attachedReports) && ref.attachedReports.length > 0 && (
                      <div className="pt-1">
                        <span className="font-bold text-slate-900">Attached Reports: </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {ref.attachedReports.map((report, idx) => (
                            <a
                              key={idx}
                              href={typeof report === "string" ? report : report.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 bg-white border border-blue-200 px-2 py-0.5 rounded-full hover:underline inline-flex items-center gap-1"
                            >
                              <FileText size={12} /> Report #{idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 font-medium">
                      Received: {new Date(ref.createdAt).toLocaleDateString("en-GB")}
                    </span>

                    {ref.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRejectReferral(ref)}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full font-bold transition inline-flex items-center gap-1"
                        >
                          <X size={13} />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleAcceptReferral(ref)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold shadow-xs transition inline-flex items-center gap-1"
                        >
                          <Check size={13} />
                          <span>Accept & Add Patient</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OUTGOING REFERRALS */}
      {activeTab === "outgoing" && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 font-medium">Loading outgoing referrals...</div>
          ) : outgoing.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-500 font-medium">
              You haven't sent any patient referrals yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {outgoing.map((ref) => (
                <div key={ref._id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        Referred To: Dr. {ref.toDoctorName || "Specialist"}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2.5">{ref.patientName}</h3>
                      <p className="text-xs text-slate-500 font-medium">Specialization: {ref.specialization || "Specialist"}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                      ref.status === "accepted" ? "bg-emerald-100 text-emerald-800" :
                      ref.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {ref.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl text-xs text-slate-700 border border-slate-100">
                    <span className="font-bold text-slate-900">Reason: </span>
                    {ref.reason}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 font-medium">
                    <span>Sent: {new Date(ref.createdAt).toLocaleDateString("en-GB")}</span>
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

      {/* TAB 3: NEW REFERRAL FORM */}
      {activeTab === "new" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-sm max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Send className="text-blue-600 w-5 h-5" />
            Send Patient Referral to Specialist Doctor
          </h2>

          <form onSubmit={handleSendReferral} className="space-y-6">
            {/* Select Patient */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Patient *</label>
              <select
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">-- Select Patient from your Patient List --</option>
                {patientsList.map((p) => (
                  <option key={p.patientId || p.id} value={p.patientId || p.id}>
                    {p.name} {p.email ? `(${p.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialization & Target Doctor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology, Neurology, Orthopedics"
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Target Specialist Doctor *</label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">-- Select Specialist Doctor --</option>
                  {filteredDoctors.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      Dr. {d.name} ({d.specialization || d.speciality || "General"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Patient Symptoms & Clinical Notes</label>
              <input
                type="text"
                placeholder="e.g. Severe knee pain requiring orthopedic consultation, chest tightness..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Referral Reason *</label>
              <textarea
                rows={3}
                required
                placeholder="Detail the clinical reason for secondary consultation or specialized procedure..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Attached Reports URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Attach Lab / Diagnostic Report URL (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/patient-report.pdf"
                value={attachedReportsUrl}
                onChange={(e) => setAttachedReportsUrl(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("incoming")}
                className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Send size={14} />
                <span>{submitting ? "Sending Referral..." : "Send Patient Referral"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
