import React from "react";
import { useAdminAuth } from "../../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 animate-fadeIn">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Loading HMS Dashboard...</p>
      </div>
    );
  }

  return <AdminDashboard />;
}