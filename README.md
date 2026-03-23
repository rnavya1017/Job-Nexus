# 🚀 CareerConnect — AI-Powered Career Hub

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-Powered-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Adzuna_API-India_First-FF6B35?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Railway-Deploy_Ready-7B2FBE?style=for-the-badge&logo=railway&logoColor=white" />
</p>

> **CareerConnect** is a production-ready, full-stack AI-powered career platform built for Indian students and job seekers. It features real-time job listings, AI-powered fake job detection, ATS resume analysis, a LaTeX resume builder, LinkedIn profile optimization, an interactive quiz system for upskilling courses, secure JWT-based user authentication, and a protected admin dashboard — all wrapped in a bold Neo-Brutalist dark theme.

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 🔍 **AI Job Search** | Live India jobs via Adzuna API (fallback to GB) · Filter by role, location, salary |
| 🤖 **Fake Job Detection** | 8-signal AI heuristic fraud check on every job click — shows trust score + signal breakdown |
| 💼 **LinkedIn Apply** | One-click redirect to LinkedIn Easy Apply for the job |
| 📄 **ATS Resume Screener** | Upload PDF/DOCX/TXT, get keyword match score, gap analysis & recommendations |
| 📝 **LaTeX Resume Builder** | Build a professional resume, export LaTeX, paste into Overleaf → PDF |
| 🔗 **LinkedIn Optimizer** | AI-generated headline, about section, and sample recruiter-ready tips |
| 🎓 **Courses + Interactive Quiz** | 6 domains · Hand-picked YouTube channels · 15–20 MCQ quiz per course |
| 💰 **Rupee Salaries** | All India jobs show salary in ₹ (Lakh/Crore notation) |
| 🔐 **JWT Authentication** | Secure signup/login · Passwords hashed with bcrypt · Protected routes |
| 🛡️ **Admin Dashboard** | Separate admin login · User management (promote, deactivate, delete) · Stats overview |

---

## 🛠️ Tech Stack

### Backend
- **Node.js + Express.js** — REST API server
- **MongoDB + Mongoose** — User accounts & authentication persistence
- **bcryptjs** — Password hashing
- **jsonwebtoken** — JWT token generation & verification
- **Adzuna API** — Real-time job listings (India `in` endpoint, GB fallback)
- **Google Gemini API** — AI-generated resume analysis, LinkedIn content, LaTeX building
- **pdf-parse + mammoth** — PDF and DOCX resume text extraction
- **helmet** — Security headers
- **express-rate-limit** — API rate limiting (200 req / 15 min)
- **multer** — File upload handling (max 5 MB)
- **axios** — HTTP requests to Adzuna

### Frontend
- **Vanilla HTML + CSS + JavaScript** — zero framework overhead
- **Google Fonts** — Inter + Space Grotesk
- **Font Awesome 6** — Icons
- **Neo-Brutalist dark theme** (Cruv-inspired):
  - Pure black base with lime green, deep blue, and vibrant orange accents
  - Sharp corners, high-contrast borders, no soft shadows

---

## 📁 Project Structure

```
Career-connect/
├── server.js                # Express server, all API routes
├── db.js                    # MongoDB connection
├── seedAdmin.js             # Auto-seeds the master admin on startup
├── package.json
├── .env                     # API keys (not committed)
├── .gitignore
├── data/
│   └── courses.json         # Curated courses + 15–20 MCQ quiz questions per domain
├── models/
│   └── User.js              # Mongoose user model (bcrypt, role, toSafeObject)
├── middleware/
│   └── auth.js              # protect() + adminOnly() JWT middleware
├── routes/
│   ├── auth.js              # /signup, /login, /admin-login, /me
│   └── admin.js             # /users, /stats, /users/:id (CRUD)
└── public/
    ├── index.html           # Main single-page application
    ├── style.css            # Cruv Neo-Brutalist dark theme
    ├── app.js               # All frontend logic (SPA router, API calls, UI)
    └── admin.html           # Admin dashboard (protected, separate login)
```

---

## ⚙️ Setup & Run Locally

