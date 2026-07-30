import React, { useMemo } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { Home, Calendar, Edit, LogOut } from "lucide-react";
import logo from "../../assets/logo.png";

const STORAGE_KEY = "doctorToken_v1";

export default function Navbar() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const doctorId = useMemo(() => {
    if (params?.id) return params.id;
    const m = location.pathname.match(/\/doctor-admin\/([^/]+)/);
    if (m) return m[1];
    return null;
  }, [params, location.pathname]);

  const basePath = doctorId
    ? `/doctor-admin/${doctorId}`
    : "/doctor-admin/login";

  const navItems = [
    { name: "Dashboard", to: `${basePath}`, Icon: Home },
    { name: "Appointments", to: `${basePath}/appointments`, Icon: Calendar },
    { name: "Edit Profile", to: `${basePath}/profile/edit`, Icon: Edit },
  ];

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: null }));
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-blue-100 shadow-sm font-serif">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-full" />
            <div>
              <span className="font-bold text-blue-900 text-lg">MediCare</span>
              <span className="block text-[10px] text-blue-600 font-semibold -mt-1">Doctor Portal</span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 p-1 rounded-full">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.Icon;
              return (
                <Link
                  key={item.name}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-blue-700 hover:text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-full transition"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}