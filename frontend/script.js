// Backend API Base URL:
// - When running locally or full-stack, uses relative path ""
// - When deployed on Vercel separately, uses window.BACKEND_URL or localStorage or falls back to relative/proxy
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = window.BACKEND_URL || localStorage.getItem("BACKEND_URL") || (isLocal ? "" : "");


// DOM Elements
const tabScreening = document.getElementById("tabScreening");
const tabDatabase = document.getElementById("tabDatabase");
const viewScreening = document.getElementById("viewScreening");
const viewDatabase = document.getElementById("viewDatabase");
const candidateCountBadge = document.getElementById("candidateCountBadge");
const backendStatus = document.getElementById("backendStatus");

// Resume Input Elements
const modeFileUpload = document.getElementById("modeFileUpload");
const modeTextPaste = document.getElementById("modeTextPaste");
const fileUploadContainer = document.getElementById("fileUploadContainer");
const textPasteContainer = document.getElementById("textPasteContainer");
const resumeInput = document.getElementById("resume");
const uploadZone = document.getElementById("uploadZone");
const browseButton = document.getElementById("browseButton");
const selectedFilesHeader = document.getElementById("selectedFilesHeader");
const selectedFileCount = document.getElementById("selectedFileCount");
const fileChipsContainer = document.getElementById("fileChipsContainer");
const clearFilesBtn = document.getElementById("clearFilesBtn");
const resumeText = document.getElementById("resumeText");
const resumeCharCount = document.getElementById("resumeCharCount");

// Job Description Elements
const jobDescription = document.getElementById("jobDescription");
const characterCount = document.getElementById("characterCount");
const presetButtons = document.querySelectorAll(".preset-chip");

// Action Elements
const screenButton = document.getElementById("screenButton");
const btnText = document.getElementById("btnText");
const loading = document.getElementById("loading");
const loadingStep = document.getElementById("loadingStep");
const resultDiv = document.getElementById("result");

// Database View Elements
const refreshDbBtn = document.getElementById("refreshDbBtn");
const statTotalScreened = document.getElementById("statTotalScreened");
const statShortlisted = document.getElementById("statShortlisted");
const statAvgScore = document.getElementById("statAvgScore");
const dbSearchInput = document.getElementById("dbSearchInput");
const dbRecommendationFilter = document.getElementById("dbRecommendationFilter");
const dbScoreFilter = document.getElementById("dbScoreFilter");
const candidatesTableBody = document.getElementById("candidatesTableBody");

// Modal Elements
const detailModal = document.getElementById("detailModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCandidateName = document.getElementById("modalCandidateName");
const modalBody = document.getElementById("modalBody");

// Application State
let currentInputMode = "file"; // "file" or "text"
let selectedFilesList = []; // Stores Array of File objects
let activeCandidatesList = []; // Database records
let currentBatchResults = []; // Results from latest batch screening
let activeSelectedCandidateIndex = 0; // Currently viewed candidate in batch result

// ======================================================
// INITIALIZATION
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
    checkHealth();
    loadDatabaseData();
    setupEventListeners();
});

function checkHealth() {
    fetch(`${API_BASE}/api/health`)
        .then(res => res.json())
        .then(data => {
            if (data.status === "online") {
                backendStatus.textContent = "Gemini 3.5 AI Online";
                backendStatus.style.color = "#34d399";
            }
        })
        .catch(() => {
            backendStatus.textContent = "Backend Connecting...";
            backendStatus.style.color = "#fbbf24";
        });
}

