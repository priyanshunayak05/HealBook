import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../../context/AuthContext";
import { Save, User, FileText, Phone, DollarSign, Briefcase, MapPin, CheckCircle } from "lucide-react";

export default function DoctorProfilePage() {
  const { getToken } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [experience, setExperience] = useState("");
  const [about, setAbout] = useState("");
  const [fee, setFee] = useState(0);
  const [availability, setAvailability] = useState("Available");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

  useEffect(() => {
    async function loadDoctorProfile() {
      try {
        setLoading(true);
        const token = await getToken();
        
        const res = await fetch(`${API_BASE}/api/doctor/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`Failed to load profile details (${res.status})`);
        }

        const resData = await res.json();
        if (resData.success) {
          const doc = resData.data;
          setName(doc.name || "");
          setEmail(doc.email || "");
          setSpecialization(doc.specialization || "");
          setPhone(doc.phone || "");
          setLocation(doc.location || "");
          setQualifications(doc.qualifications || "");
          setExperience(doc.experience || "");
          setAbout(doc.about || "");
          setFee(doc.fee ?? doc.fees ?? 0);
          setAvailability(doc.availability || "Available");
          setImagePreview(doc.imageUrl || doc.image || "");
        }
      } catch (err) {
        console.error("Profile load error:", err);
        setError("Could not retrieve profile data.");
      } finally {
        setLoading(false);
      }
    }
    loadDoctorProfile();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError("");
    setSubmitLoading(true);

    try {
      const token = await getToken();

      const formData = new FormData();
      formData.append("phone", phone);
      formData.append("location", location);
      formData.append("qualifications", qualifications);
      formData.append("experience", experience);
      formData.append("about", about);
      formData.append("fee", String(Number(fee) || 0));
      formData.append("availability", availability);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch(`${API_BASE}/api/doctor/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const resData = await res.json();
      if (resData.success) {
        setSuccess(true);
        const updated = resData.data || resData.doctor;
        if (updated) {
          setImagePreview(updated.imageUrl || updated.image || imagePreview);
        }
        setImageFile(null);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(resData.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Profile submit error:", err);
      setError("An unexpected error occurred while saving.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-slate-500">Loading profile details...</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <User className="text-emerald-500 w-6 h-6" />
            Edit Profile Settings
          </h1>
          <p className="text-sm text-slate-500">Update your clinical fees, slots availability, biography, and contact info.</p>
        </div>

        {/* Profile Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-emerald-100/50 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6 font-sans">
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center gap-2 font-semibold text-sm animate-fadeIn">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              Profile updated successfully!
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Profile Image & Read Only Details */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <img
                src={imagePreview || "https://i.pravatar.cc/150"}
                alt={name || "Doctor"}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
              />
              <label className="absolute bottom-0 right-0 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full cursor-pointer shadow-md transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <User size={14} />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-500 w-full">
              <div>
                <span className="block text-slate-400 uppercase tracking-wider mb-1">Full Name</span>
                <span className="text-sm font-bold text-slate-700">{name}</span>
              </div>
              <div>
                <span className="block text-slate-400 uppercase tracking-wider mb-1">Email Account</span>
                <span className="text-sm font-bold text-slate-700">{email}</span>
              </div>
              <div>
                <span className="block text-slate-400 uppercase tracking-wider mb-1">Medical Speciality</span>
                <span className="text-sm font-bold text-slate-700">{specialization}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100"></div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Phone */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Phone size={13} className="text-slate-400" /> Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-full border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
              />
            </div>

            {/* Consultation Fee */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <DollarSign size={13} className="text-slate-400" /> Consultation Fee (₹)
              </label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full rounded-full border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
              />
            </div>

            {/* Experience */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Briefcase size={13} className="text-slate-400" /> Experience (e.g. 8 years)
              </label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full rounded-full border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
              />
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <MapPin size={13} className="text-slate-400" /> Clinic Address / Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-full border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
              />
            </div>

            {/* Qualifications */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <FileText size={13} className="text-slate-400" /> Qualifications (e.g. MBBS, MD)
              </label>
              <input
                type="text"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                className="w-full rounded-full border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
              />
            </div>

            {/* Availability */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                Consultation Status
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full rounded-full border border-slate-100 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
              >
                <option value="Available">Available (Accepting appointments)</option>
                <option value="Unavailable">Unavailable (Temporarily closed)</option>
              </select>
            </div>

            {/* About */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                Biography / About
              </label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
                placeholder="Write a brief overview of your clinical specialties..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitLoading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={16} />
              {submitLoading ? "Saving Changes..." : "Save Profile Settings"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
