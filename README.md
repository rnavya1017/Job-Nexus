# 🚀 JobNexus — AI-Powered Career Hub

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Adzuna_API-India_First-FF6B35?style=for-the-badge" />
  <img src="https://img.shields.io/badge/LinkedIn-Apply-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" />
  <img src="https://img.shields.io/badge/Railway-Deploy_Ready-7B2FBE?style=for-the-badge&logo=railway&logoColor=white" />
</p>

> **JobNexus** is a production-ready, full-stack AI-powered job portal built for Indian students and job seekers. It offers real-time India job listings, AI-powered fake job detection, ATS resume screening, a LaTeX resume builder, LinkedIn profile optimisation, and curated upskilling courses — all in one premium dark-themed platform.

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 🔍 **AI Job Search** | Live India jobs via Adzuna API (fallback to GB) · Filter by role, location, salary |
| 🤖 **Fake Job Detection** | 8-signal AI heuristic fraud check on every job click — shows trust score + signal breakdown |
| 💼 **LinkedIn Apply** | One-click redirect to LinkedIn Easy Apply for the job |
| 📄 **ATS Resume Screener** | Upload PDF/DOCX, get keyword match score, gap analysis & recommendations |
| 📝 **LaTeX Resume Builder** | Build a professional resume, export LaTeX, paste into Overleaf → PDF |
| 🔗 **LinkedIn Optimizer** | AI-generated headline, about section, and recruiter-ready tips |
| 🎓 **Curated Courses** | 6 domains · Hand-picked YouTube channels · Free forever |
| 💰 **Rupee Salaries** | All India jobs show salary in ₹ (Lakh/Crore notation) |
| ✨ **Premium UI** | Glassmorphism · Aceternity-style animated gradient hero · Mouse-proximity card glow |

---

## 🛠️ Tech Stack

### Backend
- **Node.js + Express.js** — REST API server
- **Adzuna API** — Real-time job listings (India `in` endpoint, GB fallback)
- **pdf-parse + mammoth** — PDF and DOCX resume text extraction
- **helmet** — Security headers
- **express-rate-limit** — API rate limiting (200 req / 15 min)
- **multer** — File upload handling (max 5 MB)
- **axios** — HTTP requests to Adzuna

### Frontend
- **Vanilla HTML + CSS + JavaScript** — zero framework overhead
- **Google Fonts** — Inter + Space Grotesk
- **Font Awesome 6** — Icons
- **Aceternity UI effects** (pure CSS/JS):
  - `BackgroundGradientAnimation` — spinning conic-gradient hero background
  - `GlowingEffect` — mouse-proximity radial border glow on all cards

---

## 📁 Project Structure

```
JobPortal/
├── server.js            # Express server, all API routes
├── package.json
├── .env                 # API keys (not committed)
├── .gitignore
└── public/
    ├── index.html       # Single-page application layout
    ├── style.css        # Premium dark theme + animations
    └── app.js           # All frontend logic (SPA router, API calls, UI)
```

---

## ⚙️ Setup & Run Locally

