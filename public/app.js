/* ══════════════════════════════════════════
   JobNexus — Main Application JavaScript
   Full-stack frontend logic
══════════════════════════════════════════ */

// ── State ─────────────────────────────────
const state = {
    user: null,
    currentPage: 'home',
    jobs: [],
    jobPage: 1,
    jobTotal: 0,
    jobRedirectUrl: null,
    currentLatex: '',
    coursesData: null,
    activeDomain: null
};

// ── API Base ──────────────────────────────
const API = '';  // same origin

// ═══════════════════════════════════════════
//   INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initParticles();
    initCounters();
    initNavbar();
    initGlowingEffect();
    loadUser();
    loadCourses();
    handleHashNav();
    window.addEventListener('hashchange', handleHashNav);
});

function handleHashNav() {
    const hash = window.location.hash.replace('#', '');
    const pages = ['home', 'jobs', 'ats', 'resume', 'linkedin', 'courses'];
    if (pages.includes(hash)) navigate(hash);
}

// ═══════════════════════════════════════════
//   PRELOADER
// ═══════════════════════════════════════════
function initPreloader() {
    setTimeout(() => {
        const el = document.getElementById('preloader');
        if (el) { el.classList.add('fade-out'); setTimeout(() => el.remove(), 600); }
    }, 2200);
}

// ═══════════════════════════════════════════
//   NAVBAR
// ═══════════════════════════════════════════
function initNavbar() {
    window.addEventListener('scroll', () => {
        const nb = document.getElementById('navbar');
        if (nb) nb.classList.toggle('scrolled', window.scrollY > 30);
    });
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('hidden');
}