// ======================================================
// EVENT LISTENERS & NAVIGATION
// ======================================================
function setupEventListeners() {
    // Tab Switching
    tabScreening.addEventListener("click", () => switchTab("screening"));
    tabDatabase.addEventListener("click", () => {
        switchTab("database");
        loadDatabaseData();
    });

    // Input Mode Toggle
    modeFileUpload.addEventListener("click", () => setInputMode("file"));
    modeTextPaste.addEventListener("click", () => setInputMode("text"));

    // File Browsing & Drag Drop
    browseButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        resumeInput.click();
    });

    uploadZone.addEventListener("click", (e) => {
        if (e.target === browseButton) return;
        resumeInput.click();
    });

    resumeInput.addEventListener("change", handleFileSelection);

    uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("dragover");
    });

    uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("dragover");
    });

    uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("dragover");
        const files = Array.from(e.dataTransfer.files || []);
        addFilesToList(files);
    });

    clearFilesBtn.addEventListener("click", clearAllSelectedFiles);

    // Character Counts
    jobDescription.addEventListener("input", () => {
        characterCount.textContent = `${jobDescription.value.length.toLocaleString()} characters`;
    });

    resumeText.addEventListener("input", () => {
        resumeCharCount.textContent = `${resumeText.value.length.toLocaleString()} characters`;
    });

    // Preset Sample JDs
    presetButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const presetType = btn.getAttribute("data-preset");
            loadPresetJD(presetType);
        });
    });

    // Analyze Button Click
    screenButton.addEventListener("click", (e) => {
        e.preventDefault();
        screenResumesBatch();
    });

    // Database Filters & Search
    refreshDbBtn.addEventListener("click", loadDatabaseData);
    dbSearchInput.addEventListener("input", renderDatabaseTable);
    dbRecommendationFilter.addEventListener("change", renderDatabaseTable);
    dbScoreFilter.addEventListener("change", renderDatabaseTable);

    // Modal Close
    modalCloseBtn.addEventListener("click", closeModal);
    modalBackdrop.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
}

function switchTab(tab) {
    if (tab === "screening") {
        tabScreening.classList.add("active");
        tabDatabase.classList.remove("active");
        viewScreening.classList.remove("hidden-view");
        viewScreening.classList.add("active-view");
        viewDatabase.classList.add("hidden-view");
        viewDatabase.classList.remove("active-view");
    } else {
        tabDatabase.classList.add("active");
        tabScreening.classList.remove("active");
        viewDatabase.classList.remove("hidden-view");
        viewDatabase.classList.add("active-view");
        viewScreening.classList.add("hidden-view");
        viewScreening.classList.remove("active-view");
    }
}

function setInputMode(mode) {
    currentInputMode = mode;
    if (mode === "file") {
        modeFileUpload.classList.add("active");
        modeTextPaste.classList.remove("active");
        fileUploadContainer.classList.remove("hidden");
        textPasteContainer.classList.add("hidden");
    } else {
        modeTextPaste.classList.add("active");
        modeFileUpload.classList.remove("active");
        textPasteContainer.classList.remove("hidden");
        fileUploadContainer.classList.add("hidden");
    }
}

// ======================================================
// MULTI-FILE SELECTION HANDLER
// ======================================================
function handleFileSelection() {
    const files = Array.from(resumeInput.files || []);
    addFilesToList(files);
    resumeInput.value = "";
}

function addFilesToList(files) {
    for (const file of files) {
        const ext = file.name.toLowerCase();
        const isValid = ext.endsWith(".pdf") || ext.endsWith(".txt") || ext.endsWith(".text") || ext.endsWith(".md");

        if (!isValid) {
            alert(`File "${file.name}" is not a supported format. Please upload PDF or TXT files.`);
            continue;
        }

        if (file.size > 25 * 1024 * 1024) {
            alert(`File "${file.name}" exceeds the 25 MB limit.`);
            continue;
        }

        const exists = selectedFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!exists) {
            selectedFilesList.push(file);
        }
    }

    renderFileChips();
}

window.removeFile = function(index) {
    selectedFilesList.splice(index, 1);
    renderFileChips();
};

function clearAllSelectedFiles() {
    selectedFilesList = [];
    renderFileChips();
}