### 1. Prerequisites
- Node.js v18 or higher
- npm v9 or higher
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- Adzuna API key (free at [developer.adzuna.com](https://developer.adzuna.com/))
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com/))

### 2. Clone & Install
```bash
git clone https://github.com/lokesh-derangula/Career-connect.git
cd Career-connect
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/careerconnect
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_API_KEY=your_adzuna_api_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_secure_random_secret
NODE_ENV=production
```

> 🔑 The master admin account (`admin@career`) is **automatically created** on first server startup.

### 4. Run the Server
```bash
node server.js
```

Visit **http://localhost:3000** in your browser.
Visit **http://localhost:3000/admin.html** for the Admin Dashboard.

---

## 🔒 Authentication & Admin System

### User Login
- Regular users sign up and log in via the main application at `/`.
- Passwords are hashed with **bcryptjs** and stored in MongoDB.
- Sessions are managed with **JWT tokens** stored in `localStorage`.

### Admin Login (Separate & Protected)
- Admins log in exclusively at `/admin.html` via a dedicated `/api/auth/admin-login` endpoint.
- Regular user accounts are **hard-rejected** at the backend — the role check happens server-side, not on the client.
- The admin panel is completely inaccessible to non-admin users.

### Master Admin
| Field | Value |
|---|---|
| **Email** | `admin@career` |
| **Password** | `Admin@careerconnect.` |
| **Privilege** | Can promote/demote users, delete accounts, view all stats |

> ⚠️ Only the master admin (`admin@career`) can grant the `admin` role to other users. Sub-admins cannot mint new admins.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Login (regular user only) |
| `POST` | `/api/auth/admin-login` | Login (admin role required) |
| `GET` | `/api/auth/me` | Get current user profile (JWT required) |

### Admin (JWT + admin role required)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Dashboard stats (total users, admins, recent signups) |
| `GET` | `/api/admin/users` | Paginated user list with search & role filter |
| `GET` | `/api/admin/users/:id` | Get single user details |
| `PUT` | `/api/admin/users/:id` | Update user role or active status |
| `DELETE` | `/api/admin/users/:id` | Permanently delete a user |

