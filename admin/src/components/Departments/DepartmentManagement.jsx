import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../../context/AuthContext";
import { Plus, Edit2, Trash2, X, Upload } from "lucide-react";
import CommonTable from "../UI/CommonTable";

export default function DepartmentManagement() {
  const { getToken } = useAdminAuth();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headDoctor, setHeadDoctor] = useState("");
  const [status, setStatus] = useState("Active");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      // Fetch departments
      const deptsRes = await fetch(`${API_BASE}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const deptsData = await deptsRes.json();
      if (deptsData.success) {
        setDepartments(deptsData.data);
      }

      // Fetch doctors (for Head Doctor dropdown)
      const docsRes = await fetch(`${API_BASE}/api/doctors?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const docsData = await docsRes.json();
      if (docsData.success) {
        setDoctors(docsData.data || docsData.doctors || []);
      }
    } catch (err) {
      console.error("Failed to load department management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingDept(null);
    setName("");
    setDescription("");
    setHeadDoctor("");
    setStatus("Active");
    setImageFile(null);
    setImagePreview("");
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description);
    setHeadDoctor(dept.headDoctor?._id || dept.headDoctor?.id || "");
    setStatus(dept.status);
    setImageFile(null);
    setImagePreview(dept.imageUrl || "");
    setError("");
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitLoading(true);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("headDoctor", headDoctor);
      formData.append("status", status);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const url = editingDept 
        ? `${API_BASE}/api/departments/${editingDept._id || editingDept.id}` 
        : `${API_BASE}/api/departments`;
      
      const method = editingDept ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const resData = await res.json();
      if (resData.success) {
        setModalOpen(false);
        loadData();
      } else {
        setError(resData.message || "Failed to save department");
      }
    } catch (err) {
      console.error("Submit department error:", err);
      setError("An unexpected error occurred");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = await res.json();
      if (resData.success) {
        loadData();
      } else {
        alert(resData.message || "Failed to delete department");
      }
    } catch (err) {
      console.error("Delete department error:", err);
      alert("Error deleting department");
    }
  };

  const columns = [
    {
      field: "image",
      headerName: "Image",
      renderCell: (row) => (
        <img
          src={row.imageUrl || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=150&q=80"}
          alt={row.name}
          className="w-10 h-10 object-cover rounded-xl border border-emerald-50 bg-slate-50"
        />
      ),
    },
    { field: "name", headerName: "Department Name", sortable: true },
    { field: "description", headerName: "Description" },
    {
      field: "headDoctorName",
      headerName: "Head Doctor",
      renderCell: (row) => row.headDoctor?.name || <span className="text-slate-400">Unassigned</span>,
    },
    { field: "doctorCount", headerName: "Doctor Count", sortable: true },
    {
      field: "status",
      headerName: "Status",
      sortable: true,
      renderCell: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
          row.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      renderCell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
            title="Edit Department"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._id || row.id)}
            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Delete Department"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top bar with Add Button */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Department Management</h1>
            <p className="text-sm text-slate-500">Manage medical specialities, assign head practitioners, and view staff statistics.</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} /> Add Department
          </button>
        </div>

        {/* Table of Departments */}
        <CommonTable
          columns={columns}
          data={departments}
          loading={loading}
          searchKey="name"
          searchPlaceholder="Search departments..."
        />

        {/* Create/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-50/50">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-800">
                  {editingDept ? "Edit Department" : "Add New Department"}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs text-center font-semibold">
                      {error}
                    </div>
                  )}

                  {/* Image Upload */}
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Department Image</label>
                    <div className="relative group w-32 h-32 rounded-3xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-8 h-8 text-slate-300" />
                      )}
                      <label className="absolute inset-0 bg-black/40 text-white text-xs font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                        <Upload size={16} className="mr-1" /> Change
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Department Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cardiology"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-full border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                    <textarea
                      placeholder="About this department..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
                    />
                  </div>

                  {/* Head Doctor */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Head Doctor</label>
                    <select
                      value={headDoctor}
                      onChange={(e) => setHeadDoctor(e.target.value)}
                      className="w-full rounded-full border border-slate-100 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
                    >
                      <option value="">Unassigned</option>
                      {doctors.map((doc) => (
                        <option key={doc._id || doc.id} value={doc._id || doc.id}>
                          {doc.name} ({doc.specialization})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-full border border-slate-100 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-full transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg disabled:opacity-50 transition cursor-pointer"
                  >
                    {submitLoading ? "Saving..." : "Save Department"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
