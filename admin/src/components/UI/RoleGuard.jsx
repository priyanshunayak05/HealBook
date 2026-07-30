import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function RoleGuard({ children, allowedRoles }) {
  const { user, role, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600 animate-pulse">Loading HMS Portal...</p>
      </div>
    );
  }

  if (!user) {
    // If not signed in or not sync'ed, direct to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 mb-4 text-rose-500">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Your account role (<span className="font-semibold text-rose-600 capitalize">{role}</span>) does not have authorization to view this resource.
        </p>
      </div>
    );
  }

  return children;
}