function renderFileChips() {
    if (selectedFilesList.length === 0) {
        selectedFilesHeader.classList.add("hidden");
        fileChipsContainer.innerHTML = "";
        return;
    }

    selectedFilesHeader.classList.remove("hidden");
    selectedFileCount.textContent = selectedFilesList.length;

    fileChipsContainer.innerHTML = selectedFilesList.map((file, idx) => {
        const isPDF = file.name.toLowerCase().endsWith(".pdf");
        const icon = isPDF ? "📕" : "📝";
        const sizeKB = (file.size / 1024).toFixed(1);

        return `
            <div class="file-chip">
                <span>${icon}</span>
                <span class="chip-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                <span class="chip-size">(${sizeKB} KB)</span>
                <button type="button" class="chip-remove" onclick="removeFile(${idx})" title="Remove file">&times;</button>
            </div>
        `;
    }).join("");
}

// Preset Sample Job Descriptions
function loadPresetJD(type) {
    if (type === "sde") {
        jobDescription.value = `Software Developer Intern
Requirements:
- Strong proficiency in Java, Python, and JavaScript/TypeScript.
- Experience with React, Node.js, and SQL/relational databases.
- Solid understanding of Data Structures, Algorithms, and Object-Oriented Programming.
- Bachelor's degree in Computer Science, Information Technology, or related engineering discipline (pursuing or completed).
- Familiarity with REST APIs, Git, GitHub, and cloud platforms is a plus.
- Good problem-solving and communication skills.`;
    } else if (type === "fullstack") {
        jobDescription.value = `Full Stack Web Developer
Requirements:
- 1-3 years experience building modern web applications.
- Frontend: React, Next.js, HTML5, CSS3, Tailwind CSS, TypeScript.
- Backend: Node.js, Express, Python (FastAPI/Django), REST APIs, GraphQL.
- Databases: PostgreSQL, MongoDB, Redis.
- DevOps: Docker, AWS/GCP basics, CI/CD pipelines, Git.
- Degree in Computer Science or equivalent practical experience.`;
    } else if (type === "data") {
        jobDescription.value = `AI / Data Science Engineer
Requirements:
- Strong foundation in Python, SQL, Pandas, NumPy, and Scikit-Learn.
- Experience with Large Language Models (LLMs), Prompt Engineering, and Vector Databases.
- Familiarity with PyTorch, TensorFlow, and machine learning model evaluation.
- Knowledge of Data Pipelines, ETL, and Cloud Storage (AWS/GCP).
- Bachelor's or Master's degree in Computer Science, Data Science, or Mathematics.`;
    } else if (type === "cloud") {
        jobDescription.value = `Cloud & DevOps Engineer
Requirements:
- Hands-on experience with AWS, Azure, or Google Cloud Platform (GCP).
- Strong proficiency in Linux shell scripting, Docker, and Kubernetes.
- Experience with Infrastructure as Code (Terraform) and CI/CD pipelines (GitHub Actions, Jenkins).
- Solid understanding of Networking, VPC, Security Groups, and IAM roles.
- Bachelor's degree in Computer Science or equivalent technical field.`;
    }
    characterCount.textContent = `${jobDescription.value.length.toLocaleString()} characters`;
}