// ═══════════════════════════════════════════
//   NAVIGATION
// ═══════════════════════════════════════════
function navigate(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
    });
    // Show target
    const target = document.getElementById(`page-${page}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[onclick*="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    state.currentPage = page;
    window.location.hash = page;

    // Lazy load
    if (page === 'jobs' && state.jobs.length === 0) fetchJobs(1);
    if (page === 'courses' && !state.coursesData) loadCourses();
}

// ═══════════════════════════════════════════
//   AUTH
// ═══════════════════════════════════════════
function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
}
function switchAuthTab(tab) {
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
    document.getElementById('loginTab').classList.toggle('active', tab === 'login');
    document.getElementById('signupTab').classList.toggle('active', tab === 'signup');
}
// Close modal on overlay click
document.getElementById('authModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeAuthModal();
});

function handleLogin() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const pass = document.getElementById('loginPassword')?.value;
    if (!email || !pass) return showToast('Please fill in all fields', 'error');
    // Simulate login (localStorage)
    const users = JSON.parse(localStorage.getItem('jn_users') || '[]');
    const found = users.find(u => u.email === email && u.password === pass);
    if (!found) return showToast('Invalid credentials. Please sign up first.', 'error');
    state.user = found;
    localStorage.setItem('jn_user', JSON.stringify(found));
    updateNavForUser();
    closeAuthModal();
    showToast(`Welcome back, ${found.firstName}! 👋`, 'success');
}

function handleSignup() {
    const firstName = document.getElementById('signupFirst')?.value?.trim();
    const lastName = document.getElementById('signupLast')?.value?.trim();
    const email = document.getElementById('signupEmail')?.value?.trim();
    const password = document.getElementById('signupPassword')?.value;
    const role = document.getElementById('signupRole')?.value?.trim();
    if (!firstName || !email || !password) return showToast('Please fill required fields', 'error');
    if (password.length < 8) return showToast('Password must be at least 8 characters', 'error');
    const users = JSON.parse(localStorage.getItem('jn_users') || '[]');
    if (users.find(u => u.email === email)) return showToast('Email already registered. Please sign in.', 'error');
    const newUser = { firstName, lastName, email, password, role, joined: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem('jn_users', JSON.stringify(users));
    state.user = newUser;
    localStorage.setItem('jn_user', JSON.stringify(newUser));
    updateNavForUser();
    closeAuthModal();
    showToast(`Welcome to JobNexus, ${firstName}! 🚀`, 'success');
    navigate('resume');
}

function loadUser() {
    const saved = localStorage.getItem('jn_user');
    if (saved) { state.user = JSON.parse(saved); updateNavForUser(); }
}
function updateNavForUser() {
    const btn = document.getElementById('navAuthBtn');
    const txt = document.getElementById('navAuthText');
    if (!btn || !txt) return;
    if (state.user) {
        txt.textContent = state.user.firstName || 'Me';
        btn.onclick = logoutUser;
        btn.title = 'Click to logout';
    }
}
function logoutUser() {
    state.user = null;
    localStorage.removeItem('jn_user');
    document.getElementById('navAuthText').textContent = 'Sign In';
    document.getElementById('navAuthBtn').onclick = openAuthModal;
    showToast('Logged out successfully', 'success');
}

// ═══════════════════════════════════════════
//   JOBS
// ═══════════════════════════════════════════
async function fetchJobs(page = 1) {
    state.jobPage = page;
    const query = document.getElementById('jobSearchQuery')?.value?.trim() || 'software developer';
    const location = document.getElementById('jobSearchLocation')?.value?.trim() || 'india';
    const sortBy = document.getElementById('jobSortBy')?.value || 'relevance';

    showEl('jobsLoader'); hideEl('jobsPagination'); hideEl('resultsInfo');
    document.getElementById('jobsGrid').innerHTML = '';

    try {
        const params = new URLSearchParams({ what: query, where: location, page, results_per_page: 12, sort_by: sortBy });
        const res = await fetch(`${API}/api/jobs?${params}`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        state.jobs = data.jobs || [];
        state.jobTotal = data.total || 0;

        renderJobs(state.jobs);
        renderPagination(page, Math.ceil(state.jobTotal / 12));

        const info = document.getElementById('resultsInfo');
        document.getElementById('resultsCount').textContent = `${state.jobTotal.toLocaleString()} jobs found`;
        document.getElementById('resultsCountry').textContent = data.country === 'gb' ? '🇬🇧 UK listings' : '🇮🇳 India listings';
        showEl('resultsInfo');
    } catch (err) {
        document.getElementById('jobsGrid').innerHTML = `
      <div class="jobs-placeholder" style="grid-column:1/-1">
        <i class="fa fa-exclamation-triangle" style="color:var(--yellow)"></i>
        <p>Could not fetch jobs. Check your connection or try again.</p>
        <button class="btn-primary" onclick="fetchJobs(1)"><i class="fa fa-redo"></i> Retry</button>
      </div>`;
    } finally {
        hideEl('jobsLoader');
    }
}

function renderJobs(jobs) {
    const grid = document.getElementById('jobsGrid');
    if (!jobs.length) {
        grid.innerHTML = `<div class="jobs-placeholder" style="grid-column:1/-1"><i class="fa fa-search"></i><p>No jobs found. Try different keywords.</p></div>`;
        return;
    }
    grid.innerHTML = jobs.map((job, i) => `
    <div class="job-card" onclick="openApplyModal(${i})" style="animation-delay:${i * 50}ms">
      <div class="glow-border"></div>
      <div class="job-card-header">
        <img class="job-logo" src="${job.logo}" alt="${job.company}" onerror="this.src='https://ui-avatars.com/api/?name=J&background=0f4c81&color=fff&size=64'" />
        <div>
          <div class="job-card-title">${escHtml(job.title)}</div>
          <div class="job-company"><i class="fa fa-building"></i> ${escHtml(job.company)}</div>
        </div>
      </div>
      <div class="job-card-meta">
        <span class="job-meta-item"><i class="fa fa-map-marker-alt"></i> ${escHtml(job.location)}</span>
        <span class="job-meta-item"><i class="fa fa-tag"></i> ${escHtml(job.category)}</span>
        ${job.created ? `<span class="job-meta-item"><i class="fa fa-clock"></i> ${timeAgo(job.created)}</span>` : ''}
      </div>
      <p class="job-desc">${escHtml(job.description)}</p>
      <div class="job-card-footer">
        <span class="job-salary">${formatSalary(job.salary_min, job.salary_max)}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="job-type-badge">${escHtml(job.contract_type || 'Full Time')}</span>
          <button class="btn-primary small" onclick="event.stopPropagation();openApplyModal(${i})">Apply <i class="fa fa-arrow-right"></i></button>
        </div>
      </div>
    </div>`).join('');
    // Re-bind glow on freshly rendered cards
    setTimeout(initGlowingEffect, 50);
}

function renderPagination(current, total) {
    if (total <= 1) { hideEl('jobsPagination'); return; }
    const el = document.getElementById('jobsPagination');
    let html = '';
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    if (current > 1) html += `<button class="page-btn" onclick="fetchJobs(${current - 1})"><i class="fa fa-chevron-left"></i></button>`;
    if (start > 1) { html += `<button class="page-btn" onclick="fetchJobs(1)">1</button>`; if (start > 2) html += `<span style="color:var(--text3)">…</span>`; }
    for (let i = start; i <= end; i++) html += `<button class="page-btn${i === current ? ' active' : ''}" onclick="fetchJobs(${i})">${i}</button>`;
    if (end < total) { if (end < total - 1) html += `<span style="color:var(--text3)">…</span>`; html += `<button class="page-btn" onclick="fetchJobs(${total})">${total}</button>`; }
    if (current < total) html += `<button class="page-btn" onclick="fetchJobs(${current + 1})"><i class="fa fa-chevron-right"></i></button>`;
    el.innerHTML = html;
    showEl('jobsPagination');
}

function clearJobFilters() {
    const q = document.getElementById('jobSearchQuery');
    const l = document.getElementById('jobSearchLocation');
    if (q) q.value = '';
    if (l) l.value = 'india';
    fetchJobs(1);
}

// ─── Apply Modal with AI Fake-Job Detection ───────────────────────────────────
function openApplyModal(index) {
    const job = state.jobs[index];
    if (!job) return;

    // Store for apply buttons
    state.jobRedirectUrl = job.redirect_url;
    state.jobLinkedInUrl = null; // will be set after verify

    // Populate header
    document.getElementById('applyModalTitle').textContent = job.title;
    document.getElementById('applyModalCompany').textContent = `${job.company} · ${job.location}`;

    // Company logo letter
    const logoEl = document.getElementById('applyModalLogo');
    if (logoEl) logoEl.textContent = (job.company || 'J').charAt(0).toUpperCase();

    // Reset verify panel
    document.getElementById('aiVerifyLoading').classList.remove('hidden');
    document.getElementById('aiVerifyResult').classList.add('hidden');
    document.getElementById('signalList').innerHTML = '';

    // Show modal
    document.getElementById('applyModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Call AI verify endpoint
    fetch(`${API}/api/jobs/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
    })
        .then(r => r.json())
        .then(result => {
            // Store LinkedIn URL for the button
            state.jobLinkedInUrl = result.linkedinUrl;

            // Hide loader, show result
            document.getElementById('aiVerifyLoading').classList.add('hidden');
            document.getElementById('aiVerifyResult').classList.remove('hidden');

            // Trust bar
            const bar = document.getElementById('trustBarFill');
            const pct = result.trustPct || 0;
            bar.style.width = '0%';
            bar.style.background = pct >= 60
                ? 'linear-gradient(90deg,#22c55e,#4ade80)'
                : pct >= 35
                    ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                    : 'linear-gradient(90deg,#ef4444,#f87171)';
            setTimeout(() => { bar.style.width = pct + '%'; }, 50);

            // Verdict
            document.getElementById('verdictIcon').textContent = result.verdictIcon || '';
            const vt = document.getElementById('verdictText');
            vt.textContent = result.verdict || '';
            vt.style.color = result.verdictColor || '#60a5fa';
            document.getElementById('trustPctLabel').textContent = `${pct}% Trust Score`;
            document.getElementById('trustPctLabel').style.color = result.verdictColor || '#60a5fa';

            // Signal list
            const sl = document.getElementById('signalList');
            sl.innerHTML = (result.signals || []).map(s => {
                const cls = s.type === 'danger' ? 'signal-danger'
                    : s.type === 'warn' ? 'signal-warn'
                        : s.type === 'safe' ? 'signal-safe'
                            : 'signal-info';
                return `<div class="signal-item ${cls}">
                <span class="signal-icon">${s.icon}</span>
                <span class="signal-text">${s.text}</span>
            </div>`;
            }).join('');

            // Warn on fraud
            if ((result.riskScore || 0) >= 40) {
                showToast('⚠️ High fraud risk detected — apply with caution!', 'warning');
            }
        })
        .catch(() => {
            document.getElementById('aiVerifyLoading').classList.add('hidden');
            document.getElementById('aiVerifyResult').classList.remove('hidden');
            document.getElementById('verdictIcon').textContent = 'ℹ️';
            document.getElementById('verdictText').textContent = 'Verification unavailable — proceed carefully';
            document.getElementById('trustBarFill').style.width = '50%';
        });
}

