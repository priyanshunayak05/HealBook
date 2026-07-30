import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";
import {
  CreditCard,
  Wallet,
  CheckCircle,
  Bell,
  Clock,
  XCircle,
  CalendarDays,
  Calendar,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  appointmentPageStyles,
  cardStyles,
  badgeStyles,
  iconSize,
} from "../../assets/dummyStyles";
import API from "../../services/api";

function pad(n) {
  return String(n ?? 0).padStart(2, "0");
}

function parseDateTime(dateStr, timeStr) {
  const fast = new Date(`${dateStr} ${timeStr}`);
  if (!isNaN(fast)) return fast;

  const parts = (dateStr || "").split(" ");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const month = months[m];
    let [t, ampm] = (timeStr || "").split(" ");
    let [hh, mm] = (t || "0:00").split(":");
    hh = Number(hh || 0);
    mm = Number(mm || 0);

    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;

    return new Date(Number(y), month, Number(d), hh, mm);
  }

  const iso = new Date(dateStr);
  if (!isNaN(iso)) return iso;
  return new Date();
}

function computeStatus(item) {
  const now = new Date();
  if (!item) return "Pending";

  if (item.status === "Canceled") return "Canceled";
  if (item.status === "Rescheduled") {
    if (
      item.rescheduledTo &&
      item.rescheduledTo.date &&
      item.rescheduledTo.time
    ) {
      const dt = parseDateTime(
        item.rescheduledTo.date,
        item.rescheduledTo.time,
      );
      if (now >= dt) return "Completed";
    }
    return "Rescheduled";
  }
  if (item.status === "Completed") return "Completed";
  if (item.status === "Confirmed") {
    const dtConfirmed = parseDateTime(item.date, item.time);
    if (now >= dtConfirmed) return "Completed";
    return "Confirmed";
  }
  if (item.status === "Pending") {
    const dtPending = parseDateTime(item.date, item.time);
    if (now >= dtPending) return "Completed";
    return "Pending";
  }

  const dt = parseDateTime(item.date, item.time);
  if (now >= dt) return "Completed";
  return item.confirmed ? "Confirmed" : "Pending";
}

const PaymentBadge = ({ payment }) => {
  return payment === "Online" ? (
    <span className={badgeStyles.paymentBadge.online}>
      <CreditCard className={iconSize.small} /> Online
    </span>
  ) : (
    <span className={badgeStyles.paymentBadge.cash}>
      <Wallet className={iconSize.small} /> Cash
    </span>
  );
};

const StatusBadge = ({ itemStatus }) => {
  if (itemStatus === "Completed")
    return (
      <span className={badgeStyles.statusBadge.completed}>
        <CheckCircle className={iconSize.small} /> Completed
      </span>
    );

  if (itemStatus === "Confirmed")
    return (
      <span className={badgeStyles.statusBadge.confirmed}>
        <Bell className={iconSize.small} /> Confirmed
      </span>
    );

  if (itemStatus === "Pending")
    return (
      <span className={badgeStyles.statusBadge.pending}>
        <Clock className={iconSize.small} /> Pending
      </span>
    );

  if (itemStatus === "Canceled")
    return (
      <span className={badgeStyles.statusBadge.canceled}>
        <XCircle className={iconSize.small} /> Canceled
      </span>
    );

  return (
    <span className={badgeStyles.statusBadge.default}>
      <CalendarDays className={iconSize.small} /> Rescheduled
    </span>
  );
};

