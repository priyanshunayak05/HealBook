import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Briefcase, Loader2 } from "lucide-react";
import { homeDoctorsStyles, doctorsPageStyles } from "../../assets/dummyStyles";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

export default function HomeDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previewCount = 4;

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
      setDoctors(normalized);
    } catch (err) {
      console.error("loadDoctors error:", err);
      setError(err.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const preview = doctors.slice(0, previewCount);

  return (
    <section className={homeDoctorsStyles.section}>
      <div className={homeDoctorsStyles.container}>
        <div className={homeDoctorsStyles.header}>
          <h2 className={homeDoctorsStyles.title}>
            Meet Our <span className={homeDoctorsStyles.titleSpan}>Top Specialists</span>
          </h2>
          <p className={homeDoctorsStyles.subtitle}>
            Book appointments with highly qualified and experienced medical professionals.
          </p>
        </div>

        {loading && (
          <div className={homeDoctorsStyles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={homeDoctorsStyles.skeletonCard}>
                <div className={homeDoctorsStyles.skeletonImage} />
                <div className={homeDoctorsStyles.skeletonText1} />
                <div className={homeDoctorsStyles.skeletonText2} />
                <div className={homeDoctorsStyles.skeletonButton} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className={homeDoctorsStyles.errorContainer}>
            <p className={homeDoctorsStyles.errorText}>{error}</p>
            <button onClick={loadDoctors} className={homeDoctorsStyles.retryButton}>
              Retry Loading
            </button>
          </div>
        )}

        {!loading && !error && preview.length === 0 && (
          <p className="text-center text-slate-500 font-medium font-serif">
            No doctors available at this time. Please check back later.
          </p>
        )}

        {!loading && !error && preview.length > 0 && (
          <div className={doctorsPageStyles.doctorsGrid}>
            {preview.map((doctor) => (
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

                {/* Doctor Details */}
                <h3 className={doctorsPageStyles.doctorName}>{doctor.name}</h3>
                <p className={doctorsPageStyles.doctorSpecialization}>{doctor.specialization}</p>

                <div className={doctorsPageStyles.experienceBadge}>
                  <Briefcase className={doctorsPageStyles.experienceIcon} size={14} />
                  <span>{doctor.experience} Yrs Exp</span>
                </div>

                {/* Book Action */}
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

        <div className="flex justify-center mt-10">
          <Link
            to="/doctors"
            className="px-6 py-2.5 rounded-full border border-blue-600 text-blue-700 font-semibold hover:bg-blue-50 transition"
          >
            View All Doctors
          </Link>
        </div>
      </div>
    </section>
  );
}
