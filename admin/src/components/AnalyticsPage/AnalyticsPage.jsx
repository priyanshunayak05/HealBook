import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../../context/AuthContext";
import { TrendingUp, BarChart2, PieChart as PieIcon, Loader2, Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AnalyticsPage() {
  const { getToken } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [charts, setCharts] = useState(null);
  const [error, setError] = useState("");

  const API_BASE = "http://localhost:4000";
  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const token = await getToken();
        const res = await fetch(`${API_BASE}/api/admin/analytics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const resData = await res.json();
        if (resData.success) {
          setCharts(resData.data);
        } else {
          throw new Error(resData.message || "Failed to load analytics charts");
        }
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Loading HMS Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-rose-50 border border-rose-100 text-rose-600 p-6 rounded-3xl text-center">
          <h3 className="text-lg font-bold mb-2">Error Loading Analytics</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { monthlyTrends = [], doctorPerformance = [], departmentPerformance = [], patientGrowth = [] } = charts || {};

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
          <Sparkles className="text-emerald-500 w-8 h-8" />
          Hospital Analytics & Insights
        </h1>
        <p className="text-slate-500 text-sm mt-1">Deep-dive visual reporting on metrics, doctor workload, and department earnings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Appointment & Earnings Trend */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100/40 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="text-emerald-600 w-4 h-4" />
            Monthly Appointment & Fee Trends
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "1rem", border: "1px solid #f1f5f9" }} />
                <Legend iconType="circle" />
                <Area yAxisId="left" type="monotone" dataKey="count" name="Appointments" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                <Area yAxisId="right" type="monotone" dataKey="fees" name="Earnings (₹)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorFees)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Growth Trend */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100/40 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="text-blue-600 w-4 h-4" />
            Patient Registration Growth
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={patientGrowth}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "1rem", border: "1px solid #f1f5f9" }} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="count" name="Registered Patients" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorPatients)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Doctor Performance */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100/40 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart2 className="text-amber-600 w-4 h-4" />
            Doctor Performance & Workload
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={doctorPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="doctor" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "1rem", border: "1px solid #f1f5f9" }} />
                <Legend iconType="circle" />
                <Bar dataKey="appointments" name="Total Consultations" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Share */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100/40 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieIcon className="text-indigo-600 w-4 h-4" />
            Consultation Share by Department
          </h3>
          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={departmentPerformance} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="appointments" nameKey="department">
                  {departmentPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "1rem", border: "1px solid #f1f5f9" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs font-semibold text-slate-600 mt-2">
            {departmentPerformance.map((entry, idx) => (
              <div key={entry.department} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span>{entry.department} ({entry.appointments})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
