import React, { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, CheckCircle, XCircle, BadgeIndianRupee, Search, ShieldCheck, Loader2 } from "lucide-react";
import { useAdminAuth } from "../../context/AuthContext";
import { serviceDashboardStyles } from "../../assets/dummyStyles";

const API_BASE = "http://localhost:4000";

function normalizeService(doc) {
  if (!doc) return null;
  const id = doc._id || doc.id || String(Math.random()).slice(2);
  const name = doc.name || doc.title || doc.serviceName || "Untitled Service";
  const price =
    Number(doc.price ?? doc.fee ?? doc.fees ?? doc.cost ?? doc.amount) || 0;
  const image =
    doc.imageUrl ||
    doc.image ||
    doc.avatar ||
    `https://i.pravatar.cc/150?u=${id}`;

  const totalAppointments =
    doc.totalAppointments ??
    doc.appointments?.total ??
    doc.count ??
    doc.stats?.total ??
    doc.bookings ??
    0;
  const completed =
    doc.completed ??
    doc.appointments?.completed ??
    doc.stats?.completed ??
    doc.completedAppointments ??
    0;
  const canceled =
    doc.canceled ??
    doc.appointments?.canceled ??
    doc.stats?.canceled ??
    doc.canceledAppointments ??
    0;

  return {
    id,
    name,
    price,
    image,
    totalAppointments: Number(totalAppointments) || 0,
    completed: Number(completed) || 0,
    canceled: Number(canceled) || 0,
    raw: doc,
  };
}

