# 🏥 MediCare - Advanced Healthcare & Doctor Appointment Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19.0-blue.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Cluster-brightgreen.svg)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-v4.21-lightgrey.svg)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-v7.1-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.1-38B2AC.svg)](https://tailwindcss.com/)

**MediCare** is a modern, full-stack healthcare platform designed to streamline clinical operations, doctor scheduling, patient consultations, and administrative analytics. Built using the MERN stack (MongoDB, Express, React, Node.js) with Vite, Cloudinary, Clerk Authentication, and Tailwind CSS.

---

## 🌐 Live Deployments

| Tier / Component | Live URL | Platform |
| :--- | :--- | :--- |
| 🌐 **Patient Web Application** | [https://heal-book-frontend.vercel.app](https://heal-book-frontend.vercel.app) | Vercel |
| 🛡️ **Admin & Doctor Portal** | [https://heal-book-admin-zeta.vercel.app](https://heal-book-admin-zeta.vercel.app) | Vercel |
| ⚙️ **Backend REST API** | [https://healbook-backend.onrender.com](https://healbook-backend.onrender.com) | Render |

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

# AI Health Assistant - Gemini API
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
# Optional: Gemini model (default: gemini-2.0-flash)
# GEMINI_MODEL=gemini-2.0-flash
# Optional: Gemini request timeout in milliseconds (default: 20000)
# GEMINI_TIMEOUT_MS=20000
```

A `.env.example` file is provided in the `backend/` directory for reference.

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
| **POST** | `/api/ai/symptom-check` | Private (Patient) | AI symptom check and health guidance |
| **GET** | `/api/ai/conversations` | Private (Patient) | List patient AI conversations |
| **GET** | `/api/ai/conversations/latest` | Private (Patient) | Get most recent AI conversation |
| **GET** | `/api/ai/conversations/:id` | Private (Patient) | Get specific AI conversation |
| **POST** | `/api/ai/conversations` | Private (Patient) | Create new AI conversation |

---

## 🔒 Security Practices

- **Sanitization**: Input fields sanitized against SQL/NoSQL Injection using `express-mongo-sanitize`.
- **Header Protection**: Standard security headers configured via `helmet`.
- **Rate Limiting**: API routes rate-limited to 1,000 requests per 15 minutes to prevent abuse.
- **Secure File Storage**: File uploads processed in-memory / temporary disk via `multer`, securely stored on Cloudinary over TLS/HTTPS, and cleaned up locally immediately after upload.

---

## 🤖 AI Health Assistant

The platform includes an AI-powered Health Assistant that provides preliminary health information to patients using Google's Gemini API.

### Features

**Backend (Part 1):**
- **Symptom Analysis**: Patients can describe their symptoms and receive preliminary guidance
- **Conversation Management**: Multi-turn conversations with context retention
- **Emergency Detection**: Deterministic red-flag detection for urgent symptoms
- **Structured Responses**: AI responses are validated and formatted for patient safety
- **Rate Limiting**: Protection against abuse (15 requests/minute per patient)
- **Patient Isolation**: Each patient's conversations are private and secure

**Frontend (Part 2):**
- **Floating Chatbot**: Clean, modern chat interface accessible from any patient page
- **Quick Actions**: Pre-built buttons for common symptoms (Fever, Headache, Cold/Cough, Medicine Question)
- **Real-time Chat**: Live messaging with typing indicators and auto-scroll
- **Emergency Warnings**: Prominent alerts when urgent medical attention is needed
- **Appointment Integration**: Direct link to book appointments when recommended
- **Conversation History**: Automatically loads previous conversations
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Accessibility**: Keyboard navigation, proper labels, and ARIA attributes

### How It Works

1. **Patient clicks the Health Assistant button** (bottom-right corner)
2. **Chat window opens** with a welcome message and quick action buttons
3. **Patient describes symptoms** (or clicks a quick action)
4. **Backend processes the request**:
   - Checks for emergency red flags (chest pain, difficulty breathing, etc.)
   - Sends to Gemini AI for analysis
   - Returns structured response with guidance
5. **Frontend displays the response** with:
   - Follow-up questions if needed
   - Self-care recommendations
   - Warning signs to watch for
   - Appointment booking button if recommended
6. **Emergency detection** shows urgent care warning when needed

### API Endpoints

| HTTP Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/ai/symptom-check` | Private (Patient) | Send a symptom message and receive AI guidance |
| **GET** | `/api/ai/conversations` | Private (Patient) | List all patient conversations |
| **GET** | `/api/ai/conversations/latest` | Private (Patient) | Get the most recent conversation |
| **GET** | `/api/ai/conversations/:id` | Private (Patient) | Get a specific conversation with messages |
| **POST** | `/api/ai/conversations` | Private (Patient) | Create a new conversation |

### Example Usage

**Symptom Check Request:**
```bash
POST /api/ai/symptom-check
Authorization: Bearer <patient_token>
Content-Type: application/json

{
  "message": "I have a headache and fever since yesterday",
  "conversation_id": "optional-uuid-for-existing-conversation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation_id": "uuid",
    "response": "I understand you're experiencing a headache and fever...",
    "severity": "moderate",
    "requires_urgent_attention": false,
    "recommend_appointment": true,
    "has_upcoming_appointment": false,
    "degraded": false,
    "disclaimer": "This is preliminary health information and not a medical diagnosis."
  }
}
```

### Safety Features

1. **Deterministic Red-Flag Detection**: Emergency symptoms (chest pain, difficulty breathing, etc.) are detected before AI processing
2. **No Diagnosis**: The AI never claims certainty or provides definitive diagnoses
3. **No Prescriptions**: The AI never recommends specific medications or dosages
4. **Professional Referral**: Always encourages consultation with healthcare professionals
5. **Fallback Responses**: If Gemini API fails, safe fallback responses are provided
6. **Input Validation**: All inputs are sanitized and validated
7. **Rate Limiting**: Prevents abuse and excessive API calls
8. **Patient Isolation**: Each patient can only access their own conversations

### Configuration

The AI Health Assistant can be configured via environment variables:

**Backend (.env):**
- `GEMINI_API_KEY`: Your Google Gemini API key (required)
- `GEMINI_MODEL`: Gemini model to use (default: `gemini-2.0-flash`)
- `GEMINI_TIMEOUT_MS`: Request timeout in milliseconds (default: `20000`)

**Frontend (.env):**
- `VITE_BACKEND_URL`: Backend API URL (optional, defaults to localhost:4000 or production URL)

### Frontend Components

**HealthAssistant Component** (`frontend/src/components/HealthAssistant/HealthAssistant.jsx`):
- Floating chatbot button (bottom-right)
- Chat window with message history
- Quick action buttons for common symptoms
- Emergency warning display
- Appointment booking integration
- New conversation button
- Loading and error states

**AI API Service** (`frontend/src/services/aiApi.js`):
- `sendSymptomCheck(message, conversationId)`: Send symptom to backend
- `getLatestConversation()`: Load most recent conversation
- `createConversation()`: Start new conversation
- `getConversationById(id)`: Load specific conversation
- `getConversations(limit, skip)`: List all conversations

---

## 📄 License

This project is licensed under the **MIT License**.