export default function AppointmentPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await API.delete("/api/user/account", { headers });
      if (res.data?.success) {
        localStorage.removeItem("patient_user");
        await clerk.signOut();
        window.location.href = "/";
      } else {
        setError(res.data?.message || "Failed to delete account");
      }
    } catch (err) {
      console.error("Delete account error:", err);
      setError("Failed to delete account. Please try again.");
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const [doctorAppts, setDoctorAppts] = useState([]);
  const [serviceAppts, setServiceAppts] = useState([]);

  const [appointmentsRaw, setAppointmentsRaw] = useState({
    doctors: [],
    services: [],
  });
  const [error, setError] = useState(null);

  const loadDoctorAppointments = useCallback(async () => {
    if (!isLoaded) return;
    setLoadingDoctors(true);
    setError(null);

    let token = null;
    try {
      token = await getToken();
      console.log(
        "Clerk token (frontend):",
        token ? `${token.slice(0, 20)}...` : null,
      );
    } catch (err) {
      console.error("Failed to get Clerk token (frontend):", err);
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
    const queryParams = new URLSearchParams();
    if (user?.id) queryParams.set("createdBy", user.id);
    if (email) queryParams.set("email", email);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

    try {
      const resp = await API.get(`/api/appointments/me${queryString}`, { headers });
      console.log("Response from /api/appointments/me:", resp?.data);

      const fetched =
        resp?.data?.appointments ?? resp?.data?.data ?? resp?.data ?? [];
      const arr = Array.isArray(fetched) ? fetched : [];

      const doctors = arr.filter((a) => {
        return (
          (a.doctorId !== undefined && a.doctorId !== null) ||
          !!a.doctorName ||
          !a.serviceId
        );
      });

      setDoctorAppts(doctors);
      setAppointmentsRaw((p) => ({ ...p, doctors: doctors }));
    } catch (err) {
      console.error(
        "Error calling /api/appointments/me:",
        err?.response?.data || err.message || err,
      );

      if (user?.id) {
        try {
          console.log("Attempting debug request with ?createdBy=", user.id);
          const debugResp = await API.get(
            `/api/appointments/me?createdBy=${user.id}${email ? `&email=${encodeURIComponent(email)}` : ""}`,
            { headers },
          );
          console.log("Debug fallback response:", debugResp?.data);

          const fetched =
            debugResp?.data?.appointments ??
            debugResp?.data?.data ??
            debugResp?.data ??
            [];
          const arr = Array.isArray(fetched) ? fetched : [];
          const doctors = arr.filter(
            (a) =>
              (a.doctorId !== undefined && a.doctorId !== null) ||
              !!a.doctorName ||
              !a.serviceId,
          );
          setDoctorAppts(doctors);
          setAppointmentsRaw((p) => ({ ...p, doctors }));
        } catch (err2) {
          console.error(
            "Debug fallback failed (doctors):",
            err2?.response?.data || err2.message || err2,
          );
          setError((prev) =>
            prev
              ? prev + " | Doctors failed"
              : "Failed to load doctor appointments. Check console.",
          );
          setDoctorAppts([]);
        }
      } else {
        setError((prev) =>
          prev
            ? prev + " | No user id for doctors"
            : "Failed to load doctor appointments and no user id available for debug fallback.",
        );
        setDoctorAppts([]);
      }
    } finally {
      setLoadingDoctors(false);
    }
  }, [isLoaded, getToken, user]);

  const loadServiceAppointments = useCallback(async () => {
    if (!isLoaded) return;
    setLoadingServices(true);
    setError(null);

    let token = null;
    try {
      token = await getToken();
    } catch (err) {
      console.error("Failed to get Clerk token (frontend): err", err);
    }
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
    const queryParams = new URLSearchParams();
    if (user?.id) queryParams.set("createdBy", user.id);
    if (email) queryParams.set("email", email);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

    try {
      const resp = await API.get(`/api/service-appointments/me${queryString}`, { headers });
      console.log("Response from /api/service-appointments/me:", resp?.data);

      const fetched =
        resp?.data?.appointments ?? resp?.data?.data ?? resp?.data ?? [];
      const arr = Array.isArray(fetched) ? fetched : [];
      console.log(arr);

      setServiceAppts(arr);
      setAppointmentsRaw((p) => ({ ...p, services: arr }));
    } catch (err) {
      console.error(
        "Error calling /api/service-appointments/me:",
        err?.response?.data || err.message || err,
      );

      if (user?.id) {
        try {
          console.log("Attempting debug request with ?createdBy=", user.id);
          const debugResp = await API.get(
            `/api/service-appointments/me?createdBy=${user.id}${email ? `&email=${encodeURIComponent(email)}` : ""}`,
            { headers },
          );
          console.log("Debug fallback response (services):", debugResp?.data);

          const fetched =
            debugResp?.data?.appointments ??
            debugResp?.data?.data ??
            debugResp?.data ??
            [];
          const arr = Array.isArray(fetched) ? fetched : [];
          setServiceAppts(arr);
          setAppointmentsRaw((p) => ({ ...p, services: arr }));
        } catch (err2) {
          console.error(
            "Debug fallback failed (services):",
            err2?.response?.data || err2.message || err2,
          );
          setError((prev) =>
            prev
              ? prev + " | Services failed"
              : "Failed to load service appointments. Check console.",
          );
          setServiceAppts([]);
        }
      } else {
        setError((prev) =>
          prev
            ? prev + " | No user id for services"
            : "Failed to load service appointments and no user id available for debug fallback.",
        );
        setServiceAppts([]);
      }
    } finally {
      setLoadingServices(false);
    }
  }, [isLoaded, getToken, user]);

  useEffect(() => {
    loadDoctorAppointments();
    loadServiceAppointments();
  }, [
    isLoaded,
    isSignedIn,
    user,
    loadDoctorAppointments,
    loadServiceAppointments,
  ]);

  function normalizeRescheduled(rt) {
    if (!rt) return null;
    if (rt.date && rt.time) return { date: rt.date, time: rt.time };
    if (
      rt.date &&
      (rt.hour !== undefined || rt.minute !== undefined || rt.ampm)
    ) {
      const hour = rt.hour ?? 0;
      const minute = rt.minute ?? 0;
      const ampm = rt.ampm ?? "";
      return { date: rt.date, time: `${hour}:${pad(minute)} ${ampm}` };
    }
    return {
      date: rt.date || rt?.dateString || "",
      time:
        rt.time ||
        (rt.hour
          ? `${rt.hour}:${pad(rt.minute || 0)} ${rt.ampm || ""}`
          : rt?.timeString || ""),
    };
  }

  const appointmentData = useMemo(() => {
    return doctorAppts
      .map((a) => {
        const id = a._id || a.id || String(a._id || "");
        const doctorObj =
          typeof a.doctorId === "object" && a.doctorId ? a.doctorId : {};
        const image =
          doctorObj.imageUrl ||
          doctorObj.image ||
          doctorObj.avatar ||
          a.doctorImage?.url ||
          a.doctorImage ||
          "";
        const doctorName =
          (doctorObj.name && String(doctorObj.name).trim()) ||
          (a.doctorName && String(a.doctorName).trim()) ||
          (a.doctor && String(a.doctor).trim()) ||
          (a.patientName && String(a.patientName).trim()) ||
          "Doctor";

        const patientName = a.patientName || a.patient || "Patient";
        const specialization =
          doctorObj.specialization || a.specialization || a.speciality || "";
        const experience = doctorObj.experience || a.experience || "";
        const date = a.date || "";
        let time = a.time || "";

        if (!time) {
          if (a.hour !== undefined && a.minute !== undefined && a.ampm) {
            time = `${a.hour}:${pad(a.minute)} ${a.ampm}`;
          } else if (a.hour !== undefined && a.ampm) {
            time = `${a.hour}:00 ${a.ampm}`;
          }
        }

        const payment = (a.payment && a.payment.method) || "Cash";
        const status =
          a.status ||
          (a.payment && a.payment.status === "Paid" ? "Confirmed" : "Pending");
        const rescheduledTo = normalizeRescheduled(
          a.rescheduledTo || {
            date: a.rescheduledDate,
            time: a.rescheduledTime,
          },
        );

        return {
          id,
          image,
          doctor: doctorName,
          patientName,
          specialization,
          experience,
          date,
          time,
          payment,
          status,
          rescheduledTo,
        };
      })
      .map((x) => ({ ...x, status: computeStatus(x) }));
  }, [doctorAppts]);

  const serviceData = useMemo(() => {
    return serviceAppts
      .map((s) => {
        const id = s._id || s.id || String(s._id || "");
        const svc =
          typeof s.serviceId === "object" && s.serviceId ? s.serviceId : {};
        const image =
          svc.imageUrl ||
          svc.image ||
          svc.imageSmall ||
          s.serviceImage?.url ||
          s.serviceImage ||
          "";
        const name = s.serviceName || svc.name || svc.title || "Service";
        const patientName = s.patientName || s.patient || "Patient";
        const price = s.fees ?? s.amount ?? s.price ?? 0;
        const date = s.date || "";
        let time = s.time || "";
        if (!time) {
          if (s.hour !== undefined && s.minute !== undefined && s.ampm) {
            time = `${s.hour}:${pad(s.minute)} ${s.ampm}`;
          } else if (s.hour !== undefined && s.ampm) {
            time = `${s.hour}:00 ${s.ampm}`;
          }
        }

        const payment = (s.payment && s.payment.method) || "Cash";
        const status =
          s.status ||
          (s.payment && s.payment.status === "Paid" ? "Confirmed" : "Pending");

        const rescheduledTo = normalizeRescheduled(s.rescheduledTo || null);

        return {
          id,
          image,
          name,
          patientName,
          price,
          date,
          time,
          payment,
          status,
          rescheduledTo,
        };
      })
      .map((x) => ({ ...x, status: computeStatus(x) }));
  }, [serviceAppts]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-serif">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-blue-100 max-w-md">
          <Calendar size={48} className="mx-auto mb-4 text-blue-500" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Sign in Required
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Please log in to your patient account to view your scheduled doctor
            and service appointments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={appointmentPageStyles.pageContainer}>
      <div className={appointmentPageStyles.maxWidthContainer}>
        {/* Patient Account Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-5 bg-white rounded-2xl border border-blue-100 shadow-xs">
          <div className="flex items-center gap-4">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || "Patient"}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-400 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg border border-blue-300">
                {(user?.fullName || user?.firstName || "P").charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Patient Account"}
              </h1>
              <p className="text-xs text-slate-500 font-sans">
                {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition cursor-pointer shadow-2xs"
          >
            <Trash2 size={15} />
            <span>Delete Account</span>
          </button>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-rose-100 shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 mx-auto bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Delete Your Account?</h3>
              <p className="text-sm text-slate-600 font-sans leading-relaxed">
                Are you sure you want to permanently delete your patient account (<strong className="text-slate-800">{user?.primaryEmailAddress?.emailAddress}</strong>)? This will remove your profile and all scheduled appointments.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingAccount}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                >
                  {deletingAccount ? "Deleting..." : "Yes, Delete Account"}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl p-3 text-center mb-6 text-sm font-serif">
            {error}
          </div>
        )}

        {/* Doctor Consultations Section */}
        <h2 className={appointmentPageStyles.doctorTitle}>
          Doctor Consultations
        </h2>
        {loadingDoctors && (
          <div className={appointmentPageStyles.loadingText}>
            Loading consultations...
          </div>
        )}
        {!loadingDoctors && appointmentData.length === 0 && (
          <div className={appointmentPageStyles.emptyStateText}>
            No doctor appointments scheduled.
          </div>
        )}
        {!loadingDoctors && appointmentData.length > 0 && (
          <div className={appointmentPageStyles.doctorGrid}>
            {appointmentData.map((item) => (
              <div key={item.id} className={cardStyles.doctorCard}>
                <div className={cardStyles.doctorImageContainer}>
                  <img
                    src={item.image || "/placeholder-doctor.png"}
                    alt={item.doctor}
                    className={cardStyles.image}
                    loading="lazy"
                  />
                </div>

                <h3 className={cardStyles.doctorName}>{item.doctor}</h3>
                <p className={cardStyles.specialization}>
                  {item.specialization}
                </p>

                <p className={cardStyles.dateContainer}>
                  <CalendarDays className={iconSize.medium} /> {item.date}
                </p>

                <p className={cardStyles.timeContainer}>
                  <Clock className={iconSize.medium} /> {item.time}
                </p>

                <div className={cardStyles.badgesContainer}>
                  <PaymentBadge payment={item.payment} />
                  <StatusBadge itemStatus={item.status} />
                </div>

                {item.status === "Rescheduled" && item.rescheduledTo ? (
                  <div className={cardStyles.rescheduledText}>
                    Rescheduled to{" "}
                    <span className={cardStyles.rescheduledSpan}>
                      {item.rescheduledTo.date} : {item.rescheduledTo.time}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {/* Medical Services Section */}
        <h2 className={appointmentPageStyles.serviceTitle}>
          Registered Medical Services
        </h2>
        {loadingServices && (
          <div className={appointmentPageStyles.serviceLoadingText}>
            Loading services...
          </div>
        )}
        {!loadingServices && serviceData.length === 0 && (
          <div className={appointmentPageStyles.serviceEmptyStateText}>
            No medical services registered.
          </div>
        )}
        {!loadingServices && serviceData.length > 0 && (
          <div className={appointmentPageStyles.serviceGrid}>
            {serviceData.map((srv) => (
              <div key={srv.id} className={cardStyles.serviceCard}>
                <div className={cardStyles.serviceImageContainer}>
                  <img
                    src={srv.image || "/placeholder-service.png"}
                    alt={srv.name}
                    className={cardStyles.image}
                    loading="lazy"
                  />
                </div>

                <h3 className={cardStyles.serviceName}>{srv.name}</h3>

                <p className={cardStyles.price}>₹{srv.price}</p>

                <p className={cardStyles.serviceDateContainer}>
                  <CalendarDays className={iconSize.medium} /> {srv.date}
                </p>

                <p className={cardStyles.serviceTimeContainer}>
                  <Clock className={iconSize.medium} /> {srv.time}
                </p>

                <div className={cardStyles.badgesContainer}>
                  <PaymentBadge payment={srv.payment} />
                  <StatusBadge itemStatus={srv.status} />
                </div>

                {srv.status === "Rescheduled" && srv.rescheduledTo ? (
                  <div className={cardStyles.serviceRescheduledText}>
                    Rescheduled to{" "}
                    <span className={cardStyles.rescheduledSpan}>
                      {srv.rescheduledTo.date} : {srv.rescheduledTo.time}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