export default function ServiceDashboard({ services: servicesProp = null }) {
  const { getToken } = useAdminAuth();
  const [services, setServices] = useState(
    Array.isArray(servicesProp) ? servicesProp.map(normalizeService) : [],
  );
  const [loading, setLoading] = useState(!Array.isArray(servicesProp));
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const pollHandleRef = useRef(null);

  async function fetchServices({ showLoading = true } = {}) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      const token = await getToken();
      const url = `${API_BASE}/api/service-appointments/stats/summary`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message || `Failed to fetch services (${res.status})`,
        );
      }
      const body = await res.json();

      let list = [];
      if (Array.isArray(body)) list = body;
      else if (Array.isArray(body.services)) list = body.services;
      else if (Array.isArray(body.data)) list = body.data;
      else if (Array.isArray(body.items)) list = body.items;
      else {
        const maybeArray = Object.values(body).find((v) => Array.isArray(v));
        if (maybeArray) list = maybeArray;
      }

      const normalized = (list || []).map(normalizeService).filter(Boolean);
      if (mountedRef.current) {
        setServices(normalized);
        setError(null);
      }
    } catch (err) {
      console.error("Service fetch error:", err);
      if (mountedRef.current) {
        setError(err.message || "Failed to load services");
      }
    } finally {
      if (mountedRef.current && showLoading) setLoading(false);
      fetchingRef.current = false;
    }
  }

  useEffect(() => {
    window.refreshServices = () => fetchServices({ showLoading: true });
    return () => {
      try {
        delete window.refreshServices;
      } catch {}
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (Array.isArray(servicesProp)) {
      setServices(servicesProp.map(normalizeService));
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    fetchServices({ showLoading: true });
    function startPolling() {
      if (pollHandleRef.current) return;
      pollHandleRef.current = setInterval(() => {
        if (document.visibilityState === "visible")
          fetchServices({ showLoading: false });
      }, 10000);
    }

    function stopPolling() {
      if (pollHandleRef.current) {
        clearInterval(pollHandleRef.current);
        pollHandleRef.current = null;
      }
    }

    startPolling();

    function onFocus() {
      fetchServices({ showLoading: false });
    }
    window.addEventListener("focus", onFocus);

    function onServicesUpdated() {
      fetchServices({ showLoading: false });
    }
    window.addEventListener("services:updated", onServicesUpdated);

    function onStorage(e) {
      if (e?.key === "service_bookings_updated") {
        fetchServices({ showLoading: false });
      }
    }
    window.addEventListener("storage", onStorage);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchServices({ showLoading: false });
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mountedRef.current = false;
      stopPolling();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("services:updated", onServicesUpdated);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [servicesProp]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return services;
    const qNum = Number(q);
    return services.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      if (!Number.isNaN(qNum) && s.price <= qNum) return true;
      if (s.price.toString().includes(q)) return true;
      return false;
    });
  }, [services, searchQuery]);

  const INITIAL_COUNT = 8;
  const visibleServices = showAll
    ? filteredServices
    : filteredServices.slice(0, INITIAL_COUNT);

  const totals = useMemo(() => {
    return filteredServices.reduce(
      (acc, s) => {
        acc.totalServices += 1;
        acc.totalAppointments += s.totalAppointments;
        acc.totalCompleted += s.completed;
        acc.totalCanceled += s.canceled;
        acc.totalEarning += s.completed * s.price;
        return acc;
      },
      {
        totalServices: 0,
        totalAppointments: 0,
        totalCompleted: 0,
        totalCanceled: 0,
        totalEarning: 0,
      },
    );
  }, [filteredServices]);

  function formatCurrency(v) {
    return `₹${Number(v || 0).toLocaleString()}`;
  }

  return (
    <div className={serviceDashboardStyles.container}>
      <div className={serviceDashboardStyles.innerContainer}>
        {/* Header */}
        <div className={serviceDashboardStyles.header.container}>
          <div>
            <h2 className={serviceDashboardStyles.header.title}>Services Dashboard</h2>
            <p className={serviceDashboardStyles.header.subtitle}>
              Monitor appointment counts, service earnings, and metrics
            </p>
          </div>

          <div className={serviceDashboardStyles.refresh.container}>
            <span className={serviceDashboardStyles.refresh.countText}>
              Found {filteredServices.length} services
            </span>
            <button
              onClick={() => fetchServices({ showLoading: true })}
              disabled={Array.isArray(servicesProp)}
              className={serviceDashboardStyles.refresh.button(Array.isArray(servicesProp))}
            >
              Refresh Stats
            </button>
          </div>
        </div>

        {/* Stats Summary Grid */}
        <div className={serviceDashboardStyles.statGrid}>
          {/* Services Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="text-xs text-gray-500">Active Services</div>
              <div className="text-xl font-bold text-gray-800">{totals.totalServices}</div>
            </div>
          </div>

          {/* Bookings Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Bookings</div>
              <div className="text-xl font-bold text-gray-800">{totals.totalAppointments}</div>
            </div>
          </div>

          {/* Completed Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="text-xs text-gray-500">Completed Sessions</div>
              <div className="text-xl font-bold text-gray-800">{totals.totalCompleted}</div>
            </div>
          </div>

          {/* Canceled Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <XCircle size={24} />
            </div>
            <div>
              <div className="text-xs text-gray-500">Canceled Sessions</div>
              <div className="text-xl font-bold text-gray-800">{totals.totalCanceled}</div>
            </div>
          </div>

          {/* Earnings Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <BadgeIndianRupee size={24} />
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Earnings</div>
              <div className="text-xl font-bold text-gray-800">{formatCurrency(totals.totalEarning)}</div>
            </div>
          </div>
        </div>

        {/* Search controls */}
        <div className={serviceDashboardStyles.search.container}>
          <div className={serviceDashboardStyles.search.inputContainer}>
            <Search size={16} className="text-emerald-400" />
            <input
              type="text"
              placeholder="Search services..."
              className={serviceDashboardStyles.search.input}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading / Error / Content */}
        {loading && (
          <div className="text-center py-12 bg-white rounded-2xl border border-emerald-50 shadow-sm flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-gray-600">Loading service statistics...</span>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-6 bg-red-50 text-rose-700 rounded-2xl border border-rose-100">
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && visibleServices.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-emerald-50 shadow-sm">
            <ShieldCheck size={36} className="mx-auto mb-2 text-emerald-300" />
            <span className="text-gray-600">No services found matching filters.</span>
          </div>
        )}

        {!loading && !error && visibleServices.length > 0 && (
          <div className={serviceDashboardStyles.table.container}>
            {/* Tablet Header */}
            <div className={serviceDashboardStyles.table.headerMd}>
              <div className="col-span-2 text-left pl-3">Service</div>
              <div className={serviceDashboardStyles.table.headerText}>Appointments</div>
              <div className={serviceDashboardStyles.table.headerText}>Completed</div>
              <div className={serviceDashboardStyles.table.headerText}>Canceled</div>
            </div>

            {/* Desktop Header */}
            <div className={serviceDashboardStyles.table.headerLg}>
              <div className="col-span-5 text-left pl-3">Service</div>
              <div className="col-span-2">Price</div>
              <div className={serviceDashboardStyles.table.headerTextLg(1)}>Appointments</div>
              <div className={serviceDashboardStyles.table.headerTextLg(1)}>Completed</div>
              <div className={serviceDashboardStyles.table.headerTextLg(1)}>Canceled</div>
              <div className="col-span-2 text-right pr-4">Earning</div>
            </div>

            <div className={serviceDashboardStyles.table.body}>
              {visibleServices.map((s) => {
                const earning = s.completed * s.price;
                return (
                  <div key={s.id} className={serviceDashboardStyles.table.row}>
                    {/* Tablet view row */}
                    <div className={serviceDashboardStyles.table.tabletView}>
                      <div className="flex items-center gap-3 col-span-2">
                        <img src={s.image} alt={s.name} className={serviceDashboardStyles.table.tabletImage} />
                        <div className={serviceDashboardStyles.table.tabletTextContainer}>
                          <div className={serviceDashboardStyles.table.tabletServiceName}>{s.name}</div>
                          <div className={serviceDashboardStyles.table.tabletPrice}>{formatCurrency(s.price)}</div>
                        </div>
                      </div>
                      <div className={serviceDashboardStyles.table.tabletCell}>{s.totalAppointments}</div>
                      <div className={serviceDashboardStyles.table.tabletCell + " text-emerald-600 font-semibold"}>{s.completed}</div>
                      <div className={serviceDashboardStyles.table.tabletCell + " text-rose-500"}>{s.canceled}</div>
                    </div>

                    {/* Desktop view row */}
                    <div className={serviceDashboardStyles.table.desktopView}>
                      <div className="flex items-center gap-4 col-span-5">
                        <img src={s.image} alt={s.name} className={serviceDashboardStyles.table.desktopImage} />
                        <div className={serviceDashboardStyles.table.desktopServiceName}>{s.name}</div>
                      </div>
                      <div className="col-span-2 text-emerald-800 font-semibold">{formatCurrency(s.price)}</div>
                      <div className={serviceDashboardStyles.table.desktopCenterCell(1)}>{s.totalAppointments}</div>
                      <div className={serviceDashboardStyles.table.desktopCenterCell(1) + " text-emerald-600 font-bold"}>{s.completed}</div>
                      <div className={serviceDashboardStyles.table.desktopCenterCell(1) + " text-rose-500"}>{s.canceled}</div>
                      <div className="col-span-2 text-right pr-4 text-emerald-900 font-bold">{formatCurrency(earning)}</div>
                    </div>

                    {/* Mobile view row */}
                    <div className={serviceDashboardStyles.table.mobileView}>
                      <div className="flex gap-3">
                        <img src={s.image} alt={s.name} className={serviceDashboardStyles.table.mobileImage} />
                        <div className="flex-1 min-w-0">
                          <div className={serviceDashboardStyles.table.mobileServiceHeader}>
                            <div className={serviceDashboardStyles.table.mobileServiceName}>{s.name}</div>
                            <div className="text-sm font-bold text-emerald-800">{formatCurrency(s.price)}</div>
                          </div>

                          <div className={serviceDashboardStyles.table.mobileStatsContainer}>
                            <div className={serviceDashboardStyles.table.mobileStatItem("emerald")}>
                              <Calendar size={14} />
                              <span className="leading-none">{s.totalAppointments} Appointments</span>
                            </div>
                            <div className={serviceDashboardStyles.table.mobileStatItem("emerald")}>
                              <CheckCircle size={14} />
                              <span className="leading-none text-emerald-700">{s.completed} Completed</span>
                            </div>
                            <div className={serviceDashboardStyles.table.mobileStatItem("red")}>
                              <XCircle size={14} />
                              <span className="leading-none text-red-500">{s.canceled} Canceled</span>
                            </div>
                            <div className={serviceDashboardStyles.table.mobileStatItem("emerald")}>
                              <BadgeIndianRupee size={14} />
                              <span className="leading-none">Earning: {formatCurrency(earning)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredServices.length > INITIAL_COUNT && (
              <div className="flex justify-center p-4 border-t border-emerald-50 bg-gray-50">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="px-4 py-2 rounded-full bg-white border border-emerald-200 shadow-sm text-sm text-emerald-700 hover:bg-emerald-50 transition"
                >
                  {showAll ? "Show Less" : "Show More"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
