import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, UserPlus, Users, Calendar, Grid, PlusSquare, List, Menu, X, LogOut } from "lucide-react";
import { useAdminAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";
import { navbarStyles as ns } from "../../assets/dummyStyles";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, loading, logout } = useAdminAuth();

  const navInnerRef = useRef(null);
  const indicatorRef = useRef(null);

  const handleSignOut = async () => {
    logout();
    navigate("/login");
  };

  const moveIndicator = useCallback(() => {
    const container = navInnerRef.current;
    const ind = indicatorRef.current;
    if (!container || !ind) return;

    const active = container.querySelector(".nav-item.active");
    if (!active) {
      ind.style.opacity = "0";
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    const left = activeRect.left - containerRect.left + container.scrollLeft;
    const width = activeRect.width;

    ind.style.transform = `translateX(${left}px)`;
    ind.style.width = `${width}px`;
    ind.style.opacity = "1";
  }, []);

  useLayoutEffect(() => {
    moveIndicator();
    const t = setTimeout(() => {
      moveIndicator();
    }, 120);
    return () => clearTimeout(t);
  }, [location.pathname, moveIndicator]);

  useEffect(() => {
    const container = navInnerRef.current;
    if (!container) return;

    const onScroll = () => {
      moveIndicator();
    };
    container.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      moveIndicator();
    });
    ro.observe(container);
    if (container.parentElement) ro.observe(container.parentElement);

    window.addEventListener("resize", moveIndicator);
    moveIndicator();

    return () => {
      container.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", moveIndicator);
    };
  }, [moveIndicator]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const getNavItems = () => {
    if (!role) return [];

    if (role === "doctor") {
      return [
        { to: "/h", label: "Dashboard", icon: <Home size={16} /> },
        { to: "/appointments", label: "Appointments", icon: <Calendar size={16} /> },
        { to: "/profile", label: "Profile", icon: <Users size={16} /> },
      ];
    }

    return [
      { to: "/h", label: "Dashboard", icon: <Home size={16} /> },
      { to: "/add", label: "Add Doctor", icon: <UserPlus size={16} /> },
      { to: "/list", label: "List Doctors", icon: <Users size={16} /> },
      { to: "/appointments", label: "Appointments", icon: <Calendar size={16} /> },
      { to: "/service-dashboard", label: "Service Dashboard", icon: <Grid size={16} /> },
      { to: "/list-service", label: "Services", icon: <List size={16} /> },
      { to: "/service-appointments", label: "Service Appointments", icon: <Calendar size={16} /> },
    ];
  };

  const navItems = getNavItems();

  const CenterNavItem = ({ to, label, icon }) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`${ns.centerNavItemBase} nav-item ${active ? `active ${ns.centerNavItemActive}` : ns.centerNavItemInactive
          }`}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {icon}
          <span>{label}</span>
        </div>
      </Link>
    );
  };

  const MobileItem = ({ to, label, icon, onClick }) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`${ns.mobileItemBase} ${active ? ns.mobileItemActive : ns.mobileItemInactive
          }`}
      >
        {icon}
        <span>{label}</span>
      </Link>
    );
  };

  if (loading) return null;

  return (
    <header className={ns.header}>
      <nav className={ns.navContainer}>
        <div className={ns.flexContainer}>
          <Link to="/" className={ns.logoContainer}>
            <img src={logo} alt="Logo" className={ns.logoImage} />
            <div>
              <div className={ns.logoLink}>MediCare</div>
              <div className={ns.logoSubtext}>HMS Portal</div>
            </div>
          </Link>

          {user && (
            <div className={ns.centerNavContainer}>
              <div className={ns.glowEffect}>
                <div className={ns.centerNavInner}>
                  <div
                    ref={navInnerRef}
                    tabIndex={0}
                    className={ns.centerNavScrollContainer}
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {navItems.map((item) => (
                      <CenterNavItem
                        key={item.to}
                        to={item.to}
                        label={item.label}
                        icon={item.icon}
                      />
                    ))}
                    <div ref={indicatorRef} className={ns.indicator} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={ns.rightContainer}>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden md:inline text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full capitalize">
                  {role}
                </span>
                <button onClick={handleSignOut} className={ns.signOutButton}>
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            ) : (
              <Link to="/login" className={ns.loginButton}>
                Login
              </Link>
            )}

            <button
              onClick={() => setOpen(!open)}
              className={ns.mobileMenuButton}
              aria-label="Toggle menu"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && user && (
          <div className={ns.mobileMenuContainer}>
            <div className={ns.mobileMenuInner}>
              {navItems.map((item) => (
                <MobileItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  onClick={() => setOpen(false)}
                />
              ))}

              <div className={ns.mobileAuthContainer}>
                <button onClick={() => { handleSignOut(); setOpen(false); }} className={ns.mobileSignOutButton}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
