import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { CircleChevronUp, Sparkles, Activity } from "lucide-react";

import { SignIn, SignUp } from "@clerk/clerk-react";
import UserSync from "./components/UserSync/UserSync";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import HomeDoctors from "./components/HomeDoctors/HomeDoctors";
import Certification from "./components/Certification/Certification";
import Testimonial from "./components/Testimonial/Testimonial";

import DoctorsPage from "./components/DoctorsPage/DoctorsPage";
import ServicePage from "./components/ServicePage/ServicePage";
import AppointmentPage from "./components/AppointmentPage/AppointmentPage";
import ContactPage from "./components/ContactPage/ContactPage";
import LoginPage from "./components/LoginPage/LoginPage";

import DoctorDetail from "./pages/DoctorDetail/DoctorDetail";
import ServiceDetail from "./pages/ServiceDetailPage/ServiceDetailPage";
import AppointmentSuccess from "./pages/AppointmentSuccess/AppointmentSuccess";

import DoctorNavbar from "./doctor/Navbar/Navbar";
import DoctorDashboard from "./doctor/DashboardPage/DashboardPage";
import DoctorAppointments from "./doctor/ListPage/ListPage";
import DoctorEditProfile from "./doctor/EditProfilePage/EditProfilePage";

const ScrollButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollTop}
      className={`fixed right-4 bottom-6 z-50 w-11 h-11 rounded-full flex items-center justify-center 
      bg-blue-600 text-white shadow-lg transition-all duration-300 
      ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} 
      hover:scale-110 hover:shadow-xl cursor-pointer`}
      title="Go to top"
    >
      <CircleChevronUp size={22} />
    </button>
  );
};

function HomeHero() {
  return (
    <div className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-blue-50 via-sky-50/50 to-indigo-50 overflow-hidden font-serif">
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-blue-100/70 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-80 h-80 bg-sky-100/70 rounded-full blur-3xl opacity-50"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-xs">
              <Sparkles size={14} className="text-blue-500" />
              <span>Welcoming Patients & Practitioners</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
              Premium Healthcare, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500">
                At Your Fingertips
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl">
              Connect with India's best specialists. Book video consultations, clinic slots, or request medical support in seconds.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/doctors"
                className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition hover:-translate-y-0.5"
              >
                Find Doctors
              </Link>
              <Link
                to="/services"
                className="px-6 py-3 rounded-full bg-white border border-blue-200 text-blue-700 font-semibold hover:bg-blue-50 transition hover:-translate-y-0.5"
              >
                Explore Services
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-blue-100">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">150+</div>
                <div className="text-xs text-slate-500 mt-1 font-semibold">Expert Doctors</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">20+</div>
                <div className="text-xs text-slate-500 mt-1 font-semibold">Medical Services</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">99.8%</div>
                <div className="text-xs text-slate-500 mt-1 font-semibold">Satisfaction</div>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="relative w-full max-w-md h-80 sm:h-96 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-100 to-sky-200 shadow-2xl border-4 border-white">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80')" }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent"></div>
              
              <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-blue-50 flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
                  <Activity size={24} className="animate-pulse" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Realtime Diagnostics</div>
                  <div className="text-sm font-bold text-slate-800">Connected clinical slots</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <HomeHero />
                <HomeDoctors />
                <Certification />
                <Testimonial />
              </>
            }
          />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctor/:id" element={<DoctorDetail />} />
          <Route path="/services" element={<ServicePage />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/appointments" element={<AppointmentPage />} />
          <Route path="/appointment/success" element={<AppointmentSuccess />} />
          <Route path="/appointment/cancel" element={<AppointmentSuccess />} />
          <Route path="/service-appointment/success" element={<AppointmentSuccess />} />
          <Route path="/service-appointment/cancel" element={<AppointmentSuccess />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/sign-in/*"
            element={
              <div className="flex justify-center items-center py-16">
                <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" redirectUrl="/" />
              </div>
            }
          />
          <Route
            path="/sign-up/*"
            element={
              <div className="flex justify-center items-center py-16">
                <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" redirectUrl="/" />
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function DoctorLayout() {
  const token = localStorage.getItem("doctorToken_v1");

  if (!token) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <DoctorNavbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<DoctorDashboard />} />
          <Route path="/appointments" element={<DoctorAppointments />} />
          <Route path="/profile/edit" element={<DoctorEditProfile />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = "auto";
      document.documentElement.style.overflowX = "auto";
    };
  }, []);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <UserSync />
      <Routes>
        <Route path="/doctor-admin/login" element={<LoginPage />} />
        <Route path="/doctor-admin/:id/*" element={<DoctorLayout />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
      <ScrollButton />
    </>
  );
}
