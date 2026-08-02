import React, { useState } from "react";
import { X, Plus, Trash2, FileText, Pill, Calendar, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

export default function AddMedicalRecordModal({ isOpen, onClose, patient, appointment, onSuccess }) {
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [reportName, setReportName] = useState("");
  const [reportsList, setReportsList] = useState([]);

  const [prescription, setPrescription] = useState([
    { medicineName: "", dosage: "", frequency: "", duration: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddMedicine = () => {
    setPrescription([...prescription, { medicineName: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleRemoveMedicine = (index) => {
    if (prescription.length === 1) return;
    setPrescription(prescription.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...prescription];
    updated[index][field] = value;
    setPrescription(updated);
  };

  const handleAddReport = () => {
    if (!reportUrl.trim()) return;
    setReportsList([...reportsList, { name: reportName.trim() || "Clinical Report", url: reportUrl.trim() }]);
    setReportUrl("");
    setReportName("");
  };

  const handleRemoveReport = (index) => {
    setReportsList(reportsList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("doctorToken_v1");
    if (!token) {
      toast.error("Doctor session expired. Please log in again.");
      return;
    }

    const patientId = patient?.clerkId || patient?.patientId || patient?.createdBy || patient?.id || appointment?.createdBy || appointment?.userId;
    if (!patientId) {
      toast.error("Patient identifier is missing.");
      return;
    }

    if (!diagnosis.trim()) {
      toast.error("Diagnosis is required.");
      return;
    }

    // Filter out empty medicines
    const validPrescription = prescription.filter((m) => m.medicineName && m.medicineName.trim());

    setSubmitting(true);
    try {
      const payload = {
        patientId,
        patientName: patient?.name || patient?.patientName || appointment?.patientName || "Patient",
        patientEmail: patient?.email || patient?.patientEmail || appointment?.email || "",
        appointmentId: appointment?._id || appointment?.id || null,
        symptoms: symptoms.trim(),
        diagnosis: diagnosis.trim(),
        prescription: validPrescription,
        doctorNotes: doctorNotes.trim(),
        uploadedReports: reportsList,
        followUpDate: followUpDate || "",
      };

      const res = await fetch(`${API_BASE}/api/medical-records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Medical record & prescription saved successfully!");
        if (onSuccess) onSuccess(data.data || data.record);
        onClose();
      } else {
        toast.error(data.message || "Failed to save medical record");
      }
    } catch (err) {
      console.error("Save record error:", err);
      toast.error("Network error while saving medical record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-blue-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600 w-5 h-5" />
              Add Consultation Medical Record
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Patient: <span className="font-semibold text-slate-700">{patient?.name || appointment?.patientName || "Patient"}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-grow">
          {/* Symptoms & Diagnosis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Symptoms</label>
              <textarea
                rows={3}
                placeholder="e.g. Chest pain, fatigue, high fever for 3 days"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnosis *</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Mild hypertension, Acute viral infection"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Prescription Section */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-blue-600" />
                Prescription Management
              </h3>
              <button
                type="button"
                onClick={handleAddMedicine}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-50 transition"
              >
                <Plus size={14} />
                <span>Add Medicine</span>
              </button>
            </div>

            {prescription.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    placeholder="Medicine Name (e.g. Amlodipine)"
                    value={item.medicineName}
                    onChange={(e) => handleMedicineChange(idx, "medicineName", e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Dosage (5mg)"
                    value={item.dosage}
                    onChange={(e) => handleMedicineChange(idx, "dosage", e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Frequency (Once daily)"
                    value={item.frequency}
                    onChange={(e) => handleMedicineChange(idx, "frequency", e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Duration (30 days)"
                    value={item.duration}
                    onChange={(e) => handleMedicineChange(idx, "duration", e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(idx)}
                    disabled={prescription.length === 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-40 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Doctor Notes & Follow-up */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Notes & Advice</label>
              <input
                type="text"
                placeholder="e.g. Advised low salt diet, lifestyle changes, drink plenty of water"
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar size={14} className="text-slate-400" />
                Follow-up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Reports Attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Attach Clinical Reports (URL)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Report Title (e.g. ECG.pdf)"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-1/3 text-xs p-2.5 rounded-xl border border-slate-200"
              />
              <input
                type="url"
                placeholder="Report Document URL (https://...)"
                value={reportUrl}
                onChange={(e) => setReportUrl(e.target.value)}
                className="w-2/3 text-xs p-2.5 rounded-xl border border-slate-200"
              />
              <button
                type="button"
                onClick={handleAddReport}
                className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
              >
                Attach
              </button>
            </div>

            {reportsList.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {reportsList.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs">
                    {r.name}
                    <button type="button" onClick={() => handleRemoveReport(i)} className="hover:text-rose-600">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition disabled:opacity-50"
            >
              {submitting ? "Saving Record..." : "Save Medical Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