// ======================================================
// SCREEN RESUMES (BATCH SCREENING WORKFLOW)
// ======================================================
async function screenResumesBatch() {
    const jd = jobDescription.value.trim();

    if (!jd) {
        alert("Please enter or select a Job Description.");
        jobDescription.focus();
        return;
    }

    const formData = new FormData();
    formData.append("jobDescription", jd);

    if (currentInputMode === "file") {
        if (selectedFilesList.length === 0) {
            alert("Please upload at least one PDF or TXT resume file.");
            return;
        }
        selectedFilesList.forEach(file => {
            formData.append("resumes", file);
        });
    } else {
        const text = resumeText.value.trim();
        if (!text || text.length < 20) {
            alert("Please paste candidate resume text.");
            resumeText.focus();
            return;
        }
        formData.append("resumeText", text);
    }

    // UI Loading State
    const totalCount = currentInputMode === "file" ? selectedFilesList.length : 1;
    screenButton.disabled = true;
    screenButton.classList.add("btn-loading");
    btnText.textContent = `Analyzing ${totalCount} Candidate(s)...`;
    loading.classList.remove("hidden");
    resultDiv.classList.add("hidden");
    resultDiv.innerHTML = "";

    const progressSteps = [
        "Parsing candidate profiles...",
        "Analyzing job description requirements...",
        "Evaluating semantic candidate-job fit...",
        "Calculating multi-factor scores and justifications...",
        "Generating ranked leaderboard..."
    ];

    let stepIdx = 0;
    loadingStep.textContent = progressSteps[0];
    const timer = setInterval(() => {
        stepIdx = (stepIdx + 1) % progressSteps.length;
        loadingStep.textContent = progressSteps[stepIdx];
    }, 1800);

    try {
        const response = await fetch(`${API_BASE}/screen`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.details || data.error || "Screening request failed.");
        }

        currentBatchResults = data.results || (data.result ? [data.result] : []);
        activeSelectedCandidateIndex = 0;

        renderBatchResults(currentBatchResults, data.job_title);
        loadDatabaseData(); // Refresh DB stats in background
    } catch (err) {
        console.error("Screening error:", err);
        showError(err.message || "An unexpected error occurred during screening.");
    } finally {
        clearInterval(timer);
        loading.classList.add("hidden");
        screenButton.disabled = false;
        screenButton.classList.remove("btn-loading");
        btnText.textContent = "Analyze & Rank Candidates";
    }
}

