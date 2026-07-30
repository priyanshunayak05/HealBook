import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Calendar, Briefcase, ChevronDown } from "lucide-react";
import { doctorsPageStyles } from "../../assets/dummyStyles";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

export default function DoctorsPage() {
  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  const loadDoctors = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/doctors`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error((json && json.message) || `Failed to load (${res.status})`);
      }
      const items = (json && (json.data || json)) || [];
      const normalized = (Array.isArray(items) ? items : []).map((d) => {
        const id = d._id || d.id;
        const image = d.imageUrl || d.image || "";
        let available = true;
        if (typeof d.availability === "string") {
          available = d.availability.toLowerCase() === "available";
        } else if (typeof d.available === "boolean") {
          available = d.available;
        } else {
          available = d.availability === "Available" || d.available === true;
        }
        return {
          id,
          name: d.name || "Unknown",
          specialization: d.specialization || "",
          image,
          experience: d.experience ?? "—",
          available,
          raw: d,
        };
      });
      setAllDoctors(normalized);
    } catch (err) {
      console.error("loadDoctors error:", err);
      setError(err.message || "Failed to load doctors");
      setAllDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allDoctors;
    return allDoctors.filter(
      (doctor) =>
        (doctor.name || "").toLowerCase().includes(q) ||
        (doctor.specialization || "").toLowerCase().includes(q)
    );
  }, [allDoctors, searchTerm]);

  const displayedDoctors = showAll
    ? filteredDoctors
    : filteredDoctors.slice(0, 8);

  return (
    <div className={doctorsPageStyles.mainContainer}>
      {/* Background blur components */}
      <div className={doctorsPageStyles.backgroundShape1} />
      <div className={doctorsPageStyles.backgroundShape2} />

      <div className={doctorsPageStyles.wrapper}>
        {/* Header */}
        <div className={doctorsPageStyles.headerContainer}>
          <h1 className={doctorsPageStyles.headerTitle}>Find a Doctor</h1>
          <p className={doctorsPageStyles.headerSubtitle}>
            Browse our list of top medical practitioners and reserve slots online
          </p>
        </div>

        {/* Search */}
        <div className={doctorsPageStyles.searchContainer}>
          <div className={doctorsPageStyles.searchWrapper}>
            <Search className={doctorsPageStyles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name or specialty..."
              className={doctorsPageStyles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className={doctorsPageStyles.clearButton}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className={doctorsPageStyles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={doctorsPageStyles.skeletonCard}>
                <div className={doctorsPageStyles.skeletonImage} />
                <div className={doctorsPageStyles.skeletonName} />
                <div className={doctorsPageStyles.skeletonSpecialization} />
                <div className={doctorsPageStyles.skeletonButton} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className={doctorsPageStyles.errorContainer}>
            <p className={doctorsPageStyles.errorText}>{error}</p>
            <button onClick={loadDoctors} className={doctorsPageStyles.retryButton}>
              Retry Loading
            </button>
          </div>
        )}

        {/* Doctor Cards List */}
        {!loading && !error && displayedDoctors.length === 0 && (
          <div className={doctorsPageStyles.noResults}>
            No practitioners found matching your query.
          </div>
        )}

        {!loading && !error && displayedDoctors.length > 0 && (
          <div className={doctorsPageStyles.doctorsGrid}>
            {displayedDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className={`${doctorsPageStyles.doctorCard} group ${
                  !doctor.available ? doctorsPageStyles.doctorCardUnavailable : ""
                }`}
              >
                {/* Doctor Avatar */}
                {doctor.available ? (
                  <Link
                    to={`/doctor/${doctor.id}`}
                    state={{ doctor: doctor.raw || doctor }}
                    className={doctorsPageStyles.focusRing}
                  >
                    <div className={doctorsPageStyles.imageContainer}>
                      <img
                        src={doctor.image || "/placeholder-doctor.jpg"}
                        alt={doctor.name}
                        loading="lazy"
                        className={doctorsPageStyles.doctorImage}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/placeholder-doctor.jpg";
                        }}
                      />
                    </div>
                  </Link>
                ) : (
                  <div
                    className={`${doctorsPageStyles.imageContainer} ${doctorsPageStyles.imageContainerUnavailable}`}
                  >
                    <img
                      src={doctor.image || "/placeholder-doctor.jpg"}
                      alt={doctor.name}
                      loading="lazy"
                      className={`${doctorsPageStyles.doctorImage} ${doctorsPageStyles.doctorImageUnavailable}`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/placeholder-doctor.jpg";
                      }}
                    />
                  </div>
                )}

                {/* Info details */}
                <h3 className={doctorsPageStyles.doctorName}>{doctor.name}</h3>
                <p className={doctorsPageStyles.doctorSpecialization}>{doctor.specialization}</p>

                <div className={doctorsPageStyles.experienceBadge}>
                  <Briefcase className={doctorsPageStyles.experienceIcon} size={14} />
                  <span>{doctor.experience} Yrs Exp</span>
                </div>

                {/* Actions */}
                <div>
                  {doctor.available ? (
                    <Link
                      to={`/doctor/${doctor.id}`}
                      className={doctorsPageStyles.bookButton}
                    >
                      <Calendar className={doctorsPageStyles.bookButtonIcon} size={16} />
                      <span>Book Appointment</span>
                    </Link>
                  ) : (
                    <button disabled className={doctorsPageStyles.notAvailableButton}>
                      <span>Unavailable</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show More toggle button */}
        {!loading && !error && filteredDoctors.length > 8 && (
          <div className={doctorsPageStyles.showMoreContainer}>
            <button
              onClick={() => setShowAll(!showAll)}
              className={doctorsPageStyles.showMoreButton}
            >
              <span>{showAll ? "Show Less" : "Show More"}</span>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-300 ${
                  showAll ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.9s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.9s ease-out both; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }

        @media (max-width: 420px) {
          .max-w-7xl { padding-left: 10px; padding-right: 10px; }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