function closeApplyModal() {
    document.getElementById('applyModal').classList.add('hidden');
    document.body.style.overflow = '';
}

function applyExternal() {
    if (state.jobRedirectUrl) window.open(state.jobRedirectUrl, '_blank');
    else showToast('No redirect URL available for this job', 'warning');
    closeApplyModal();
}

function applyLinkedIn() {
    const url = state.jobLinkedInUrl;
    if (url) window.open(url, '_blank');
    else showToast('LinkedIn URL not available', 'warning');
    closeApplyModal();
}

document.getElementById('applyModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeApplyModal();
});


// ═══════════════════════════════════════════
//   ATS SCREENING
// ═══════════════════════════════════════════
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) updateFileUI(file);
}
function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('uploadZone')?.classList.add('dragover');
}
function handleDragLeave(e) {
    document.getElementById('uploadZone')?.classList.remove('dragover');
}
function handleDrop(e) {
    e.preventDefault();
    document.getElementById('uploadZone')?.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) {
        document.getElementById('resumeFile').files = e.dataTransfer.files;
        updateFileUI(file);
    }
}
function updateFileUI(file) {
    const el = document.getElementById('fileSelected');
    if (el) { el.textContent = `✅ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`; el.classList.remove('hidden'); }
}

async function runATSScreening() {
    const fileInput = document.getElementById('resumeFile');
    const textInput = document.getElementById('resumeTextInput')?.value?.trim();
    const jobDesc = document.getElementById('jobDescInput')?.value?.trim();
    const btn = document.getElementById('atsBtn');

    if (!fileInput?.files[0] && !textInput) return showToast('Please upload a resume or paste resume text', 'error');

    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Analysing...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        if (fileInput?.files[0]) formData.append('resume', fileInput.files[0]);
        else formData.append('resumeText', textInput);
        if (jobDesc) formData.append('jobDescription', jobDesc);

        const res = await fetch(`${API}/api/ats/screen`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        renderATSResults(data);
        showToast('ATS analysis complete! 🎯', 'success');
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    } finally {
        btn.innerHTML = '<i class="fa fa-robot"></i> Analyse Resume with AI';
        btn.disabled = false;
    }
}

