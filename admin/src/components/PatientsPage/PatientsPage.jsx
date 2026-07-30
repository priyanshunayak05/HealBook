import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../../context/AuthContext";
import CommonTable from "../UI/CommonTable";
import { Users, Phone, Mail, Calendar } from "lucide-react";

export default function PatientsPage() {
  const { getToken } = useAdminAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_BASE = "http://localhost:4000";

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        const token = await getToken();
        const res = await fetch(`${API_BASE}/api/admin/patients`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const resData = await res.json();
        if (resData.success) {
          setPatients(resData.data || []);
        } else {
          throw new Error(resData.message || "Failed to load patients");
        }
      } catch (err) {
        console.error("Patients load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  const columns = [
    {
      field: "name",
      headerName: "Patient Name",
      sortable: true,
      renderCell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            {row.name ? row.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <span className="font-semibold text-slate-800 block">{row.name}</span>
            <span className="text-xs text-slate-400">ID: {row.clerkId || row._id}</span>
          </div>
        </div>
      ),
    },
    {
      field: "email",
      headerName: "Email Address",
      sortable: true,
      renderCell: (row) => (
        <div className="flex items-center gap-2 text-slate-600">
          <Mail className="w-4 h-4 text-slate-400" />
          <span>{row.email}</span>
        </div>
      ),
    },
    {
      field: "phone",
      headerName: "Phone Number",
      sortable: true,
      renderCell: (row) => (
        <div className="flex items-center gap-2 text-slate-600">
          <Phone className="w-4 h-4 text-slate-400" />
          <span>{row.phone || "N/A"}</span>
        </div>
      ),
    },
    {
      field: "createdAt",
      headerName: "Registered Date",
      sortable: true,
      renderCell: (row) => (
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Users className="text-emerald-500 w-8 h-8" />
            Patient Database
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track registered hospital patient accounts.</p>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-3xl text-center">
          {error}
        </div>
      ) : (
        <CommonTable
          columns={columns}
          data={patients}
          loading={loading}
          searchKey="name"
          searchPlaceholder="Search patients by name..."
        />
      )}
    </div>
  );
}
