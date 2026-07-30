import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, Loader2 } from "lucide-react";
import { servicePageStyles, serviceCardStyles } from "../../assets/dummyStyles";

const API_BASE = "http://localhost:4000";
const PlaceholderImg = "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=400&q=80";

const ServiceCard = ({ service }) => {
  const hasSrcSet =
    !!service.imageSrcSet ||
    (!!service.imageSmall && !!service.imageMedium && !!service.imageLarge);

  const src = service.imageUrl || service.image || service.imageSmall || "";
  const srcSet =
    service.imageSrcSet ||
    (service.imageSmall || service.image
      ? `${service.imageSmall || src} 480w, ${
          service.imageMedium || src
        } 768w, ${service.imageLarge || src} 1200w`
      : null);

  const name = service.name || "Service";
  const shortDescription = service.shortDescription || service.about || "";
  const id = service._id || service.id;

  return (
    <div className={serviceCardStyles.card}>
      <div className={serviceCardStyles.imageContainer} aria-hidden="true">
        {hasSrcSet ? (
          <picture className={serviceCardStyles.picture}>
            {service.imageWebp && (
              <source srcSet={service.imageWebp} type="image/webp" />
            )}
            {service.imageSrcSet ? (
              <img
                src={src || PlaceholderImg}
                srcSet={service.imageSrcSet}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                alt={name}
                loading="lazy"
                decoding="async"
                className={serviceCardStyles.responsiveImage}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PlaceholderImg;
                }}
              />
            ) : (
              <img
                src={src || PlaceholderImg}
                srcSet={srcSet || undefined}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                alt={name}
                loading="lazy"
                decoding="async"
                className={serviceCardStyles.responsiveImage}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PlaceholderImg;
                }}
              />
            )}
          </picture>
        ) : (
          <img
            src={src || PlaceholderImg}
            alt={name}
            loading="lazy"
            decoding="async"
            className={serviceCardStyles.responsiveImage}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PlaceholderImg;
            }}
          />
        )}
      </div>

      <div className="p-5 font-serif">
        <h3 className="text-xl font-bold text-blue-950 mb-2 truncate">{name}</h3>
        <p className="text-sm text-blue-800/70 mb-4 line-clamp-2 h-10">{shortDescription}</p>
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-blue-900">₹{service.price}</span>
          <Link
            to={`/services/${id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            <span>Book Service</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function ServicePage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadServices = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/services`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error((json && json.message) || `Failed to load (${res.status})`);
      }
      const list = Array.isArray(json) ? json : json.services || json.data || [];
      setServices(list);
    } catch (err) {
      console.error("loadServices error:", err);
      setError(err.message || "Failed to load services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  return (
    <div className={servicePageStyles.pageContainer}>
      <div className={servicePageStyles.maxWidthContainer}>
        {/* Header */}
        <div className={servicePageStyles.header}>
          <h1 className={servicePageStyles.title}>Our Medical Services</h1>
          <p className={servicePageStyles.subtitle}>
            Explore our professional medical diagnostics, clinical scans, and laboratory treatments
          </p>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className={servicePageStyles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={servicePageStyles.skeletonCard}>
                <div className={servicePageStyles.skeletonImage} />
                <div className={servicePageStyles.skeletonText1} />
                <div className={servicePageStyles.skeletonText2} />
                <div className={servicePageStyles.skeletonButton} />
              </div>
            ))}
          </div>
        )}

        {/* Error States */}
        {!loading && error && (
          <div className={servicePageStyles.errorContainer}>
            <p className={servicePageStyles.errorText}>{error}</p>
            <button onClick={loadServices} className={servicePageStyles.retryButton}>
              Retry Loading
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && services.length === 0 && (
          <div className={servicePageStyles.emptyState}>
            <Activity className="w-12 h-12 mx-auto mb-2 text-blue-300" />
            <p>No services registered yet. Please check back later.</p>
          </div>
        )}

        {!loading && !error && services.length > 0 && (
          <div className={servicePageStyles.servicesGrid}>
            {services.map((service) => (
              <ServiceCard key={service._id || service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}