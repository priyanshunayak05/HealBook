import React from "react";
import logo from "../../assets/logo.png";
import { heroStyles as s } from "../../assets/dummyStyles";

export default function Hero({ isDoctor = false }) {
  return (
    <div className={s.container}>
      <div className={s.mainContainer}>
        <div className={s.section}>
          <div className={s.decorativeBg.container}>
            <div className={s.decorativeBg.blurBackground}>
              <div className={s.decorativeBg.blurShape}></div>
            </div>
            <div className={s.contentBox}>
              <div className={s.logoContainer}>
                <img src={logo} alt="MediCare Logo" className={s.logo} />
              </div>
              <h1 className={s.heading}>
                WELCOME TO MEDICARE ADMIN PANEL
              </h1>
              <p className={s.description}>
                {isDoctor
                  ? "Access your patient records, manage appointments, and review medical reports securely from your dashboard."
                  : "Manage hospital operations, doctors, staff, patient records, and system settings from a centralized control panel."}
              </p>
              <div className={s.infoCards.container}>
                <div className={s.infoCards.card}>
                  <h3 className={s.infoCards.cardTitle}>Secure Access</h3>
                  <p className={s.infoCards.cardText}>
                    Role-based login with protected medical data.
                  </p>
                </div>
                <div className={s.infoCards.card}>
                  <h3 className={s.infoCards.cardTitle}>Real-time Management</h3>
                  <p className={s.infoCards.cardText}>
                    Monitor hospital activity and patient flow.
                  </p>
                </div>
                <div className={s.infoCards.card}>
                  <h3 className={s.infoCards.cardTitle}>Medical Dashboard</h3>
                  <p className={s.infoCards.cardText}>
                    Clean, fast, and doctor-friendly interface.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}