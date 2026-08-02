import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { isLoaded: clerkAuthLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getBackendUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "");
    }
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168."))
    ) {
      return "http://localhost:4000";
    }
    return "https://healbook-backend.onrender.com";
  };

  const API_BASE = getBackendUrl();

  useEffect(() => {
    const fetchUserProfile = async () => {
      // If Clerk is still loading, wait
      if (!clerkAuthLoaded) return;

      // If Clerk is loaded but not signed in, set state to null and finish loading
      if (!isSignedIn) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      // If Clerk is signed in, fetch the profile from the backend
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) throw new Error("Could not obtain Clerk session token");

        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load user profile from backend");
        }

        const resData = await res.json();
        if (resData.success) {
          setUser(resData.data);
          setRole(resData.role || resData.data?.role);
        } else {
          throw new Error(resData.message || "Failed to load user profile");
        }
      } catch (err) {
        console.error("AuthContext fetch profile error:", err);
        setError(err.message);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [clerkAuthLoaded, isSignedIn]);

  const logout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("SignOut error:", err);
    }
    setUser(null);
    setRole(null);
  };

  const value = {
    user,
    role,
    loading: !clerkAuthLoaded || loading,
    error,
    getToken,
    logout,
    refreshUser: () => {}
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AuthProvider");
  }
  return context;
};
