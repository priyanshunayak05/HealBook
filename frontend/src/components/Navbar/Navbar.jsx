import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserButton, SignedIn, SignedOut, useClerk } from "@clerk/clerk-react";
import { Menu, X, ArrowRight, UserPlus, LogOut, LayoutDashboard } from "lucide-react";
import logo from "../../assets/logo.png";
import { navbarStyles as s } from "../../assets/dummyStyles";

const STORAGE_KEY = "doctorToken_v1";
const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });

  const location = useLocation();
  const navRef = useRef(null);
  const clerk = useClerk();
  const navigate = useNavigate();

  const [doctorId, setDoctorId] = useState("");
  useEffect(() => {
    if (isDoctorLoggedIn) {
      const token = localStorage.getItem(STORAGE_KEY);
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setDoctorId(payload?.id || payload?._id || "");
        } catch (e) {
          console.error("Token parse error", e);
        }
      }
    } else {
      setDoctorId("");
    }
  }, [isDoctorLoggedIn]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setIsDoctorLoggedIn(Boolean(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Doctors", href: "/doctors" },
    { label: "Services", href: "/services" },
    { label: "Appointments", href: "/appointments" },
    { label: "Contact", href: "/contact" },
  ];

  const handleDoctorLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsDoctorLoggedIn(false);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: null }));
    navigate("/");
  };

  return (
    <nav
      ref={navRef}
      className={`${s.navbarContainer} ${showNavbar ? s.navbarVisible : s.navbarHidden}`}
    >
      <div className={s.contentWrapper}>
        <div className={s.flexContainer}>
          <Link to="/" className={s.logoLink}>
            <div className={s.logoContainer}>
              <div className={s.logoImageWrapper}>
                <img src={logo} alt="MediCare" className={s.logoImage} />
              </div>
            </div>
            <div className={s.logoTextContainer}>
              <div className={s.logoTitle}>MediCare</div>
              <div className={s.logoSubtitle}>Healthcare System</div>
            </div>
          </Link>

          <div className={s.desktopNav}>
            <div className={s.navItemsContainer}>
              {navItems.map((item) => {
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`${s.navItem} ${
                      active ? s.navItemActive : s.navItemInactive
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className={s.rightContainer}>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              {!isDoctorLoggedIn && (
                <>
                  <Link
                    to="/doctor-admin/login"
                    className={`${s.doctorAdminButton} border border-blue-200 bg-white text-blue-700 hover:bg-blue-50`}
                  >
                    <UserPlus className={s.doctorAdminIcon} />
                    <span className={s.doctorAdminText}>Doctor Portal</span>
                  </Link>
                  <button
                    onClick={() => clerk.openSignIn()}
                    className={s.loginButton}
                  >
                    <span>Login</span>
                    <ArrowRight className={s.loginIcon} />
                  </button>
                </>
              )}
            </SignedOut>

            {isDoctorLoggedIn && (
              <div className="flex items-center gap-3">
                <Link
                  to={`/doctor-admin/${doctorId}`}
                  className="hidden lg:inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold hover:bg-blue-100 transition"
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleDoctorLogout}
                  className="hidden lg:inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-semibold hover:bg-rose-100 transition"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className={s.mobileToggle}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className={s.toggleIcon} /> : <Menu className={s.toggleIcon} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className={s.mobileMenu}>
            {navItems.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`${s.mobileMenuItem} ${
                    active ? s.mobileMenuItemActive : s.mobileMenuItemInactive
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-4 border-t border-blue-100 space-y-2 px-2">
              <SignedIn />
              <SignedOut>
                {!isDoctorLoggedIn && (
                  <>
                    <Link
                      to="/doctor-admin/login"
                      onClick={() => setIsOpen(false)}
                      className={s.mobileDoctorAdminButton}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Doctor Portal</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        clerk.openSignIn();
                      }}
                      className={s.mobileLoginButton}
                    >
                      <span>Login</span>
                    </button>
                  </>
                )}
              </SignedOut>

              {isDoctorLoggedIn && (
                <div className="space-y-2">
                  <Link
                    to={`/doctor-admin/${doctorId}`}
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-blue-200 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-all"
                  >
                    <LayoutDashboard size={16} />
                    <span>Doctor Dashboard</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleDoctorLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-rose-200 bg-white text-rose-700 text-sm font-semibold hover:bg-rose-50 transition-all"
                  >
                    <LogOut size={16} />
                    <span>Doctor Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}