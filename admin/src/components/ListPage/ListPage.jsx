import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/AuthContext";
import { Trash2, Search, Filter, Plus, ChevronDown, Star, Loader2 } from "lucide-react";
import { doctorListStyles } from "../../assets/dummyStyles";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

function formatDateISO(iso) {
  if (!iso || typeof iso !== "string") return iso;
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "June",
    "July",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = String(Number(d));
  const month = monthNames[dateObj.getMonth()] || "";
  return `${day} ${month} ${y}`;
}

function normalizeToDateString(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().split("T")[0];
}

function buildScheduleMap(schedule) {
  const map = {};
  if (!schedule || typeof schedule !== "object") return map;
  Object.entries(schedule).forEach(([k, v]) => {
    const nd = normalizeToDateString(k) || String(k);
    map[nd] = Array.isArray(v) ? v.slice() : [];
  });
  return map;
}

function getSortedScheduleDates(scheduleLike) {
  let keys = [];
  if (Array.isArray(scheduleLike)) {
    keys = scheduleLike.map(normalizeToDateString).filter(Boolean);
  } else if (scheduleLike && typeof scheduleLike === "object") {
    keys = Object.keys(scheduleLike).map(normalizeToDateString).filter(Boolean);
  }

  keys = Array.from(new Set(keys));
  const parsed = keys.map((ds) => ({ ds, date: new Date(ds) }));
  const dateVal = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  const today = new Date();
  const todayVal = dateVal(today);

  const past = parsed
    .filter((p) => dateVal(p.date) < todayVal)
    .sort((a, b) => dateVal(b.date) - dateVal(a.date));

  const future = parsed
    .filter((p) => dateVal(p.date) >= todayVal)
    .sort((a, b) => dateVal(a.date) - dateVal(b.date));

  return [...past, ...future].map((p) => p.ds);
}

