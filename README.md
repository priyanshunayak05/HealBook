# 🏥 MediCare - Advanced Healthcare & Doctor Appointment Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19.0-blue.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Cluster-brightgreen.svg)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-v4.21-lightgrey.svg)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-v7.1-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.1-38B2AC.svg)](https://tailwindcss.com/)

**MediCare** is a modern, full-stack healthcare platform designed to streamline clinical operations, doctor scheduling, patient consultations, and administrative analytics. Built using the MERN stack (MongoDB, Express, React, Node.js) with Vite, Cloudinary, Clerk Authentication, and Tailwind CSS.

---

## 🌟 Features Overview

### 👨‍⚕️ Patient Web Application
* **Doctor Directory & Filtering**: Search doctors by name, specialty, location, or consultation fee with real-time status indicators (Available / Unavailable).
* **Online Appointment Booking**: Select available dates and interactive 12-hour/24-hour time slots.
* **Medical Services & Departments**: Explore clinical services, specialized medical departments, and treatment packages.
* **User Authentication**: Secure authentication via Clerk Auth and JWT.

### 🩺 Doctor Dashboard & Panel
* **Profile Management**: Update clinical details, experience, qualifications, biography, consultation fees, and profile avatars stored on **Cloudinary**.
* **Dynamic Slot Scheduling**: Add, edit, or remove daily consultation time slots.
* **Appointment Tracking**: View upcoming, confirmed, completed, or cancelled patient appointments.
* **Metrics & Analytics**: Monitor daily consultation earnings, total patients treated, and patient satisfaction ratings.

### 🛡️ Admin & Superadmin Portal
* **System Analytics & Charts**: Visual data representations using Recharts for appointment counts, department distribution, and clinical revenue.
* **Doctor Database Management**: Full CRUD capabilities for doctors, including bulk updates and bulk deletion for elevated Superadmin roles.
* **Department & Service Control**: Manage hospital departments, assign head doctors, and update service details.
* **Audit & Activity Logs**: Track system-wide activities and security notifications.
* **Data Export**: Export clinical reports to Excel (`.xlsx`).

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Site** | React 19, Vite, Tailwind CSS v4, Lucide Icons, React Router DOM v7, React Toastify, Clerk React SDK |
| **Admin Portal** | React 19, Vite, Tailwind CSS v4, Recharts, XLSX, Lucide Icons, Clerk React SDK |
| **Backend API** | Node.js, Express.js, Mongoose (MongoDB Atlas), Cloudinary SDK, Multer, Express Validator |
| **Security & Middleware** | Helmet headers, Rate Limiting (`express-rate-limit`), Mongo Sanitize, CORS, JWT, BcryptJS |

---

## 📁 Repository Structure

```text
MediCare-Site-main/
├── backend/                  # Express.js REST API Server
│   ├── config/               # Database (db.js) & Cloudinary (cloudinary.js) configuration
│   ├── controllers/          # Business logic handlers (doctor, admin, service, appointment)
│   ├── middleware/           # Auth, role authorization, multer upload, rate limiters
│   ├── models/               # Mongoose schemas (Doctor, User, Appointment, Service, etc.)
│   ├── routes/               # Express API routes
│   ├── uploads/              # Local temporary file upload directory
│   ├── .env                  # Backend environment variables
│   ├── server.js             # API Server entry point
│   └── package.json
│
├── frontend/                 # Patient Facing Web Application
│   ├── src/
│   │   ├── assets/           # Dummy styles, branding, and dynamic assets
│   │   ├── components/       # Pages & modular UI (DoctorsPage, HomeDoctors, AppointmentPage)
│   │   ├── doctor/           # Doctor Panel components & EditProfilePage
│   │   ├── pages/            # Page views (DoctorDetail, ServiceDetailPage)
│   │   └── App.jsx           # Main React App routing
│   ├── index.html
│   └── package.json
│
└── admin/                    # Admin & Doctor Management Portal
    ├── src/
    │   ├── components/       # Admin views (AddPage, ListPage, AnalyticsPage, Profile)
    │   ├── context/          # Admin Authentication context
    │   └── App.jsx           # Admin Routing & Layout
    ├── index.html
    └── package.json
```

---

## ⚙️ Environment Setup & Configuration

### Backend Setup (`backend/.env`)

Create a `.env` file inside the `backend/` directory with the following variables:

```env
PORT=4000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/medical
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary Integration (For Image Uploads)
CLOUDINARY_CLOUD_NAME=bz7q2jvr
CLOUDINARY_API_KEY=268685199777982
CLOUDINARY_API_SECRET=_vB12Emacg9H0Ox5-yvjcI6P7a0

# Third-party Services
STRIPE_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:5173
CLERK_SECRET_KEY=sk_test_...
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB Atlas** or local MongoDB instance

---

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-repo/MediCare-Site-main.git
   cd MediCare-Site-main
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Install Admin Dependencies**
   ```bash
   cd ../admin
   npm install
   ```

---

### Running the Application

You can launch each tier in separate terminal windows:

#### Terminal 1: Start Backend Server (Port 4000)
```bash
cd backend
npm run dev
```

#### Terminal 2: Start Patient Web Site (Port 5173)
```bash
cd frontend
npm run dev
```

#### Terminal 3: Start Admin Portal (Port 5174)
```bash
cd admin
npm run dev
```

---

## 🔌 API Endpoints Summary

| HTTP Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/doctors` | Public | Fetch all doctors with search, filtering, and pagination |
| **GET** | `/api/doctors/:id` | Public | Get detailed profile of a specific doctor |
| **POST** | `/api/doctors` | Private (Admin) | Create a new doctor record with image upload |
| **PUT** | `/api/doctors/:id` | Private (Doctor/Admin)| Update doctor details & profile image on Cloudinary |
| **DELETE** | `/api/doctors/:id` | Private (Admin) | Delete a doctor profile and remove Cloudinary asset |
| **GET** | `/api/doctor/dashboard` | Private (Doctor) | Get metrics, earnings, and recent appointments |
| **GET** | `/api/doctor/profile` | Private (Doctor) | Retrieve logged-in doctor profile |
| **PUT** | `/api/doctor/profile` | Private (Doctor) | Update logged-in doctor profile & Cloudinary avatar |
| **GET** | `/api/appointments` | Private | Retrieve patient appointments |
| **POST** | `/api/appointments` | Public/Private | Book a new consultation appointment |
| **GET** | `/api/services` | Public | List medical services & packages |
| **GET** | `/api/departments` | Public | List clinical departments & headcount |
| **GET** | `/api/admin/dashboard` | Private (Admin) | Overall system analytics & stats |
| **POST** | `/api/admin/doctors/bulk-delete` | Private (Superadmin)| Elevated bulk deletion of doctors |

---

## 🔒 Security Practices

- **Sanitization**: Input fields sanitized against SQL/NoSQL Injection using `express-mongo-sanitize`.
- **Header Protection**: Standard security headers configured via `helmet`.
- **Rate Limiting**: API routes rate-limited to 1,000 requests per 15 minutes to prevent abuse.
- **Secure File Storage**: File uploads processed in-memory / temporary disk via `multer`, securely stored on Cloudinary over TLS/HTTPS, and cleaned up locally immediately after upload.

---

## 📄 License

This project is licensed under the **MIT License**.