function renderATSResults(d) {
    const el = document.getElementById('atsResults');
    const scoreColor = d.score >= 75 ? '#22c55e' : d.score >= 50 ? '#f59e0b' : '#ef4444';
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (d.score / 100) * circumference;

    el.innerHTML = `
    <div class="ats-score-card">
      <div class="ats-score-ring">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle class="score-bg" cx="70" cy="70" r="54"/>
          <circle class="score-fill" cx="70" cy="70" r="54"
            stroke="${scoreColor}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}"
            id="scoreCircle"/>
        </svg>
        <div class="ats-score-num">
          <span class="big-num" style="color:${scoreColor}" id="animScore">0</span>
          <span class="grade" style="color:${scoreColor}">Grade ${d.grade}</span>
        </div>
      </div>
      <div class="ats-status ${d.score >= 75 ? 'status-friendly' : d.score >= 50 ? 'status-improve' : 'status-bad'}">
        ${d.score >= 75 ? '✅' : '⚠️'} ${d.status}
      </div>
      <p style="color:var(--text2);font-size:0.85rem;margin-top:6px">${d.wordCount} words · ${d.experienceYears ? d.experienceYears + ' years exp detected' : 'No experience years detected'}</p>
    </div>

    <div class="glass-card" style="margin-bottom:16px">
      <h4 style="font-size:0.95rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px"><i class="fa fa-chart-bar"></i> Score Breakdown</h4>
      <div class="ats-breakdown-grid">
        ${Object.values(d.breakdown).map(b => `
          <div class="breakdown-item">
            <div class="breakdown-label">${b.label}</div>
            <div class="breakdown-bar"><div class="breakdown-fill" style="width:${(b.score / b.max * 100)}%"></div></div>
            <div class="breakdown-score">${b.score}/${b.max}</div>
          </div>`).join('')}
      </div>
    </div>

    ${d.matchedSkills.length ? `
    <div class="glass-card" style="margin-bottom:16px">
      <h4 style="font-size:0.95rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <i class="fa fa-check-circle" style="color:var(--green)"></i> Matched Skills
      </h4>
      <div class="skills-row">${d.matchedSkills.map(s => `<span class="skill-tag skill-matched">✔ ${s}</span>`).join('')}</div>
    </div>` : ''}

    ${d.missingSkills.length ? `
    <div class="glass-card" style="margin-bottom:16px">
      <h4 style="font-size:0.95rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <i class="fa fa-times-circle" style="color:var(--red)"></i> Missing Skills (from JD)
      </h4>
      <div class="skills-row">${d.missingSkills.map(s => `<span class="skill-tag skill-missing">✗ ${s}</span>`).join('')}</div>
    </div>` : ''}

    <div class="glass-card">
      <h4 style="font-size:0.95rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px">
        <i class="fa fa-lightbulb" style="color:var(--yellow)"></i> AI Recommendations
      </h4>
      <div class="rec-list">
        ${d.recommendations.slice(0, 10).map(r => `
          <div class="rec-item ${r.type}">
            <span class="rec-icon">${{ critical: '🔴', important: '🟡', warning: '🔵', tip: '💡' }[r.type] || 'ℹ️'}</span>
            <span>${escHtml(r.text)}</span>
          </div>`).join('')}
      </div>
    </div>
  `;

    // Animate score
    animateNumber('animScore', 0, d.score, 1500);
    setTimeout(() => {
        const circle = document.getElementById('scoreCircle');
        if (circle) circle.style.strokeDashoffset = offset;
    }, 100);
}