export default function ListPage() {
  const { getToken } = useAdminAuth();
  const [doctors, setDoctors] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  const [isMobileScreen, setIsMobileScreen] = useState(false);
  useEffect(() => {
    function onResize() {
      if (typeof window === "undefined") return;
      setIsMobileScreen(window.innerWidth < 640);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function fetchDoctors() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/doctors?limit=300`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await res.json().catch(() => null);

      if (res.ok && body && body.success) {
        const list = Array.isArray(body.data)
          ? body.data
          : Array.isArray(body.doctors)
          ? body.doctors
          : [];
        const normalized = list.map((d) => {
          const scheduleMap = buildScheduleMap(d.schedule || {});
          return {
            ...d,
            schedule: scheduleMap,
          };
        });
        setDoctors(normalized);
      } else {
        console.error("Failed to fetch doctors", { status: res.status, body });
        setDoctors([]);
      }
    } catch (err) {
      console.error("Network error fetching doctors", err);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDoctors();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = doctors;
    if (filterStatus === "available") {
      list = list.filter(
        (d) => (d.availability || "").toString().toLowerCase() === "available"
      );
    } else if (filterStatus === "unavailable") {
      list = list.filter(
        (d) => (d.availability || "").toString().toLowerCase() !== "available"
      );
    }
    if (!q) return list;
    return list.filter((d) => {
      return (
        (d.name || "").toLowerCase().includes(q) ||
        (d.specialization || "").toLowerCase().includes(q)
      );
    });
  }, [doctors, query, filterStatus]);

  const displayed = useMemo(() => {
    if (showAll) return filtered;
    return filtered.slice(0, 6);
  }, [filtered, showAll]);

  function toggle(id) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  async function removeDoctor(id) {
    const doc = doctors.find((d) => (d._id || d.id) === id);
    if (!doc) return;
    const ok = window.confirm(`Delete ${doc.name}? This cannot be undone.`);
    if (!ok) return;

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/doctors/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        alert(body?.message || "Failed to delete");
        return;
      }
      setDoctors((prev) => prev.filter((p) => (p._id || p.id) !== id));
      if (expanded === id) setExpanded(null);
    } catch (err) {
      console.error("delete error", err);
      alert("Network error deleting doctor");
    }
  }

  function applyStatusFilter(status) {
    setFilterStatus((prev) => (prev === status ? "all" : status));
    setExpanded(null);
    setShowAll(false);
  }

  return (
    <div className={doctorListStyles.container}>
      <div className={doctorListStyles.headerContainer}>
        <div className={doctorListStyles.headerTopSection}>
          <div className="flex items-center gap-3">
            <h1 className={doctorListStyles.headerTitle}>Hospital Doctors Directory</h1>
          </div>

          <div className={doctorListStyles.headerSearchContainer}>
            <div className={doctorListStyles.searchBox}>
              <Search className={doctorListStyles.searchIcon} size={18} />
              <input
                type="text"
                placeholder="Search doctors..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={doctorListStyles.searchInput}
              />
            </div>
            
            <Link
              to="/add"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full shadow-sm transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} /> Add Doctor
            </Link>
          </div>
        </div>

        <div className={doctorListStyles.filterContainer}>
          <button
            onClick={() => applyStatusFilter("all")}
            className={doctorListStyles.filterButton(filterStatus === "all", "emerald")}
          >
            All Clinicians
          </button>
          <button
            onClick={() => applyStatusFilter("available")}
            className={doctorListStyles.filterButton(filterStatus === "available", "emerald")}
          >
            Available Status
          </button>
          <button
            onClick={() => applyStatusFilter("unavailable")}
            className={doctorListStyles.filterButton(filterStatus === "unavailable", "emerald")}
          >
            Unavailable Status
          </button>
        </div>
      </div>

      {loading ? (
        <div className={doctorListStyles.loadingContainer}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-800">Loading doctor database...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className={doctorListStyles.noResultsContainer}>
          <p className="text-sm font-semibold text-emerald-600">No doctors found matching the filter criteria.</p>
        </div>
      ) : (
        <div className={doctorListStyles.gridContainer}>
          {displayed.map((doc) => {
            const id = doc._id || doc.id;
            const isOpen = expanded === id;
            const isAvail = (doc.availability || "").toLowerCase() === "available";
            const scheduleMap = doc.schedule || {};
            const sortedDates = getSortedScheduleDates(scheduleMap);

            return (
              <article key={id} className={doctorListStyles.article}>
                <div className={doctorListStyles.articleContent}>
                  <img
                    src={doc.imageUrl || doc.image || `https://i.pravatar.cc/150?u=${id}`}
                    alt={doc.name}
                    className={doctorListStyles.doctorImage}
                  />

                  <div className={doctorListStyles.doctorInfoContainer}>
                    <div className={doctorListStyles.doctorHeader}>
                      <div>
                        <h3 className={doctorListStyles.doctorName}>{doc.name}</h3>
                        <span className={doctorListStyles.availabilityBadge(isAvail)}>
                          <span className={doctorListStyles.availabilityDot(isAvail)}></span>
                          {doc.availability || "Unavailable"}
                        </span>
                      </div>

                      <div className={doctorListStyles.ratingContainer}>
                        <div className={doctorListStyles.rating}>
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span className="font-semibold">{doc.rating || "5.0"}</span>
                        </div>
                        <button
                          onClick={() => toggle(id)}
                          className={doctorListStyles.toggleButton(isOpen)}
                          aria-label={isOpen ? "Collapse details" : "Expand details"}
                        >
                          <ChevronDown size={16} className="text-emerald-600 animate-bounce-subtle" />
                        </button>
                      </div>
                    </div>

                    <div className={doctorListStyles.doctorDetails}>
                      {doc.specialization || doc.speciality || "General"} • {doc.experience || "N/A"}
                    </div>

                    <div className={doctorListStyles.statsContainer}>
                      <span className={doctorListStyles.statsLabel}>Fee:</span>
                      <span className={doctorListStyles.statsValue}>₹ {doc.fee}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className={doctorListStyles.actionContainer}>
                        <button
                          onClick={() => removeDoctor(id)}
                          className={doctorListStyles.deleteButton}
                        >
                          <Trash2 size={13} /> Delete Clinician
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={doctorListStyles.expandableContent}
                  style={{
                    maxHeight: isOpen ? (isMobileScreen ? 320 : 600) : 0,
                    transition:
                      "max-height 420ms cubic-bezier(.2,.9,.2,1), padding 220ms ease",
                    paddingTop: isOpen ? 16 : 0,
                    paddingBottom: isOpen ? 16 : 0,
                  }}
                >
                  {isOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-emerald-50/50 pt-4 pb-2 animate-fadeIn">
                      <div className={doctorListStyles.aboutSection}>
                        <h4 className={doctorListStyles.aboutHeading}>About</h4>
                        <p className={doctorListStyles.aboutText}>{doc.about}</p>

                        <div className="mt-4">
                          <div className={doctorListStyles.qualificationsHeading}>
                            Qualifications
                          </div>
                          <div className={doctorListStyles.qualificationsText}>
                            {doc.qualifications}
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className={doctorListStyles.scheduleHeading}>
                            Schedule Availability
                          </div>
                          <div className="mt-2 flex flex-col gap-3">
                            {sortedDates.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No schedule slots registered.</p>
                            ) : (
                              sortedDates.map((date) => {
                                const slots = scheduleMap[date] || [];
                                return (
                                  <div key={date} className="border-b border-slate-50 last:border-0 pb-2">
                                    <div className={doctorListStyles.scheduleDate}>
                                      {formatDateISO(date)}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {slots.map((s, i) => (
                                        <span
                                          key={i}
                                          className={doctorListStyles.scheduleSlot}
                                        >
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      <aside className={doctorListStyles.statsSidebar}>
                        <div>
                          <div className={doctorListStyles.statsItemHeading}>
                            Success Rate
                          </div>
                          <div className={doctorListStyles.statsItemValue}>
                            {doc.success}%
                          </div>
                        </div>

                        <div>
                          <div className={doctorListStyles.statsItemHeading}>
                            Patients Treated
                          </div>
                          <div className={doctorListStyles.statsItemValue}>
                            {doc.patients}
                          </div>
                        </div>

                        <div>
                          <div className={doctorListStyles.statsItemHeading}>
                            Clinician Office Location
                          </div>
                          <div className={doctorListStyles.locationValue}>
                            {doc.location}
                          </div>
                        </div>
                      </aside>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 6 && (
        <div className={doctorListStyles.showMoreContainer}>
          <button
            onClick={() => setShowAll(!showAll)}
            className={doctorListStyles.showMoreButton}
          >
            {showAll ? "Show Less" : "Show More Clinicians"}
          </button>
        </div>
      )}
    </div>
  );
}