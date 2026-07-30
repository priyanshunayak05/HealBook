import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import DashboardPage from "./components/DashboardPage/DashboardPage";
import AddPage from "./components/AddPage/AddPage";
import ListPage from "./components/ListPage/ListPage";
import AppointmentsPage from "./components/AppointmentsPage/AppointmentsPage";
import ServiceDashboard from "./components/ServiceDashboard/ServiceDashboard";
import AddService from "./components/AddService/AddService";
import ListServicePage from "./components/ListServicePage/ListServicePage";
import ServiceAppointmentsPage from "./components/ServiceAppointmentsPage/ServiceAppointmentsPage";
import ActivityLogs from "./components/ActivityLogs/ActivityLogs";
import DoctorProfilePage from "./components/Profile/DoctorProfilePage";
import Login from "./components/Login/Login";
import RoleGuard from "./components/UI/RoleGuard";

function ProtectedLayout() {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-slate-600 animate-pulse font-sans">Verifying medical session credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="transition-all duration-300">
        <Routes>
          <Route path="/" element={<Navigate to="/h" replace />} />
          <Route path="/h" element={<DashboardPage />} />
          
          {/* Admin and Super Admin only routes */}
          <Route path="/add" element={
            <RoleGuard allowedRoles={["admin", "superadmin"]}>
              <AddPage />
            </RoleGuard>
          } />
          <Route path="/list" element={
            <RoleGuard allowedRoles={["admin", "superadmin"]}>
              <ListPage />
            </RoleGuard>
          } />
          <Route path="/service-dashboard" element={
            <RoleGuard allowedRoles={["admin", "superadmin"]}>
              <ServiceDashboard />
            </RoleGuard>
          } />
          <Route path="/edit-service/:id" element={
            <RoleGuard allowedRoles={["admin", "superadmin"]}>
              <AddService />
            </RoleGuard>
          } />
          <Route path="/list-service" element={
            <RoleGuard allowedRoles={["admin", "superadmin"]}>
              <ListServicePage />
            </RoleGuard>
          } />
          <Route path="/service-appointments" element={
            <RoleGuard allowedRoles={["admin", "superadmin"]}>
              <ServiceAppointmentsPage />
            </RoleGuard>
          } />
          {/* Super Admin Only Logs */}
          <Route path="/logs" element={
            <RoleGuard allowedRoles={["superadmin"]}>
              <ActivityLogs />
            </RoleGuard>
          } />

          {/* Doctor Only Profile */}
          <Route path="/profile" element={
            <RoleGuard allowedRoles={["doctor"]}>
              <DoctorProfilePage />
            </RoleGuard>
          } />

          {/* Joint routes for Doctor, Admin, and Super Admin */}
          <Route path="/appointments" element={
            <RoleGuard allowedRoles={["admin", "superadmin", "doctor"]}>
              <AppointmentsPage />
            </RoleGuard>
          } />
          
          <Route path="*" element={<Navigate to="/h" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<ProtectedLayout />} />
    </Routes>
  );
}