// ═══════════════════════════════════════════
//   RESUME BUILDER
// ═══════════════════════════════════════════
let eduCount = 1, expCount = 1, projCount = 1, certCount = 0;

function addEducation() {
    const c = document.getElementById('educationContainer');
    const div = document.createElement('div');
    div.className = 'dynamic-entry';
    div.dataset.index = eduCount++;
    div.innerHTML = `
    <div class="entry-header">
      <span>Education #${eduCount}</span>
      <button class="btn-remove" onclick="removeEntry(this)"><i class="fa fa-trash"></i></button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Institution</label><input type="text" class="edu-institution" placeholder="University Name" /></div>
      <div class="form-group"><label>Year</label><input type="text" class="edu-year" placeholder="2020 – 2024" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Degree</label><input type="text" class="edu-degree" placeholder="B.Tech Computer Science" /></div>
      <div class="form-group"><label>CGPA</label><input type="text" class="edu-gpa" placeholder="9.0 / 10" /></div>
    </div>`;
    c.appendChild(div);
}

function addExperience() {
    const c = document.getElementById('experienceContainer');
    const n = ++expCount;
    const div = document.createElement('div');
    div.className = 'dynamic-entry'; div.dataset.index = n;
    div.innerHTML = `
    <div class="entry-header">
      <span>Experience #${n}</span>
      <button class="btn-remove" onclick="removeEntry(this)"><i class="fa fa-trash"></i></button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Company</label><input type="text" class="exp-company" placeholder="Company Name" /></div>
      <div class="form-group"><label>Duration</label><input type="text" class="exp-duration" placeholder="Jan 2023 – Dec 2023" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Role</label><input type="text" class="exp-role" placeholder="Software Engineer" /></div>
      <div class="form-group"><label>Location</label><input type="text" class="exp-location" placeholder="Remote / City" /></div>
    </div>
    <div class="form-group"><label>Key Points</label>
      <textarea class="exp-points" rows="3" placeholder="• Bullet points one per line"></textarea>
    </div>`;
    c.appendChild(div);
}

function addProject() {
    const c = document.getElementById('projectContainer');
    const n = ++projCount;
    const div = document.createElement('div');
    div.className = 'dynamic-entry'; div.dataset.index = n;
    div.innerHTML = `
    <div class="entry-header">
      <span>Project #${n}</span>
      <button class="btn-remove" onclick="removeEntry(this)"><i class="fa fa-trash"></i></button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Project Name</label><input type="text" class="proj-name" placeholder="Project Title" /></div>
      <div class="form-group"><label>Year</label><input type="text" class="proj-year" placeholder="2024" /></div>
    </div>
    <div class="form-group"><label>Tech Stack</label><input type="text" class="proj-tech" placeholder="React, Node.js, MongoDB" /></div>
    <div class="form-group"><label>Key Points</label>
      <textarea class="proj-points" rows="3" placeholder="• Bullet points one per line"></textarea>
    </div>`;
    c.appendChild(div);
}