### 1. Prerequisites
- Node.js v18 or higher
- npm v9 or higher
- Adzuna API key (free at [developer.adzuna.com](https://developer.adzuna.com/))

### 2. Clone & Install
```bash
git clone https://github.com/your-username/jobnexus.git
cd jobnexus
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:

```env
PORT=3000
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_API_KEY=your_adzuna_api_key
NODE_ENV=production
```

> 🔑 Get your free API key at [developer.adzuna.com](https://developer.adzuna.com/)

### 4. Run the Server
```bash
node server.js
```

Visit **http://localhost:3000** in your browser.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs` | Fetch India jobs (Adzuna `in` endpoint, GB fallback) |
| `POST` | `/api/jobs/verify` | AI fake job detection — returns trust score + signals |
| `POST` | `/api/ats/screen` | ATS resume analysis — accepts PDF, DOCX, TXT or text |
| `POST` | `/api/resume/latex` | Generate LaTeX resume code from form data |
| `POST` | `/api/linkedin/tips` | Generate LinkedIn headline + about + tips |
| `GET` | `/api/courses` | Get curated YouTube courses by domain |

### Query Parameters for `/api/jobs`

| Param | Default | Description |
|---|---|---|
| `what` | `software developer` | Job title / keywords |
| `where` | `india` | Location (city or leave blank for all India) |
| `page` | `1` | Page number |
| `results_per_page` | `12` | Results per page |
| `sort_by` | `relevance` | `relevance`, `date`, or `salary` |
| `salary_min` | — | Minimum salary filter |
| `salary_max` | — | Maximum salary filter |

---

## 🤖 AI Fake Job Detection

When a user clicks any job card, the backend runs **8 fraud-detection signals**:

| # | Signal | What it detects |
|---|---|---|
| 1 | 🚨 Suspicious Keywords | "MLM", "pay to work", "guaranteed salary", "wire transfer" etc. |
| 2 | 💰 Salary Sanity | Unrealistically high salary (>₹5 Cr / >£500k) is flagged |
| 3 | 🏢 Company Credibility | 40+ known employers (TCS, Infosys, Google, HSBC, NHS…) get trust boost |
| 4 | 📄 Description Quality | Extremely short/vague description = red flag |
| 5 | 🔗 URL Safety | Shortened URLs (bit.ly, tinyurl) = phishing risk |
| 6 | 📅 Posting Recency | Fresh postings (≤30 days) = more credible; >180 days = warn |
| 7 | 📋 Job Details | Contract type + location specified = credibility boost |
| 8 | 🎭 Title Vagueness | "job opportunity", "earn from home" etc. = red flag |

**Verdicts:**
- ✅ **Appears Legitimate** (trust ≥ 60%)
- ⚠️ **Suspicious — Verify Before Applying** (risk score 20–39)
- 🚨 **Likely Fraudulent** (risk score ≥ 40)
- ℹ️ **Unverified — Proceed with Caution** (else)

---

## 💰 Salary Display (India)

Salaries from the India Adzuna endpoint are shown in **₹ Indian Rupee** format:

| Raw Value | Displayed As |
|---|---|
| ₹5,00,000 | `₹5.0 L / yr` |
| ₹12,00,000 | `₹12.0 L / yr` |
| ₹1,00,00,000 | `₹1.0 Cr / yr` |
| ₹50,000 | `₹50K / yr` |

> If the India endpoint returns no results, the system falls back to UK (GB) listings and displays salaries in **£ GBP** with a `🇬🇧 UK listings (India fallback)` badge.

---

## 📊 ATS Scoring Algorithm

The ATS scorer evaluates 6 categories:

| Category | Max Points | How it's Scored |
|---|---|---|
| Resume Sections | 20 | education, experience, skills, projects, certifications |
| Technical Skills | 25 | Matches against 40+ tech keywords |
| JD Keyword Match | 25 | Keywords from the pasted job description |
| Contact Info | 10 | Email, phone, LinkedIn, GitHub |
| Action Verbs | 10 | developed, built, led, optimised… |
| Format & Length | 10 | 150–900 words, measurable achievements |

**Score bands:** A (≥80) · B (≥65) · C (≥50) · D (<50)

---

## 🎓 Courses (6 Domains)

| Domain | Sample Channels |
|---|---|
| Web Development | Traversy Media, Fireship, CodeWithHarry, Academind |
| Java & Spring Boot | Telusko, Amigoscode, Daily Code Buffer, Java Brains |
| Data Science & AI | Sentdex, StatQuest, 3Blue1Brown, Ken Jee |
| DevOps & Cloud | TechWorld with Nana, freeCodeCamp, NetworkChuck |
| DSA & Interview Prep | Abdul Bari, NeetCode, Gaurav Sen, Errichto |
| Mobile Development | The Net Ninja, Academind, Philipp Lackner |

---

## 🚀 Deploy to Railway

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select your repository
4. Add environment variables in Railway dashboard:
   - `ADZUNA_APP_ID`
   - `ADZUNA_API_KEY`
   - `NODE_ENV=production`
5. Railway auto-detects Node.js and runs `node server.js`
6. Your app is live on a `*.railway.app` URL! 🎉

---

## 🔒 Security

- **Helmet.js** — Sets secure HTTP headers (XSS, clickjacking protection)
- **Rate Limiting** — 200 requests per 15 minutes per IP
- **CORS** — Enabled for all origins (configure as needed for production)
- **File Validation** — Only PDF, DOCX, TXT accepted; max 5 MB
- **No Credentials Stored** — Auth is localStorage-only (demo mode)

---

## 📦 Dependencies

```json
{
  "express": "^4.x",
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

## 🛣️ Roadmap / Future Enhancements

- [ ] Real backend authentication (JWT + PostgreSQL/MongoDB)
- [ ] Email notifications for saved jobs
- [ ] AI-powered job recommendation engine (based on resume skills)
- [ ] GitHub profile integration & analysis
- [ ] Mobile app (React Native)
- [ ] Resume PDF download directly (without Overleaf)
- [ ] Company reviews & interview experiences

---

## 👩‍💻 Author

**R Navya** — Built with ❤️ using Node.js, Express, and vanilla JS.

> *"The best time to plant a tree was 20 years ago. The second best time is now."*

---

## 📄 License

MIT License — free to use, modify, and distribute.
