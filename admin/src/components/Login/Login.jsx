import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignIn, SignUp, useAuth } from "@clerk/clerk-react";
import logo from "../../assets/logo.png";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { isLoaded, isSignedIn } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" or "signup"
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/h", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Loading HMS Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 px-4 py-12 font-sans animate-fadeIn">
      <div className="flex flex-col items-center mb-6">
        <img src={logo} alt="MediCare" className="w-20 h-20 object-contain mb-3" />
        <h2 className="text-3xl font-extrabold text-emerald-800 tracking-tight">MediCare HMS Portal</h2>
        <p className="text-sm text-emerald-600 font-medium mt-1">Hospital Management & Administration</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-emerald-100/50 p-8 flex flex-col items-center">
        {mode === "signin" ? (
          <div className="w-full flex flex-col items-center space-y-4">
            <h3 className="text-xl font-bold text-gray-800 self-start pl-1">Sign In</h3>
            <p className="text-xs text-gray-500 self-start pl-1">Access the Hospital Management System dashboard.</p>
            <div className="w-full flex justify-center py-2">
              <SignIn routing="hash" signUpUrl="" forceRedirectUrl="/h" />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-400">New administrator or doctor?</span>
              <button 
                onClick={() => setMode("signup")} 
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold transition cursor-pointer bg-transparent border-none outline-none"
              >
                Create Account
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-4">
            <h3 className="text-xl font-bold text-gray-800 self-start pl-1">Create Account</h3>
            <p className="text-xs text-gray-500 self-start pl-1">Register as a clinician or hospital administrator.</p>
            <div className="w-full flex justify-center py-2">
              <SignUp routing="hash" signInUrl="" forceRedirectUrl="/h" />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-400">Already registered?</span>
              <button 
                onClick={() => setMode("signin")} 
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold transition cursor-pointer bg-transparent border-none outline-none"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>
      
      <p className="mt-8 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} MediCare Inc. All rights reserved.
      </p>
    </div>
  );
}