function addCertification() {
    const c = document.getElementById('certContainer');
    const n = ++certCount;
    const div = document.createElement('div');
    div.className = 'dynamic-entry'; div.dataset.index = n;
    div.innerHTML = `
    <div class="entry-header">
      <span>Certification #${n}</span>
      <button class="btn-remove" onclick="removeEntry(this)"><i class="fa fa-trash"></i></button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Certification Name</label><input type="text" class="cert-name" placeholder="AWS Solutions Architect" /></div>
      <div class="form-group"><label>Issuer</label><input type="text" class="cert-issuer" placeholder="Amazon Web Services" /></div>
    </div>
    <div class="form-group"><label>Year</label><input type="text" class="cert-year" placeholder="2024" /></div>`;
    c.appendChild(div);
}

function removeEntry(btn) {
    btn.closest('.dynamic-entry')?.remove();
}

function collectResumeData() {
    const education = Array.from(document.querySelectorAll('#educationContainer .dynamic-entry')).map(e => ({
        institution: e.querySelector('.edu-institution')?.value.trim() || '',
        year: e.querySelector('.edu-year')?.value.trim() || '',
        degree: e.querySelector('.edu-degree')?.value.trim() || '',
        gpa: e.querySelector('.edu-gpa')?.value.trim() || ''
    })).filter(e => e.institution);

    const experiences = Array.from(document.querySelectorAll('#experienceContainer .dynamic-entry')).map(e => ({
        company: e.querySelector('.exp-company')?.value.trim() || '',
        duration: e.querySelector('.exp-duration')?.value.trim() || '',
        role: e.querySelector('.exp-role')?.value.trim() || '',
        location: e.querySelector('.exp-location')?.value.trim() || '',
        points: e.querySelector('.exp-points')?.value.trim() || ''
    })).filter(e => e.company);

    const projects = Array.from(document.querySelectorAll('#projectContainer .dynamic-entry')).map(e => ({
        name: e.querySelector('.proj-name')?.value.trim() || '',
        year: e.querySelector('.proj-year')?.value.trim() || '',
        tech: e.querySelector('.proj-tech')?.value.trim() || '',
        points: e.querySelector('.proj-points')?.value.trim() || ''
    })).filter(p => p.name);

    const certifications = Array.from(document.querySelectorAll('#certContainer .dynamic-entry')).map(e => ({
        name: e.querySelector('.cert-name')?.value.trim() || '',
        issuer: e.querySelector('.cert-issuer')?.value.trim() || '',
        year: e.querySelector('.cert-year')?.value.trim() || ''
    })).filter(c => c.name);

    return {
        name: document.getElementById('r_name')?.value.trim() || '',
        phone: document.getElementById('r_phone')?.value.trim() || '',
        email: document.getElementById('r_email')?.value.trim() || '',
        linkedin: document.getElementById('r_linkedin')?.value.trim() || '',
        github: document.getElementById('r_github')?.value.trim() || '',
        portfolio: document.getElementById('r_portfolio')?.value.trim() || '',
        summary: document.getElementById('r_summary')?.value.trim() || '',
        skills: document.getElementById('r_skills')?.value.trim() || '',
        languages: document.getElementById('r_languages')?.value.trim() || '',
        tools: document.getElementById('r_tools')?.value.trim() || '',
        education, experiences, projects, certifications
    };
}

