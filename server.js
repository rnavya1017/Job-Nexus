require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const multer = require('multer');
// Use the internal lib path to avoid pdf-parse running a test file on import (crashes on Railway)
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const mammoth = require('mammoth');

// ─── Database & Auth ──────────────────────────────────────────────────────────
const connectDB = require('./db');
const seedAdmin = require('./seedAdmin');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Crash Guard (helps Railway show error in logs instead of silent 502) ──────
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err.message, err.stack);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    process.exit(1);
});

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false // allow inline scripts for the frontend
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Multer Setup for File Uploads ───────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only PDF, DOCX, or TXT files are allowed'));
    }
});

// ─── Adzuna Config ────────────────────────────────────────────────────────────
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '8cc838d8';
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY || 'e3635d9160d3b2958987367dff8b6aca';

// ─── API: Fetch Jobs (India-first, GB fallback) ───────────────────────────────
app.get('/api/jobs', async (req, res) => {
    try {
        const {
            what = 'software developer',
            where = 'india',
            page = 1,
            results_per_page = 12,
            salary_min,
            salary_max,
            sort_by = 'relevance'
        } = req.query;

        // Helper: fetch from a given Adzuna country endpoint
        const fetchFromAdzuna = async (country, locationOverride) => {
            const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${parseInt(page)}`;
            const params = {
                app_id: ADZUNA_APP_ID,
                app_key: ADZUNA_API_KEY,
                results_per_page: parseInt(results_per_page),
                what,
                sort_by,
            };
            // Only pass 'where' when it has meaningful content
            if (locationOverride) params.where = locationOverride;
            if (salary_min) params.salary_min = salary_min;
            if (salary_max) params.salary_max = salary_max;
            const r = await axios.get(url, { params, timeout: 12000 });
            return r.data;
        };

        // ── Try India endpoint first ──────────────────────────
        let data = null;
        let usedCountry = 'in';
        try {
            data = await fetchFromAdzuna('in', '');  // 'in' = India
            // If India returns 0 results, fall back to GB with location filter
            if (!data.results || data.results.length === 0) {
                data = await fetchFromAdzuna('gb', where === 'india' ? '' : where);
                usedCountry = 'gb';
            }
        } catch (_indiaErr) {
            // India endpoint failed — fall back to GB
            data = await fetchFromAdzuna('gb', where === 'india' ? '' : where);
            usedCountry = 'gb';
        }

        const jobs = data.results || [];
        const total = data.count || 0;

        const formatted = jobs.map(job => ({
            id: job.id,
            title: job.title,
            company: job.company?.display_name || 'Confidential',
            location: job.location?.display_name || where,
            description: (job.description || '').substring(0, 300) + '...',
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            currency: usedCountry === 'in' ? 'INR' : 'GBP',
            created: job.created,
            redirect_url: job.redirect_url,
            category: job.category?.label || 'IT Jobs',
            contract_type: job.contract_type || 'Full Time',
            logo: `https://ui-avatars.com/api/?name=${encodeURIComponent((job.company?.display_name || 'J').charAt(0))}&background=1e3a5f&color=60a5fa&size=64&bold=true`
        }));

        return res.json({ jobs: formatted, total, page: parseInt(page), country: usedCountry });
    } catch (err) {
        console.error('Job fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch jobs', message: err.message });
    }

});

