import React, { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, ShieldAlert } from "lucide-react";
import { contactPageStyles } from "../../assets/dummyStyles";

export default function ContactPage() {
  const initial = {
    name: "",
    email: "",
    phone: "",
    department: "",
    service: "",
    message: "",
  };

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const departments = [
    "General Physician",
    "Cardiology",
    "Orthopedics",
    "Dermatology",
    "Pediatrics",
    "Gynecology",
  ];

  const servicesMapping = {
    "General Physician": [
      "General Consultation",
      "Adult Checkup",
      "Vaccination",
      "Health Screening",
    ],
    Cardiology: [
      "ECG",
      "Echocardiography",
      "Stress Test",
      "Heart Consultation",
    ],
    Orthopedics: ["Fracture Care", "Joint Pain Consultation", "Physiotherapy"],
    Dermatology: ["Skin Consultation", "Allergy Test", "Acne Treatment"],
    Pediatrics: ["Child Checkup", "Vaccination (Child)", "Growth Monitoring"],
    Gynecology: ["Antenatal Care", "Pap Smear", "Ultrasound"],
  };

  const genericServices = [
    "General Consultation",
    "ECG",
    "Blood Test",
    "X-Ray",
    "Ultrasound",
    "Physiotherapy",
    "Vaccination",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Invalid email address";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    if (!form.message.trim()) newErrors.message = "Message cannot be empty";
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSent(true);
    setTimeout(() => {
      setForm(initial);
      setSent(false);
    }, 3000);
  };

  return (
    <div className={contactPageStyles.pageContainer}>
      <div className={contactPageStyles.bgAccent1} />
      <div className={contactPageStyles.bgAccent2} />

      <div className={contactPageStyles.gridContainer}>
        {/* Contact Form */}
        <div className={contactPageStyles.formContainer}>
          <h2 className={contactPageStyles.formTitle}>Contact Us</h2>
          <p className={contactPageStyles.formSubtitle}>Send us a message or request general inquiries</p>

          <form onSubmit={handleSubmit} className={contactPageStyles.formSpace}>
            <div className={contactPageStyles.formGrid}>
              <div>
                <label className={contactPageStyles.label}>Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={contactPageStyles.input}
                  placeholder="John Doe"
                />
                {errors.name && <p className={contactPageStyles.error}>{errors.name}</p>}
              </div>

              <div>
                <label className={contactPageStyles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={contactPageStyles.input}
                  placeholder="john@example.com"
                />
                {errors.email && <p className={contactPageStyles.error}>{errors.email}</p>}
              </div>
            </div>

            <div className={contactPageStyles.formGrid}>
              <div>
                <label className={contactPageStyles.label}>Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className={contactPageStyles.input}
                  placeholder="+91 XXXXX XXXXX"
                />
                {errors.phone && <p className={contactPageStyles.error}>{errors.phone}</p>}
              </div>

              <div>
                <label className={contactPageStyles.label}>Department</label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className={contactPageStyles.input}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={contactPageStyles.label}>Service Interested</label>
              <select
                name="service"
                value={form.service}
                onChange={handleChange}
                className={contactPageStyles.input}
              >
                <option value="">Select Service</option>
                {form.department && servicesMapping[form.department]
                  ? servicesMapping[form.department].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))
                  : genericServices.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className={contactPageStyles.label}>Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                className={contactPageStyles.textarea}
                placeholder="How can we help you?"
                rows={4}
              />
              {errors.message && <p className={contactPageStyles.error}>{errors.message}</p>}
            </div>

            <div className={contactPageStyles.buttonContainer}>
              <button type="submit" className={contactPageStyles.button}>
                <Send size={16} />
                <span>Submit Query</span>
              </button>
              {sent && <span className={contactPageStyles.sentMessage}>Message sent successfully!</span>}
            </div>
          </form>
        </div>

        {/* Info Column */}
        <div className={contactPageStyles.infoContainer}>
          <div className={contactPageStyles.infoCard}>
            <h3 className={`${contactPageStyles.infoTitle} text-blue-900`}>MediCare HQ</h3>
            <p className={contactPageStyles.infoText}>Gomti Nagar, Lucknow, Uttar Pradesh, 226010</p>

            <div className={contactPageStyles.infoItem}>
              <Phone size={16} className="text-blue-600" />
              <span>+91 522 XXX XXXX</span>
            </div>

            <div className={contactPageStyles.infoItem}>
              <Mail size={16} className="text-blue-600" />
              <span>support@medicare.com</span>
            </div>
          </div>

          {/* Timing Card */}
          <div className={contactPageStyles.hoursContainer}>
            <h3 className={`${contactPageStyles.hoursTitle} text-blue-950 flex items-center gap-2`}>
              <Clock size={20} />
              <span>Hours of Operation</span>
            </h3>
            <p className={contactPageStyles.hoursText}>Our emergency diagnostics and wards are open 24/7.</p>
            <p className={`${contactPageStyles.hoursText} mt-2 font-semibold`}>OPD Consultation Hours:</p>
            <p className={contactPageStyles.hoursText}>Mon - Sat: 9:00 AM - 8:00 PM</p>
            <p className={contactPageStyles.hoursText}>Sunday: Closed</p>
          </div>

          {/* Map Embed */}
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3559.460792853461!2d80.98709187529213!3d26.870382662861033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399be2ae3cea2421%3A0x6c0de12e8a77818f!2sGomti%20Nagar%2C%20Lucknow%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1731769000000!5m2!1sen!2sin"
            className={contactPageStyles.map}
            title="Gomti Nagar Map"
            loading="lazy"
            allowFullScreen
          ></iframe>
        </div>
      </div>

      <style>{`
        .animate-spin-slow {
          animation: spin 15s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}