async function generateResume() {
    const data = collectResumeData();
    if (!data.name) return showToast('Please enter your full name', 'error');
    if (!data.email) return showToast('Please enter your email', 'error');

    const btn = document.querySelector('.resume-form-panel .btn-primary.full-width.large');
    if (btn) { btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...'; btn.disabled = true; }

    try {
        const res = await fetch(`${API}/api/resume/latex`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        state.currentLatex = result.latex || '';
        renderLatexOutput(state.currentLatex);
        showToast('Resume generated! Copy code and paste into Overleaf 🎉', 'success');
    } catch (err) {
        showToast('Error generating resume: ' + err.message, 'error');
    } finally {
        if (btn) { btn.innerHTML = '<i class="fa fa-magic"></i> Generate LaTeX Resume'; btn.disabled = false; }
    }
}

function renderLatexOutput(latex) {
    document.getElementById('resumeOutputPlaceholder')?.classList.add('hidden');
    const out = document.getElementById('resumeOutput');
    out?.classList.remove('hidden');
    const block = document.getElementById('latexCodeBlock');
    if (block) block.textContent = latex;
    out?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyLatex() {
    if (!state.currentLatex) return showToast('Generate resume first', 'error');
    navigator.clipboard.writeText(state.currentLatex).then(() => showToast('LaTeX code copied! Paste it in Overleaf ✅', 'success'));
}

function openOverleaf() {
    window.open('https://www.overleaf.com/project', '_blank');
    showToast('Paste your LaTeX code in Overleaf → New Project → Blank Project', 'success');
}

// ═══════════════════════════════════════════
//   LINKEDIN
// ═══════════════════════════════════════════
async function generateLinkedInContent() {
    const role = document.getElementById('li_role')?.value.trim();
    const skills = document.getElementById('li_skills')?.value.trim();
    const exp = document.getElementById('li_exp')?.value;
    if (!role) return showToast('Please enter your target role', 'error');

    const btn = document.querySelector('.linkedin-generator .btn-primary');
    if (btn) { btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...'; btn.disabled = true; }

    try {
        const res = await fetch(`${API}/api/linkedin/tips`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, skills: skills?.split(',') || [], experience: parseInt(exp) || 0 })
        });
        const data = await res.json();
        renderLinkedInResults(data);
        showToast('LinkedIn content generated! 💼', 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        if (btn) { btn.innerHTML = '<i class="fa fa-magic"></i> Generate LinkedIn Content'; btn.disabled = false; }
    }
}

function renderLinkedInResults(data) {
    // Results block
    document.getElementById('liHeadline').textContent = data.headline || '';
    document.getElementById('liAbout').textContent = data.about || '';
    const headlinesEl = document.getElementById('liSampleHeadlines');
    if (headlinesEl && data.sampleHeadlines) {
        headlinesEl.innerHTML = data.sampleHeadlines.map(h =>
            `<div class="li-headline-item" onclick="navigator.clipboard.writeText(this.textContent).then(()=>showToast('Copied!','success'))">${escHtml(h)}</div>`
        ).join('');
    }
    document.getElementById('liResults')?.classList.remove('hidden');

    // Tips panel
    const tipsPanel = document.getElementById('linkedinTips');
    if (tipsPanel && data.tips) {
        tipsPanel.innerHTML = `
      <div class="glass-card" style="margin-bottom:16px">
        <h4 style="font-size:0.95rem;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <i class="fa fa-image" style="color:var(--primary)"></i> Banner & Photo Tips
        </h4>
        <p style="font-size:0.85rem;color:var(--text2)">${escHtml(data.bannerTips)}</p>
      </div>
      <div class="glass-card">
        <h4 style="font-size:0.95rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <i class="fab fa-linkedin" style="color:#0a66c2"></i> Profile Optimization Guide
        </h4>
        <div class="tips-grid">
          ${data.tips.map(tip => `
            <div class="tip-card">
              <span class="tip-icon">${tip.icon}</span>
              <div class="tip-content">
                <h4>${escHtml(tip.title)}</h4>
                <p>${escHtml(tip.desc)}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    }
}

// ═══════════════════════════════════════════
//   COURSES
// ═══════════════════════════════════════════
async function loadCourses() {
    try {
        const res = await fetch(`${API}/api/courses`);
        const data = await res.json();
        state.coursesData = data.courses;
        renderDomainTabs(data.domains || Object.keys(data.courses));
        const firstDomain = (data.domains || Object.keys(data.courses))[0];
        if (firstDomain) renderCoursesForDomain(firstDomain);
    } catch (err) {
        console.error('Failed to load courses', err);
    }
}

function renderDomainTabs(domains) {
    const el = document.getElementById('domainTabs');
    if (!el) return;
    el.innerHTML = domains.map(d =>
        `<button class="domain-tab" onclick="renderCoursesForDomain('${escHtml(d)}')">${d}</button>`
    ).join('');
}

function renderCoursesForDomain(domain) {
    state.activeDomain = domain;
    // Update tab UI
    document.querySelectorAll('.domain-tab').forEach(t => {
        t.classList.toggle('active', t.textContent === domain);
    });
    const courses = state.coursesData?.[domain] || [];
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;
    grid.innerHTML = courses.map(c => `
    <a class="course-card" href="${c.url}" target="_blank" rel="noopener">
      <span class="course-icon">${c.icon}</span>
      <div class="course-title">${escHtml(c.title)}</div>
      <div class="course-channel"><i class="fab fa-youtube" style="color:#ff0000"></i> ${escHtml(c.channel)}</div>
      <p class="course-desc">${escHtml(c.desc)}</p>
      <span class="course-cta">Watch on YouTube <i class="fa fa-external-link-alt"></i></span>
    </a>`).join('');
}

// ═══════════════════════════════════════════
//   PARTICLES
// ═══════════════════════════════════════════
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const particles = [];
    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 1.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.5 + 0.1
        });
    }
    function draw() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(99,179,237,${p.alpha})`;
            ctx.fill();
            p.x += p.dx; p.y += p.dy;
            if (p.x < 0 || p.x > w) p.dx *= -1;
            if (p.y < 0 || p.y > h) p.dy *= -1;
        });
        // Draw lines between close particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(99,179,237,${0.08 * (1 - dist / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });
}

// ═══════════════════════════════════════════
//   COUNTERS
// ═══════════════════════════════════════════
function initCounters() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                animateNumber(el.id || null, 0, target, 2000, el);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    document.querySelectorAll('.stat-num').forEach(el => observer.observe(el));
}

function animateNumber(id, from, to, duration, el = null) {
    const target = el || (id ? document.getElementById(id) : null);
    if (!target) return;
    const start = performance.now();
    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        target.textContent = Math.round(from + (to - from) * eased).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ═══════════════════════════════════════════
//   UTILITIES
// ═══════════════════════════════════════════
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type}`;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), 4000);
}