// ======================================================
// RENDER BATCH SCREENING RESULTS (LEADERBOARD & DETAILS)
// ======================================================
function renderBatchResults(results, jobTitle) {
    if (!results || results.length === 0) return;

    const isBatch = results.length > 1;
    const topCandidate = results[0];

    resultDiv.innerHTML = `
        <!-- LEADERBOARD / BATCH SUMMARY BANNER -->
        <div class="leaderboard-banner">
            <div class="leaderboard-header">
                <div>
                    <div class="hero-badge">
                        <span class="badge-dot"></span>
                        <span>SCREENING RESULTS · ${results.length} CANDIDATE(S) EVALUATED</span>
                    </div>
                    <h2 class="leaderboard-title">Candidate Rankings for ${escapeHtml(jobTitle || topCandidate.job_title || "Target Role")}</h2>
                </div>
                <div class="report-actions">
                    <button type="button" class="action-btn" onclick="copyLeaderboardSummary()">📋 Copy Leaderboard</button>
                    <button type="button" class="action-btn" onclick="downloadAllJSON()">💾 Export JSON</button>
                    <button type="button" class="action-btn" onclick="window.print()">🖨️ Print Report</button>
                </div>
            </div>

            <!-- RANKED CANDIDATE SUMMARY CARDS -->
            <div class="leaderboard-grid">
                ${results.map((c, idx) => {
                    const rank = idx + 1;
                    const score = Math.round(c.scores?.final_score || 0);
                    const rating10 = c.scores?.rating_out_of_10 || (score / 10).toFixed(1);
                    const rankMedal = rank === 1 ? "🥇" : (rank === 2 ? "🥈" : (rank === 3 ? "🥉" : `#${rank}`));
                    const badgeClass = score >= 80 ? "badge-strong" : (score >= 65 ? "badge-good" : (score >= 50 ? "badge-moderate" : "badge-low"));
                    const isSelected = idx === activeSelectedCandidateIndex ? "selected" : "";

                    return `
                        <div class="leaderboard-card ${isSelected}" onclick="switchActiveCandidate(${idx})">
                            <div class="card-rank-badge rank-${rank}">${rankMedal}</div>
                            <div class="card-details">
                                <div class="card-candidate-name">${escapeHtml(c.candidate)}</div>
                                <div class="card-filename">${escapeHtml(c.filename || "")}</div>
                                <div class="card-score-row">
                                    <span class="card-score-value">${score}%</span>
                                    <span class="card-rating">(${rating10}/10)</span>
                                    <span class="recommendation-badge ${badgeClass}">${escapeHtml(c.recommendation)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>

        ${isBatch ? `
            <!-- SIDE-BY-SIDE COMPARISON TABLE -->
            <div class="card" style="margin-bottom: 24px;">
                <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; margin-bottom: 16px; color: #fff;">📊 Side-by-Side Candidate Comparison</h3>
                <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Candidate</th>
                                <th>Overall Fit</th>
                                <th>1-10 Rating</th>
                                <th>Required Skills</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${results.map((c, idx) => {
                                const rank = idx + 1;
                                const score = Math.round(c.scores?.final_score || 0);
                                const rating10 = c.scores?.rating_out_of_10 || (score / 10).toFixed(1);
                                const reqScore = Math.round(c.scores?.required_skills || 0);
                                const badgeClass = score >= 80 ? "badge-strong" : (score >= 65 ? "badge-good" : (score >= 50 ? "badge-moderate" : "badge-low"));

                                return `
                                    <tr style="${idx === activeSelectedCandidateIndex ? 'background: rgba(99, 102, 241, 0.15);' : ''}">
                                        <td><strong>#${rank}</strong></td>
                                        <td><strong style="color: #fff;">${escapeHtml(c.candidate)}</strong></td>
                                        <td><span class="score-num">${score}%</span></td>
                                        <td><span class="score-sub">${rating10}/10</span></td>
                                        <td>${reqScore}%</td>
                                        <td><span class="table-badge ${badgeClass}">${escapeHtml(c.recommendation)}</span></td>
                                        <td><button type="button" class="tbl-btn view-btn" onclick="switchActiveCandidate(${idx})">Inspect Details</button></td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ""}

        <!-- CANDIDATE SELECTOR TABS -->
        <div class="candidate-tabs-bar">
            <span class="tabs-label">Active Candidate:</span>
            <div class="candidate-tabs">
                ${results.map((c, idx) => `
                    <button type="button" class="cand-tab-btn ${idx === activeSelectedCandidateIndex ? 'active' : ''}" onclick="switchActiveCandidate(${idx})">
                        Rank #${idx + 1}: ${escapeHtml(c.candidate)} (${Math.round(c.scores?.final_score || 0)}%)
                    </button>
                `).join("")}
            </div>
        </div>

        <!-- DETAILED REPORT FOR SELECTED CANDIDATE -->
        <div id="singleCandidateReportContainer">
            ${renderSingleCandidateReport(results[activeSelectedCandidateIndex])}
        </div>
    `;

    resultDiv.classList.remove("hidden");
    resultDiv.style.display = "block";

    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
}

window.switchActiveCandidate = function(index) {
    if (index < 0 || index >= currentBatchResults.length) return;
    activeSelectedCandidateIndex = index;

    document.querySelectorAll(".leaderboard-card").forEach((card, idx) => {
        card.classList.toggle("selected", idx === index);
    });

    document.querySelectorAll(".cand-tab-btn").forEach((btn, idx) => {
        btn.classList.toggle("active", idx === index);
    });

    const container = document.getElementById("singleCandidateReportContainer");
    if (container) {
        container.innerHTML = renderSingleCandidateReport(currentBatchResults[index]);
    }
};

// ======================================================
// RENDER DETAILED REPORT FOR ONE CANDIDATE
// ======================================================
function renderSingleCandidateReport(result) {
    if (!result) return "";

    const scores = result.scores || {};
    const finalScore = Math.round(Number(scores.final_score) || 0);
    const rating10 = Number(scores.rating_out_of_10 || (finalScore / 10).toFixed(1));

    const reqSkillsScore = Math.round(Number(scores.required_skills) || 0);
    const prefSkillsScore = Math.round(Number(scores.preferred_skills) || 0);
    const semanticScore = Math.round(Number(scores.semantic_score) || 0);
    const eduScore = Math.round(Number(scores.education) || 0);
    const expScore = Math.round(Number(scores.experience) || 0);
    const projScore = Math.round(Number(scores.projects) || 0);

    const candidate = safeText(result.candidate || "Candidate");
    const jobTitle = safeText(result.job_title || "Target Position");
    const recommendation = safeText(result.recommendation || "Evaluated Match");
    const isShortlisted = Boolean(result.is_shortlisted || finalScore >= 65);
    const justification = safeText(result.justification || "Candidate matches key criteria.");

    const matchedSkills = normalizeSkillsList(result.matched_required_skills);
    const partialSkills = normalizeSkillsList(result.partial_required_skills);
    const missingSkills = normalizeSkillsList(result.missing_required_skills);

    const strengths = Array.isArray(result.strengths_summary) ? result.strengths_summary : [];
    const upskilling = Array.isArray(result.recommended_upskilling) ? result.recommended_upskilling : [];

    const badgeClass = finalScore >= 80 ? "badge-strong" : (finalScore >= 65 ? "badge-good" : (finalScore >= 50 ? "badge-moderate" : "badge-low"));

    return `
        <!-- CANDIDATE HEADER BANNER -->
        <div class="result-header">
            <div class="header-info">
                <div class="candidate-label">CANDIDATE SCREENING REPORT · RANK #${result.rank || 1}</div>
                <h2 class="candidate-name">${escapeHtml(candidate)}</h2>
                <div class="job-name">🎯 Target Position: <strong>${escapeHtml(jobTitle)}</strong></div>
                <div class="recommendation-badge ${badgeClass}">
                    ${isShortlisted ? "⭐ SHORTLISTED" : "📋 REVIEW"} · ${escapeHtml(recommendation)}
                </div>
            </div>

            <!-- SCORE RING GAUGE -->
            <div class="score-ring" style="--score:${finalScore}%">
                <div class="score-content">
                    <div class="score-value">${finalScore}%</div>
                    <div class="score-rating">${rating10} / 10 Fit</div>
                    <div class="score-label">Match Score</div>
                </div>
            </div>
        </div>

        <!-- 6-CARD SUB-SCORES BREAKDOWN GRID -->
        <div class="score-grid">
            ${renderMetricCard("Required Skills", reqSkillsScore, "Mandatory tech stack coverage", "metric-fill-req")}
            ${renderMetricCard("Semantic Match", semanticScore, "LLM contextual competence & fit", "metric-fill-sem")}
            ${renderMetricCard("Preferred Skills", prefSkillsScore, "Bonus tools & certifications", "metric-fill-pref")}
            ${renderMetricCard("Education", eduScore, "Degree and discipline relevance", "metric-fill-edu")}
            ${renderMetricCard("Experience", expScore, "Years & industry depth", "metric-fill-exp")}
            ${renderMetricCard("Projects", projScore, "Practical portfolio application", "metric-fill-proj")}
        </div>

        <!-- SKILLS MATRIX CARDS -->
        <div class="analysis-grid">
            <div class="analysis-card match">
                <div class="card-title">
                    <span class="icon">✓</span>
                    <h3>Strong Skill Matches (${matchedSkills.length})</h3>
                </div>
                <div class="skill-list">
                    ${renderSkillsBadges(matchedSkills, "skill-match")}
                </div>
            </div>

            <div class="analysis-card partial">
                <div class="card-title">
                    <span class="icon">⚠</span>
                    <h3>Partial / Related Matches (${partialSkills.length})</h3>
                </div>
                <div class="skill-list">
                    ${renderSkillsBadges(partialSkills, "skill-partial")}
                </div>
            </div>

            <div class="analysis-card missing">
                <div class="card-title">
                    <span class="icon">✕</span>
                    <h3>Missing Requirements (${missingSkills.length})</h3>
                </div>
                <div class="skill-list">
                    ${renderSkillsBadges(missingSkills, "skill-missing")}
                </div>
            </div>
        </div>

        <!-- AI RECRUITER INSIGHT & JUSTIFICATION -->
        <div class="ai-insight">
            <div class="ai-label">✦ AI RECRUITER JUSTIFICATION</div>
            <p class="justification-text">${escapeHtml(justification)}</p>

            ${strengths.length > 0 ? `
                <div class="insight-subheading">Key Candidate Strengths:</div>
                <ul class="insight-list">
                    ${strengths.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
                </ul>
            ` : ""}

            ${upskilling.length > 0 ? `
                <div class="insight-subheading">Recommended Upskilling / Growth Areas:</div>
                <ul class="insight-list upskilling">
                    ${upskilling.map(u => `<li>${escapeHtml(u)}</li>`).join("")}
                </ul>
            ` : ""}
        </div>
    `;
}

function renderMetricCard(title, value, description, fillClass = "") {
    const val = Math.min(Math.max(value, 0), 100);
    return `
        <div class="metric">
            <div class="metric-header">
                <div class="metric-title">${escapeHtml(title)}</div>
                <div class="metric-value">${val}%</div>
            </div>
            <div class="metric-bar">
                <div class="metric-fill ${fillClass}" style="width:${val}%"></div>
            </div>
            <div class="metric-desc">${escapeHtml(description)}</div>
        </div>
    `;
}

function renderSkillsBadges(skills, className) {
    if (!skills || skills.length === 0) {
        return `<span class="empty-text">None identified</span>`;
    }
    return skills.map(skill => `<span class="skill-tag ${className}">${escapeHtml(skill)}</span>`).join("");
}

function normalizeSkillsList(arr) {
    if (!arr) return [];
    if (!Array.isArray(arr)) return [String(arr)];
    return arr.map(item => {
        if (typeof item === "object" && item !== null) {
            return item.name || item.skill || JSON.stringify(item);
        }
        return String(item);
    }).filter(s => s.trim().length > 0);
}

// Report Actions (Copy / Export)
window.copyLeaderboardSummary = function() {
    if (!currentBatchResults || currentBatchResults.length === 0) return;
    const lines = currentBatchResults.map(r => `Rank #${r.rank}: ${r.candidate} — Score: ${r.scores?.final_score}% (${r.scores?.rating_out_of_10}/10) [${r.recommendation}]`);
    const summaryText = `CANDIDATE LEADERBOARD\nRole: ${currentBatchResults[0].job_title}\n\n` + lines.join("\n");

    navigator.clipboard.writeText(summaryText).then(() => {
        alert("Leaderboard summary copied to clipboard!");
    });
};

window.downloadAllJSON = function() {
    if (!currentBatchResults || currentBatchResults.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentBatchResults, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `screening_leaderboard_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
};

function showError(msg) {
    resultDiv.innerHTML = `
        <div class="error-banner">
            <div class="error-title">⚠ Screening Failed</div>
            <p>${escapeHtml(msg)}</p>
        </div>
    `;
    resultDiv.classList.remove("hidden");
    resultDiv.style.display = "block";
}

// ======================================================
// DATABASE VIEW & SHORTLIST MANAGEMENT
// ======================================================
async function loadDatabaseData() {
    try {
        const [candidatesRes, statsRes] = await Promise.all([
            fetch(`${API_BASE}/api/candidates`),
            fetch(`${API_BASE}/api/stats`)
        ]);

        if (candidatesRes.ok) {
            const data = await candidatesRes.json();
            activeCandidatesList = data.candidates || [];
            candidateCountBadge.textContent = activeCandidatesList.length;
            renderDatabaseTable();
        }

        if (statsRes.ok) {
            const data = await statsRes.json();
            const stats = data.stats || {};
            statTotalScreened.textContent = stats.totalScreened || 0;
            statShortlisted.textContent = stats.shortlistedCount || 0;
            statAvgScore.textContent = `${stats.averageScore || 0}%`;
        }
    } catch (err) {
        console.warn("Could not load database records:", err);
    }
}

function renderDatabaseTable() {
    const searchTerm = dbSearchInput.value.toLowerCase().trim();
    const recFilter = dbRecommendationFilter.value;
    const minScore = Number(dbScoreFilter.value) || 0;

    let filtered = activeCandidatesList.filter(c => {
        const matchesSearch = !searchTerm ||
            (c.candidate_name && c.candidate_name.toLowerCase().includes(searchTerm)) ||
            (c.job_title && c.job_title.toLowerCase().includes(searchTerm)) ||
            (c.matched_required_skills && c.matched_required_skills.some(s => s.toLowerCase().includes(searchTerm)));

        const matchesRec = recFilter === "all" || (c.recommendation && c.recommendation.toLowerCase().includes(recFilter.toLowerCase()));
        const matchesScore = (c.scores?.final_score || 0) >= minScore;

        return matchesSearch && matchesRec && matchesScore;
    });

    if (filtered.length === 0) {
        candidatesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty-msg">No candidate records found matching current filters.</td>
            </tr>
        `;
        return;
    }

    candidatesTableBody.innerHTML = filtered.map(c => {
        const score = Math.round(c.scores?.final_score || 0);
        const scoreOutOfTen = c.scores?.score_out_of_ten || (score / 10).toFixed(1);
        const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString() : "-";
        const matchedSkills = (c.matched_required_skills || []).slice(0, 3).join(", ");
        const badgeClass = score >= 80 ? "badge-strong" : (score >= 65 ? "badge-good" : (score >= 50 ? "badge-moderate" : "badge-low"));

        return `
            <tr>
                <td><strong>${escapeHtml(c.candidate_name)}</strong></td>
                <td>${escapeHtml(c.job_title)}</td>
                <td>
                    <div class="table-score">
                        <span class="score-num">${score}%</span>
                        <span class="score-sub">(${scoreOutOfTen}/10)</span>
                    </div>
                </td>
                <td><span class="table-badge ${badgeClass}">${escapeHtml(c.recommendation)}</span></td>
                <td><span class="skills-snippet">${escapeHtml(matchedSkills || "None")}</span></td>
                <td>${dateStr}</td>
                <td>
                    <div class="table-actions">
                        <button type="button" class="tbl-btn view-btn" onclick="inspectCandidate('${c.id}')">View</button>
                        <button type="button" class="tbl-btn del-btn" onclick="deleteCandidate('${c.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

window.inspectCandidate = function(id) {
    const candidate = activeCandidatesList.find(c => c.id === id);
    if (!candidate) return;

    modalCandidateName.textContent = `${candidate.candidate_name} — ${candidate.job_title}`;
    modalBody.innerHTML = `
        <div class="modal-section">
            <div class="modal-score-banner">
                <div>
                    <div class="modal-score-val">${candidate.scores?.final_score}% (${candidate.scores?.score_out_of_ten || (candidate.scores?.final_score/10).toFixed(1)}/10)</div>
                    <div class="modal-rec">${candidate.recommendation}</div>
                </div>
                <div class="modal-date">Screened on: ${new Date(candidate.created_at).toLocaleString()}</div>
            </div>
        </div>

        <div class="modal-section">
            <h4>Matched Skills:</h4>
            <div class="skill-list">${renderSkillsBadges(candidate.matched_required_skills, "skill-match")}</div>
        </div>

        <div class="modal-section">
            <h4>Missing Skills:</h4>
            <div class="skill-list">${renderSkillsBadges(candidate.missing_required_skills, "skill-missing")}</div>
        </div>

        <div class="modal-section">
            <h4>AI Recruiter Justification:</h4>
            <p class="justification-text">${escapeHtml(candidate.justification)}</p>
        </div>
    `;

    detailModal.classList.remove("hidden");
};

window.deleteCandidate = async function(id) {
    if (!confirm("Are you sure you want to delete this candidate screening record?")) return;

    try {
        const res = await fetch(`${API_BASE}/api/candidates/${id}`, { method: "DELETE" });
        if (res.ok) {
            loadDatabaseData();
        } else {
            alert("Could not delete candidate record.");
        }
    } catch (err) {
        alert("Error deleting record: " + err.message);
    }
};

function closeModal() {
    detailModal.classList.add("hidden");
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
}

function safeText(val) {
    if (val === undefined || val === null) return "";
    if (typeof val === "object") return val.name || val.title || JSON.stringify(val);
    return String(val);
}