### Core Features
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs` | Fetch India jobs (Adzuna `in` endpoint, GB fallback) |
| `POST` | `/api/jobs/verify` | AI fake job detection — returns trust score + signals |
| `POST` | `/api/ats/screen` | ATS resume analysis — accepts PDF, DOCX, TXT or text |
| `POST` | `/api/resume/latex` | Generate LaTeX resume code from form data |
| `POST` | `/api/linkedin/tips` | AI-generate LinkedIn headline + about section + tips |
| `GET` | `/api/courses` | Get curated courses + MCQ quiz questions by domain |

---

## 🤖 AI Fake Job Detection

When a user clicks any job card, the backend runs **8 fraud-detection signals**:

| # | Signal | What it detects |
|---|---|---|
| 1 | 🚨 Suspicious Keywords | "MLM", "pay to work", "guaranteed salary", "wire transfer" etc. |
| 2 | 💰 Salary Sanity | Unrealistically high salary (>₹5 Cr / >£500k) is flagged |
| 3 | 🏢 Company Credibility | 40+ known employers (TCS, Infosys, Google…) get trust boost |
| 4 | 📄 Description Quality | Extremely short/vague description = red flag |
| 5 | 🔗 URL Safety | Shortened URLs (bit.ly, tinyurl) = phishing risk |
| 6 | 📅 Posting Recency | Fresh postings (≤30 days) = more credible; >180 days = warn |
| 7 | 📋 Job Details | Contract type + location specified = credibility boost |
| 8 | 🎭 Title Vagueness | "job opportunity", "earn from home" etc. = red flag |

**Verdicts:** ✅ Appears Legitimate (≥60%) · ⚠️ Suspicious (risk 20–39) · 🚨 Likely Fraudulent (risk ≥40)

---

## 🎓 Courses & Quiz System

6 domains with curated YouTube channels and an **interactive MCQ quiz** (15–20 questions each):

| Domain | Sample Channels |
|---|---|
| Web Development | Traversy Media, Fireship, CodeWithHarry, Academind |
| Java & Spring Boot | Telusko, Amigoscode, Daily Code Buffer, Java Brains |
| Data Science & AI | Sentdex, StatQuest, 3Blue1Brown, Ken Jee |
| DevOps & Cloud | TechWorld with Nana, freeCodeCamp, NetworkChuck |
| DSA & Interview Prep | Abdul Bari, NeetCode, Gaurav Sen, Errichto |
| Mobile Development | The Net Ninja, Academind, Philipp Lackner |

**Quiz rules:**
- Each course has its own quiz window with 15–20 domain-specific MCQs.
- After each answer, instant feedback is shown (correct/incorrect).
- The **next question is locked** until the current question is answered correctly.

---

## 📊 ATS Scoring Algorithm

Evaluates 6 categories:

| Category | Max Points |
|---|---|
| Resume Sections | 20 |
| Technical Skills | 25 |
| JD Keyword Match | 25 |
| Contact Info | 10 |
| Action Verbs | 10 |
| Format & Length | 10 |

**Score bands:** A (≥80) · B (≥65) · C (≥50) · D (<50)

---

## 🚀 Deploy to Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select this repository
4. Add environment variables in Railway dashboard:
   - `MONGODB_URI`, `ADZUNA_APP_ID`, `ADZUNA_API_KEY`, `GEMINI_API_KEY`, `JWT_SECRET`, `NODE_ENV=production`
5. Railway auto-detects Node.js and runs `node server.js`
6. Your app is live! 🎉

---

## 🔒 Security

- **Helmet.js** — Secure HTTP headers (XSS, clickjacking protection)
- **Rate Limiting** — 200 requests per 15 minutes per IP
- **bcryptjs** — Passwords are never stored in plaintext
- **JWT** — Stateless, expiring tokens for session management
- **Role-based access control** — `protect` + `adminOnly` middleware on all admin routes
- **Master Admin lock** — Only `admin@career` can promote users to admin
- **File Validation** — Only PDF, DOCX, TXT accepted; max 5 MB

---

## 📦 Dependencies

```json
{
  "express": "^4.x",
  "mongoose": "^8.x",
  "bcryptjs": "^2.x",
  "jsonwebtoken": "^9.x",
  "cors": "^2.x",
  "helmet": "^7.x",
  "express-rate-limit": "^7.x",
  "axios": "^1.x",
  "multer": "^1.x",
  "pdf-parse": "^1.x",
  "mammoth": "^1.x",
  "dotenv": "^16.x"
}
```

Install with: `npm install`

---

## 🛣️ Roadmap

- [ ] Resume PDF download directly (without Overleaf)
- [ ] Email notifications for saved jobs
- [ ] AI-powered job recommendation engine (based on resume skills)
- [ ] GitHub profile integration & analysis
- [ ] Mobile app (React Native)
- [ ] Company reviews & interview experiences

---

## 👩‍💻 Authors

<table>
  <tr>
    <td align="center">
      <b>Venkata Lokesh Derangula</b><br/>
      <sub>Frontend and Backend</sub><br/>
      <img src="https://img.shields.io/badge/Role-Frontend%20%26%20Backend-6366f1?style=flat-square" />
    </td>
    <td align="center" style="padding-left:32px">
      <b>E Siva Sankara</b><br/>
      <sub>Frontend Developer</sub><br/>
      <img src="https://img.shields.io/badge/Role-Frontend%20Developer-0ea5e9?style=flat-square" />
    </td>
    <td align="center" style="padding-left:32px">
      <b>Nireesha Hemadri</b><br/>
      <sub>Backend Developer</sub><br/>
      <img src="https://img.shields.io/badge/Role-Backend%20Developer-22c55e?style=flat-square" />
    </td>
  </tr>
</table>

> *Built with ❤️ using Node.js, Express, MongoDB, and vanilla JS.*

---

## 📄 License

MIT License — free to use, modify, and distribute.
