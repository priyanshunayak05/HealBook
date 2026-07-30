import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../../context/AuthContext";
import { Activity, ShieldAlert } from "lucide-react";
import CommonTable from "../UI/CommonTable";

export default function ActivityLogs() {
  const { getToken } = useAdminAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const token = await getToken();

      const res = await fetch(`${API_BASE}/api/admin/activity?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Forbidden: Only Super Admins can access system logs.");
        }
        throw new Error(`Failed to load system logs (${res.status})`);
      }

      const resData = await res.json();
      if (resData.success) {
        setLogs(resData.data);
      } else {
        throw new Error(resData.message || "Failed to load logs");
      }
    } catch (err) {
      console.error("ActivityLogs fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const columns = [
    { field: "userName", headerName: "Operator", sortable: true },
    {
      field: "userEmail",
      headerName: "Email & Role",
      renderCell: (row) => (
        <div>
          <div className="font-bold text-slate-800">{row.userEmail}</div>
          <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            {row.userRole}
          </span>
        </div>
      ),
    },
    {
      field: "action",
      headerName: "Action Perform",
      sortable: true,
      renderCell: (row) => (
        <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg capitalize">
          {row.action}
        </span>
      ),
    },
    {
      field: "details",
      headerName: "Payload Details",
      renderCell: (row) => (
        <span className="font-mono text-xs text-slate-500 max-w-xs block truncate" title={JSON.stringify(row.details)}>
          {JSON.stringify(row.details) !== "{}" ? JSON.stringify(row.details) : "—"}
        </span>
      ),
    },
    { field: "ipAddress", headerName: "IP Address" },
    {
      field: "createdAt",
      headerName: "Timestamp",
      sortable: true,
      renderCell: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  if (error) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-rose-50 border border-rose-100 p-6 rounded-3xl text-center space-y-4 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-extrabold text-slate-800">Access Restricted</h2>
          <p className="text-sm text-slate-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Activity className="text-emerald-500 w-6 h-6" />
            System Activity logs
          </h1>
          <p className="text-sm text-slate-500">Complete audit trail of user sessions, doctor mutations, and billing adjustments.</p>
        </div>

        {/* Audit Table */}
        <CommonTable
          columns={columns}
          data={logs}
          loading={loading}
          searchKey="userEmail"
          searchPlaceholder="Search logs by operator email..."
        />

      </div>
    </div>
  );
}
