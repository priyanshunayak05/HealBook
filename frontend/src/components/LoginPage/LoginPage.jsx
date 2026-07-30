import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import logo from "../../assets/logo.png";
import { loginPageStyles as ls, toastStyles } from "../../assets/dummyStyles";

const STORAGE_KEY = "doctorToken_v1";
const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://healbook-backend.onrender.com").replace(/\/$/, "");

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "doctor" }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(json?.message || "Login failed", { duration: 4000 });
        setBusy(false);
        return;
      }
      const token = json?.token || json?.data?.token;
      if (!token) {
        toast.error("Authentication token missing");
        setBusy(false);
        return;
      }

      const doctorId =
        json?.data?._id || json?.doctor?._id || json?.data?.doctor?._id;
      if (!doctorId) {
        toast.error("Doctor ID missing from server response");
        setBusy(false);
        return;
      }

      localStorage.setItem(STORAGE_KEY, token);
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: token }),
      );
      toast.success("Login successful — redirecting...", {
        style: toastStyles.successToast,
      });
      setTimeout(() => {
        navigate(`/doctor-admin/${doctorId}`);
      }, 700);
    } catch (err) {
      console.error("login error", err);
      toast.error("Network error during login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={ls.mainContainer}>
      <Link to="/" className={ls.backButton}>
        <ArrowLeft className={ls.backButtonIcon} />
        <span>Back to Home</span>
      </Link>

      <div className={ls.loginCard}>
        <div className={ls.logoContainer}>
          <img src={logo} alt="MediCare" className={ls.logo} />
        </div>

        <h2 className={ls.title}>Doctor Portal</h2>
        <p className={ls.subtitle}>Please sign in to access your dashboard</p>

        <form onSubmit={handleLogin} className={ls.form}>
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1 pl-2">Email Address</label>
            <input
              type="email"
              required
              placeholder="doctor@medicare.com"
              className={ls.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1 pl-2">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className={ls.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className={`${ls.submitButton} cursor-pointer hover:shadow-lg transition disabled:opacity-60`}
          >
            {busy ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}