function showEl(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideEl(id) { document.getElementById(id)?.classList.add('hidden'); }

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(dateStr) {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function formatSalary(min, max) {
    if (!min && !max) return 'Salary not disclosed';
    const fmt = v => v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max)}`;
}

function copyText(id) {
    const el = document.getElementById(id);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent).then(() => showToast('Copied to clipboard! ✅', 'success'));
}

// ═══════════════════════════════════════════
//   ACETERNITY – GlowingEffect
//   Mouse-proximity spotlight + border ring
//   Works on: .feature-card, .job-card,
//   .course-card, .glass-card, .tip-card,
//   .floating-card
// ═══════════════════════════════════════════
function initGlowingEffect() {
    const SELECTORS = [
        '.feature-card', '.job-card', '.course-card',
        '.glass-card', '.tip-card', '.floating-card',
        '.apply-option-card'
    ].join(',');

    const cards = document.querySelectorAll(SELECTORS);

    cards.forEach(card => {
        // Avoid double-binding
        if (card._glowBound) return;
        card._glowBound = true;

        // Inject .glow-border if not already present
        if (!card.querySelector('.glow-border')) {
            const gb = document.createElement('div');
            gb.className = 'glow-border';
            card.insertBefore(gb, card.firstChild);
        }

        card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%';
            const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%';
            card.style.setProperty('--mouse-x', x);
            card.style.setProperty('--mouse-y', y);
            card.style.setProperty('--glow-opacity', '1');

            // Also update the glow-border child
            const gb = card.querySelector('.glow-border');
            if (gb) {
                gb.style.setProperty('--mouse-x', x);
                gb.style.setProperty('--mouse-y', y);
                gb.style.setProperty('--glow-opacity', '1');
            }
        });

        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--glow-opacity', '0');
            const gb = card.querySelector('.glow-border');
            if (gb) gb.style.setProperty('--glow-opacity', '0');
        });

        // Subtle scale on hover for depth
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.3s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s ease';
            card.style.transform = 'translateY(-4px) scale(1.012)';
            card.style.boxShadow = '0 20px 60px rgba(99,179,237,0.12), 0 8px 32px rgba(139,92,246,0.08)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });
    });
}