// ─── API: AI Fake Job Detection ───────────────────────────────────────────────
app.post('/api/jobs/verify', (req, res) => {
    try {
        const job = req.body;
        const result = detectFakeJob(job);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function detectFakeJob(job) {
    const {
        title = '', company = '', description = '',
        salary_min, salary_max, location = '',
        redirect_url = '', category = '', created = '',
        contract_type = ''
    } = job;

    const signals = [];
    let riskScore = 0;        // higher = more suspicious
    let credScore = 0;       // higher = more legit

    const titleL = title.toLowerCase();
    const companyL = company.toLowerCase();
    const descL = description.toLowerCase();
    const fullText = `${titleL} ${companyL} ${descL}`;

    // ── Signal 1: Suspicious keywords in title / description ────
    const suspiciousKw = [
        'work from home earn', 'make money fast', 'no experience needed',
        'earn $', 'earn £', 'unlimited income', 'be your own boss',
        'mlm', 'multi-level', 'pyramid', 'passive income', 'investment opportunity',
        'wire transfer', 'western union', 'click here to earn',
        'guaranteed salary', '100% commission', 'no interview', 'immediate hiring',
        'processing fee', 'registration fee', 'send money', 'pay to work'
    ];
    const foundSuspicious = suspiciousKw.filter(kw => fullText.includes(kw));
    if (foundSuspicious.length > 0) {
        riskScore += foundSuspicious.length * 15;
        signals.push({ type: 'danger', icon: '🚨', text: `Suspicious keywords detected: "${foundSuspicious.slice(0, 3).join('", "')}"` });
    }

    // ── Signal 2: Salary sanity check ───────────────────────────
    if (salary_min && salary_max) {
        if (salary_max > 500000) {   // > £500k/yr — unrealistic for most roles
            riskScore += 20;
            signals.push({ type: 'danger', icon: '💰', text: 'Salary appears unrealistically high — possible lure listing' });
        } else if (salary_min > 0 && salary_max > 0) {
            credScore += 15;
            signals.push({ type: 'safe', icon: '✅', text: 'Salary range is clearly stated and within normal bounds' });
        }
    } else if (!salary_min && !salary_max) {
        riskScore += 5;
        signals.push({ type: 'warn', icon: '⚠️', text: 'No salary information provided' });
    }

    // ── Signal 3: Company credibility ───────────────────────────
    const knownLegit = [
        'tata', 'infosys', 'wipro', 'hcl', 'accenture', 'ibm', 'microsoft',
        'google', 'amazon', 'meta', 'apple', 'oracle', 'sap', 'capgemini',
        'cognizant', 'tech mahindra', 'l&t', 'deloitte', 'pwc', 'kpmg',
        'jpmorgan', 'goldman', 'morgan stanley', 'barclays', 'lloyds', 'hsbc',
        'nhs', 'bt group', 'vodafone', 'shell', 'bp', 'unilever', 'rolls-royce',
        'bae systems', 'astrazeneca', 'gsk', 'johnson', 'siemens', 'bosch',
        'syncarp', 'tcsion', 'mphasis', 'hexaware', 'persistent', 'mindtree'
    ];
    const isKnown = knownLegit.some(name => companyL.includes(name));

    if (company === 'Confidential' || company === '' || companyL === 'unknown') {
        riskScore += 15;
        signals.push({ type: 'warn', icon: '🏢', text: 'Company name is hidden or unknown — verify before applying' });
    } else if (isKnown) {
        credScore += 20;
        signals.push({ type: 'safe', icon: '✅', text: `${company} is a recognised, established employer` });
    } else {
        credScore += 5;
        signals.push({ type: 'info', icon: 'ℹ️', text: 'Company is not in top-tier list — research independently before applying' });
    }

    // ── Signal 4: Description quality ───────────────────────────
    const wordCount = description.trim().split(/\s+/).length;
    if (wordCount < 20) {
        riskScore += 15;
        signals.push({ type: 'danger', icon: '📄', text: 'Job description is extremely vague — legitimate postings usually have detailed requirements' });
    } else if (wordCount > 60) {
        credScore += 10;
        signals.push({ type: 'safe', icon: '✅', text: 'Detailed job description provided — good sign' });
    }

    // ── Signal 5: Redirect URL domain check ─────────────────────
    const suspDomains = ['bit.ly', 'tinyurl', 'shorturl', 'goo.gl', 't.co', 'ow.ly', 'rb.gy'];
    const urlHasSuspDomain = suspDomains.some(d => redirect_url.includes(d));
    if (urlHasSuspDomain) {
        riskScore += 20;
        signals.push({ type: 'danger', icon: '🔗', text: 'Shortened/suspicious redirect URL detected — could be phishing' });
    } else if (redirect_url.startsWith('https://')) {
        credScore += 10;
        signals.push({ type: 'safe', icon: '🔒', text: 'Secure HTTPS redirect link' });
    } else if (redirect_url.includes('adzuna')) {
        credScore += 15;
        signals.push({ type: 'safe', icon: '✅', text: 'Verified through Adzuna job board' });
    }

    // ── Signal 6: Job was recently posted & has category ────────
    if (created) {
        const daysSince = Math.floor((Date.now() - new Date(created).getTime()) / 86400000);
        if (daysSince <= 30) {
            credScore += 5;
            signals.push({ type: 'safe', icon: '📅', text: `Recently posted (${daysSince} days ago) — still actively hiring` });
        } else if (daysSince > 180) {
            riskScore += 5;
            signals.push({ type: 'warn', icon: '⏰', text: `Old listing (${daysSince} days ago) — may no longer be available` });
        }
    }

    // ── Signal 7: Contract type & location ─────────────────────
    if (contract_type && contract_type !== 'Unknown') {
        credScore += 5;
        signals.push({ type: 'safe', icon: '📋', text: `Contract type specified: ${contract_type}` });
    }
    if (location && location.length > 2) {
        credScore += 5;
        signals.push({ type: 'safe', icon: '📍', text: `Location specified: ${location}` });
    }

    // ── Signal 8: Vague title patterns ──────────────────────────
    const vagueTitles = ['job opportunity', 'work online', 'earn from home', 'agent wanted', 'reseller'];
    if (vagueTitles.some(v => titleL.includes(v))) {
        riskScore += 15;
        signals.push({ type: 'danger', icon: '🎭', text: 'Vague job title is a common red flag for fraudulent listings' });
    }

    // ── Verdict ─────────────────────────────────────────────────
    const totalSignals = riskScore + credScore || 1;
    const trustPct = Math.max(0, Math.min(100, Math.round((credScore / totalSignals) * 100)));

    let verdict, verdictColor, verdictIcon;
    if (riskScore >= 40) {
        verdict = 'Likely Fraudulent';
        verdictColor = '#ef4444';
        verdictIcon = '🚨';
    } else if (riskScore >= 20) {
        verdict = 'Suspicious — Verify Before Applying';
        verdictColor = '#f59e0b';
        verdictIcon = '⚠️';
    } else if (trustPct >= 60) {
        verdict = 'Appears Legitimate';
        verdictColor = '#22c55e';
        verdictIcon = '✅';
    } else {
        verdict = 'Unverified — Proceed with Caution';
        verdictColor = '#60a5fa';
        verdictIcon = 'ℹ️';
    }

    // ── LinkedIn job search URL ──────────────────────────────────
    const liQuery = encodeURIComponent(`${title} ${company}`.trim());
    const liUrl = `https://www.linkedin.com/jobs/search/?keywords=${liQuery}&f_TPR=r2592000`;

    return {
        verdict, verdictColor, verdictIcon, trustPct,
        riskScore, credScore, signals,
        linkedinUrl: liUrl,
        adzunaUrl: redirect_url
    };
}


// ─── API: ATS Resume Screening ────────────────────────────────────────────────
app.post('/api/ats/screen', upload.single('resume'), async (req, res) => {
    try {
        let resumeText = '';
        const jobDescription = req.body.jobDescription || '';

        if (req.file) {
            // Extract text from file
            if (req.file.mimetype === 'application/pdf') {
                const data = await pdfParse(req.file.buffer);
                resumeText = data.text;
            } else if (req.file.mimetype.includes('wordprocessingml')) {
                const result = await mammoth.extractRawText({ buffer: req.file.buffer });
                resumeText = result.value;
            } else {
                resumeText = req.file.buffer.toString('utf-8');
            }
        } else if (req.body.resumeText) {
            resumeText = req.body.resumeText;
        } else {
            return res.status(400).json({ error: 'No resume provided' });
        }

        // Run ATS analysis
        const analysis = analyzeResume(resumeText, jobDescription);
        res.json(analysis);
    } catch (err) {
        console.error('ATS error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── ATS Analysis Logic ───────────────────────────────────────────────────────
function analyzeResume(resumeText, jobDescription) {
    const text = resumeText.toLowerCase();
    const words = text.split(/\s+/);
    const wordCount = words.length;

    // ── 1. Keyword extraction & matching ────
    const techKeywords = [
        'java', 'python', 'javascript', 'typescript', 'react', 'angular', 'vue',
        'node', 'spring', 'spring boot', 'microservices', 'docker', 'kubernetes',
        'aws', 'azure', 'gcp', 'sql', 'mysql', 'postgresql', 'mongodb', 'redis',
        'rest', 'api', 'graphql', 'git', 'ci/cd', 'jenkins', 'html', 'css',
        'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas',
        'numpy', 'data science', 'agile', 'scrum', 'devops', 'linux', 'bash',
        'c++', 'c#', '.net', 'php', 'ruby', 'swift', 'kotlin', 'flutter'
    ];

    const softSkills = [
        'communication', 'leadership', 'teamwork', 'problem solving', 'analytical',
        'collaboration', 'management', 'initiative', 'adaptable', 'creative'
    ];

    const sections = ['education', 'experience', 'skills', 'projects', 'certifications',
        'achievements', 'summary', 'objective', 'profile', 'work history'];

    const actionVerbs = ['developed', 'built', 'designed', 'implemented', 'managed',
        'led', 'created', 'optimized', 'improved', 'delivered', 'launched', 'architected',
        'engineered', 'collaborated', 'analyzed', 'reduced', 'increased', 'achieved'];

    // Extract job description keywords
    let jdKeywords = [];
    let matchedJdKeywords = [];
    let missingJdKeywords = [];

    if (jobDescription) {
        const jdText = jobDescription.toLowerCase();
        jdKeywords = [...techKeywords, ...softSkills].filter(kw => jdText.includes(kw));
        matchedJdKeywords = jdKeywords.filter(kw => text.includes(kw));
        missingJdKeywords = jdKeywords.filter(kw => !text.includes(kw));
    }

    // Detect skills in resume
    const foundTechSkills = techKeywords.filter(kw => text.includes(kw));
    const foundSoftSkills = softSkills.filter(kw => text.includes(kw));
    const foundSections = sections.filter(s => text.includes(s));
    const foundActionVerbs = actionVerbs.filter(v => text.includes(v));

    // ── 2. Experience detection ──────────────
    const expPatterns = [
        /(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/gi,
        /experience\s*:?\s*(\d+)\+?\s*years?/gi
    ];
    let experienceYears = 0;
    const allExpMatches = [];
    expPatterns.forEach(p => {
        let m;
        while ((m = p.exec(text)) !== null) {
            allExpMatches.push(parseInt(m[1]));
        }
    });
    if (allExpMatches.length > 0) {
        experienceYears = Math.max(...allExpMatches);
    }

    // ── 3. Format analysis ───────────────────
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
    const hasPhone = /(\+?\d[\d\s\-().]{7,15}\d)/.test(resumeText);
    const hasLinkedIn = /linkedin\.com\/in\//i.test(resumeText);
    const hasGitHub = /github\.com\//i.test(resumeText);
    const tooShort = wordCount < 150;
    const tooLong = wordCount > 900;
    const hasGraphicsWarning = false; // can't detect from text
    const hasMeasurements = /\d+%|\$\d+|\d+x|increased|reduced|improved/.test(text);

    // ── 4. Score calculation ─────────────────
    let score = 0;
    const MAX = 100;
    const breakdown = {};

    // Section presence (20 pts)
    const sectionScore = Math.min(20, (foundSections.length / 5) * 20);
    breakdown.sections = { score: Math.round(sectionScore), max: 20, label: 'Resume Sections' };
    score += sectionScore;

    // Technical skills (25 pts)
    const techScore = Math.min(25, (foundTechSkills.length / 10) * 25);
    breakdown.techSkills = { score: Math.round(techScore), max: 25, label: 'Technical Skills' };
    score += techScore;

    // JD / keyword match (25 pts — if job description provided)
    if (jobDescription && jdKeywords.length > 0) {
        const jdScore = (matchedJdKeywords.length / jdKeywords.length) * 25;
        breakdown.jdMatch = { score: Math.round(jdScore), max: 25, label: 'JD Keyword Match' };
        score += jdScore;
    } else {
        // No JD — give benefit of the doubt
        score += 12;
        breakdown.jdMatch = { score: 12, max: 25, label: 'JD Keyword Match (no JD)' };
    }

    // Contact info (10 pts)
    let contactScore = 0;
    if (hasEmail) contactScore += 5;
    if (hasPhone) contactScore += 3;
    if (hasLinkedIn) contactScore += 1;
    if (hasGitHub) contactScore += 1;
    breakdown.contact = { score: contactScore, max: 10, label: 'Contact Information' };
    score += contactScore;

    // Action verbs (10 pts)
    const verbScore = Math.min(10, (foundActionVerbs.length / 5) * 10);
    breakdown.actionVerbs = { score: Math.round(verbScore), max: 10, label: 'Action Verbs' };
    score += verbScore;

    // Format / length (10 pts)
    let formatScore = 10;
    if (tooShort) formatScore -= 4;
    if (tooLong) formatScore -= 4;
    if (!hasMeasurements) formatScore -= 2;
    breakdown.format = { score: Math.max(0, formatScore), max: 10, label: 'Format & Length' };
    score += Math.max(0, formatScore);

    const finalScore = Math.min(100, Math.round(score));

    // ── 5. Recommendations ──────────────────
    const recommendations = [];
    if (!hasEmail) recommendations.push({ type: 'critical', text: 'Add a professional email address' });
    if (!hasPhone) recommendations.push({ type: 'critical', text: 'Add a phone number' });
    if (!hasLinkedIn) recommendations.push({ type: 'important', text: 'Add your LinkedIn profile URL (linkedin.com/in/yourname)' });
    if (!hasGitHub) recommendations.push({ type: 'important', text: 'Add your GitHub profile URL to showcase your code' });
    if (tooShort) recommendations.push({ type: 'critical', text: 'Resume is too short — add more details (aim for 300-600 words)' });
    if (tooLong) recommendations.push({ type: 'warning', text: 'Resume may be too long — keep it to 1-2 pages ideally' });
    if (!hasMeasurements) recommendations.push({ type: 'important', text: 'Add measurable achievements (e.g., "Increased performance by 40%")' });
    if (foundActionVerbs.length < 3) recommendations.push({ type: 'important', text: 'Use more action verbs: Developed, Built, Architected, Led, Optimized' });
    if (foundSections.indexOf('certifications') === -1) recommendations.push({ type: 'tip', text: 'Add a Certifications section (AWS, Google, Oracle certs are valuable)' });
    if (missingJdKeywords.length > 0) {
        missingJdKeywords.slice(0, 5).forEach(kw =>
            recommendations.push({ type: 'warning', text: `Add skill: ${kw} (required in job description)` })
        );
    }
    if (foundTechSkills.length < 5) recommendations.push({ type: 'important', text: 'Add more technical skills relevant to the job you are targeting' });

    return {
        score: finalScore,
        grade: finalScore >= 80 ? 'A' : finalScore >= 65 ? 'B' : finalScore >= 50 ? 'C' : 'D',
        status: finalScore >= 75 ? 'ATS Friendly' : finalScore >= 50 ? 'Needs Improvement' : 'Not ATS Friendly',
        wordCount,
        experienceYears,
        breakdown,
        matchedSkills: foundTechSkills.slice(0, 20),
        missingSkills: missingJdKeywords.slice(0, 10),
        softSkills: foundSoftSkills,
        foundSections,
        missingSections: sections.filter(s => !foundSections.includes(s)),
        hasEmail, hasPhone, hasLinkedIn, hasGitHub,
        hasMeasurements,
        matchedJdKeywords,
        missingJdKeywords,
        recommendations,
        actionVerbs: foundActionVerbs
    };
}

// ─── API: Generate LaTeX Resume ───────────────────────────────────────────────
app.post('/api/resume/latex', (req, res) => {
    try {
        const data = req.body;
        const latex = generateLatex(data);
        res.json({ latex });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function generateLatex(d) {
    const skills = (d.skills || '').split(',').map(s => s.trim()).filter(Boolean);
    const skillStr = skills.join(' \\textbullet\\ ');

    const experiences = d.experiences || [];
    const education = d.education || [];
    const projects = d.projects || [];
    const certifications = d.certifications || [];

    const expLatex = experiences.map(e => `
\\resumeSubheading
  {${e.company || ''}}{${e.duration || ''}}
  {${e.role || ''}}{${e.location || ''}}
  \\resumeItemListStart
    ${(e.points || '').split('\n').filter(Boolean).map(p => `\\resumeItem{${p.trim()}}`).join('\n    ')}
  \\resumeItemListEnd`).join('\n');

    const eduLatex = education.map(e => `
\\resumeSubheading
  {${e.institution || ''}}{${e.year || ''}}
  {${e.degree || ''}}{${e.gpa ? 'GPA: ' + e.gpa : ''}}`).join('\n');

    const projLatex = projects.map(p => `
\\resumeProjectHeading
  {\\textbf{${p.name || ''}} $|$ \\emph{${p.tech || ''}}}{${p.year || ''}}
  \\resumeItemListStart
    ${(p.points || '').split('\n').filter(Boolean).map(pt => `\\resumeItem{${pt.trim()}}`).join('\n    ')}
  \\resumeItemListEnd`).join('\n');

    const certLatex = certifications.map(c =>
        `\\resumeItem{${c.name || ''} — ${c.issuer || ''} (${c.year || ''})}`
    ).join('\n');

    return `%------------------------
% CareerConnect Resume Template
% Generated on ${new Date().toLocaleDateString()}
%------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
\\begin{document}

%---------- HEADING ----------
\\begin{center}
  \\textbf{\\Huge \\scshape ${d.name || 'Your Name'}} \\\\ \\vspace{1pt}
  \\small
  \\faPhone\\ ${d.phone || '+91-XXXXXXXXXX'} $|$
  \\href{mailto:${d.email || 'email@example.com'}}{\\faEnvelope\\ \\underline{${d.email || 'email@example.com'}}} $|$
  ${d.linkedin ? `\\href{${d.linkedin}}{\\faLinkedin\\ \\underline{LinkedIn}} $|$` : ''}
  ${d.github ? `\\href{${d.github}}{\\faGithub\\ \\underline{GitHub}} $|$` : ''}
  ${d.portfolio ? `\\href{${d.portfolio}}{\\faGlobe\\ \\underline{Portfolio}}` : ''}
\\end{center}

${d.summary ? `%---------- SUMMARY ----------
\\section{Professional Summary}
\\small{${d.summary}}
\\vspace{2pt}` : ''}

%---------- EDUCATION ----------
\\section{Education}
  \\resumeSubHeadingListStart
    ${eduLatex}
  \\resumeSubHeadingListEnd

%---------- EXPERIENCE ----------
${experiences.length > 0 ? `\\section{Work Experience}
  \\resumeSubHeadingListStart
    ${expLatex}
  \\resumeSubHeadingListEnd` : ''}

%---------- PROJECTS ----------
${projects.length > 0 ? `\\section{Projects}
    \\resumeSubHeadingListStart
      ${projLatex}
    \\resumeSubHeadingListEnd` : ''}

%---------- SKILLS ----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Skills}{: ${skillStr}} \\\\
     ${d.languages ? `\\textbf{Languages}{: ${d.languages}} \\\\` : ''}
     ${d.tools ? `\\textbf{Tools}{: ${d.tools}}` : ''}
    }}
 \\end{itemize}

%---------- CERTIFICATIONS ----------
${certifications.length > 0 ? `\\section{Certifications}
  \\resumeSubHeadingListStart
    \\resumeItemListStart
      ${certLatex}
    \\resumeItemListEnd
  \\resumeSubHeadingListEnd` : ''}

%-------------------------------------------
\\end{document}`;
}

// ─── API: LinkedIn Profile Guide ──────────────────────────────────────────────
app.post('/api/linkedin/tips', (req, res) => {
    const { role, skills, experience } = req.body;
    const tips = generateLinkedInTips(role, skills, experience);
    res.json(tips);
});

function generateLinkedInTips(role = 'Software Developer', skills = [], experience = 0) {
    const skillList = Array.isArray(skills) ? skills.join(', ') : (skills || 'JavaScript, Python, Java');
    return {
        headline: `${role} | ${skillList.split(',').slice(0, 3).join(' | ')} | Open to Opportunities`,
        about: `Results-driven ${role} with ${experience || '2'}+ years of experience building scalable applications. Passionate about clean code, problem-solving, and continuous learning. Skilled in ${skillList}. Currently seeking exciting opportunities to drive innovation and deliver impactful solutions.`,
        tips: [
            { icon: '📸', title: 'Profile Photo', desc: 'Use a professional headshot with a plain background. You are 14x more likely to be viewed with a photo.' },
            { icon: '🎯', title: 'Headline Optimization', desc: 'Your headline is prime real estate. Include your role, key skills, and a differentiator like "Open to Work" or "4x Hackathon Winner".' },
            { icon: '🔑', title: 'Keywords Are King', desc: 'Recruiters search using keywords. Sprinkle your target job keywords throughout your profile — headline, about, and experience.' },
            { icon: '💼', title: 'Experience Section', desc: 'Use bullet points with action verbs and measurable achievements. "Reduced API latency by 40%" beats "Worked on APIs".' },
            { icon: '🎓', title: 'Featured Section', desc: 'Pin your GitHub, portfolio, or a project demo. This is the first thing recruiters see after your headline.' },
            { icon: '🤝', title: 'Grow Your Network', desc: 'Connect with 50+ people in your target domain. Send personalized connection requests to recruiters and hiring managers.' },
            { icon: '📝', title: 'Post Consistently', desc: 'Post 3x per week — share learnings, project updates, industry news. Active profiles get 8x more profile views.' },
            { icon: '⭐', title: 'Skills & Endorsements', desc: `Add at least 10 skills: ${skillList}. Ask colleagues to endorse you — endorsed skills show up in recruiter searches.` },
            { icon: '🏆', title: 'Recommendations', desc: 'Get 3+ recommendations from managers or collaborators. They are powerful social proof for recruiters.' },
            { icon: '🔔', title: 'Open to Work', desc: 'Turn on "Open to Work" privately (visible only to recruiters). This adds you to recruiter search filters.' },
        ],
        bannerTips: 'Use a banner image that reflects your professional brand — include your name, role, and tech stack icons. Tools: Canva, Adobe Express.',
        sampleHeadlines: [
            `Full Stack Developer | React • Spring Boot • AWS | Building Scalable Web Apps`,
            `Software Engineer @ ${role} | ${skillList.split(',').slice(0, 2).join(' & ')} | 🚀 Open to Opportunities`,
            `${role} | ${experience}+ YOE | Microservices • Cloud • DevOps | Tech Enthusiast`
        ]
    };
}

// ─── API: Courses ─────────────────────────────────────────────────────────────
app.get('/api/courses', (req, res) => {
    const { domain } = req.query;
    const all = getCoursesData();
    if (domain && all[domain]) {
        return res.json({ domain, courses: all[domain] });
    }
    res.json({ domains: Object.keys(all), courses: all });
});

function getCoursesData() {
    try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, 'data', 'courses.json');
        const fileData = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(fileData);
    } catch (error) {
        console.error('Error reading courses.json:', error);
        return {};
    }
}

// ─── Auth & Admin API Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ─── Admin Panel Page ─────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ─── Catch-all: serve index.html ──────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start Server (with DB connection) ────────────────────────────────────────
const startServer = async () => {
    await connectDB();
    await seedAdmin();

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ CareerConnect running on http://localhost:${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔐 Admin panel: http://localhost:${PORT}/admin`);
    });
};
startServer();

module.exports = app;
