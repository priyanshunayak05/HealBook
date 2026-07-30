import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Calendar, ArrowRight } from "lucide-react";

const API_BASE = "http://localhost:4000";

export default function AppointmentSuccess() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const isCancel = location.pathname.includes("/cancel");
  const isService = location.pathname.includes("service");

  const [loading, setLoading] = useState(!isCancel);
  const [error, setError] = useState(null);
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    if (isCancel) return;

    if (!sessionId) {
      setError("No session ID found in request.");
      setLoading(false);
      return;
    }

    async function confirm() {
      try {
        const endpoint = isService
          ? `${API_BASE}/api/service-appointments/confirm-payment`
          : `${API_BASE}/api/appointments/confirm-payment`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to confirm payment");
        }

        setAppointment(data.appointment);
        // Automatically redirect to appointments after 3 seconds
        setTimeout(() => {
          navigate("/appointments", { replace: true });
        }, 3000);
      } catch (err) {
        console.error("Payment confirmation error:", err);
        setError(err.message || "Failed to verify payment with server");
      } finally {
        setLoading(false);
      }
    }

    confirm();
  }, [sessionId, isCancel, isService, navigate]);

  if (isCancel) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-4 py-12 font-serif">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
            <XCircle size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Canceled</h2>
            <p className="text-sm text-slate-500">
              Your payment process was canceled. No appointment has been scheduled.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              to="/doctors"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
            >
              Book Again
            </Link>
            <Link
              to="/appointments"
              className="w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              View My Appointments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-4 py-12 font-serif">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-blue-50 shadow-xl text-center space-y-6">
        {loading ? (
          <div className="py-8 space-y-4">
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">Verifying Payment...</h2>
            <p className="text-xs text-slate-500">
              Please wait while we confirm your payment and schedule your appointment.
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
              <XCircle size={36} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Confirmation Failed</h2>
            <p className="text-sm text-rose-600">{error}</p>
            <div className="pt-4 flex flex-col gap-2">
              <Link
                to="/appointments"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
              >
                Go to My Appointments
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Payment Successful!</h2>
              <p className="text-sm text-emerald-700 font-semibold">Your appointment is now scheduled.</p>
            </div>

            {appointment && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-800">{appointment.patientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Scheduled Date:</span>
                  <span className="font-bold text-slate-800">{appointment.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time / Slot:</span>
                  <span className="font-bold text-slate-800">
                    {appointment.time || (appointment.hour ? `${appointment.hour}:${appointment.minute} ${appointment.ampm}` : "—")}
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400">Redirecting to your appointments in 3 seconds...</p>

            <Link
              to="/appointments"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition"
            >
              <span>View Scheduled Appointments</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
