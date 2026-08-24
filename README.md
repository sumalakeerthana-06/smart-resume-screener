# 🎯 SmartHire AI — Intelligent Multi-Resume Screener & Candidate Ranker

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-3.5_Flash_Lite-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> **SmartHire AI** is an intelligent, explainable multi-resume screening and candidate ranking platform. It ingests single or batch resumes (PDF/TXT), extracts structured candidate profiles with Gemini LLM, evaluates contextual and transferable skill competencies, calculates a multi-factor mathematical fit score ($0\text{--}100\%$ & $1\text{--}10$ scale), renders a ranked leaderboard, and persists all records in a zero-dependency recruiter database.

---

## 📌 Table of Contents
1. [Key Highlights & Traditional ATS Comparison](#-key-highlights--traditional-ats-comparison)
2. [System Architecture](#-system-architecture)
3. [Project Directory Structure](#-project-directory-structure)
4. [Multi-Resume Batch Screening & Ranking](#-multi-resume-batch-screening--ranking)
5. [Multi-Factor Composite Scoring Engine](#-multi-factor-composite-scoring-engine)
6. [LLM Prompts & Anti-Hallucination Pipeline](#-llm-prompts--anti-hallucination-pipeline)
7. [Database Architecture & Schema](#-database-architecture--schema)
8. [REST API Documentation](#-rest-api-documentation)
9. [Installation & Quickstart Guide](#-installation--quickstart-guide)
10. [Automated Verification Test Suite](#-automated-verification-test-suite)
11. [Recruiter Demo Video Script (2–3 Minutes)](#-recruiter-demo-video-script-23-minutes)
12. [License](#-license)

---

## 🚀 Key Highlights & Traditional ATS Comparison

### Why Traditional ATS Fails vs. How SmartHire AI Solves It

| Feature | Traditional Keyword ATS | SmartHire AI Engine |
| :--- | :--- | :--- |
| **Keyword Stuffing** | Easily fooled by hidden white-text keywords | Analyzes practical project application and semantic context |
| **Synonyms & Aliases** | Rejects valid candidates (e.g. `Postgres` vs `SQL`) | Semantic reasoning detects transferable competencies |
| **Batch Processing** | Sequential, slow file processing | Concurrently parses and ranks up to 20 resumes in parallel |
| **Score Explainability** | Opaque or binary pass/fail | Multi-factor breakdown (6 factors) + natural language AI justification |
| **Candidate Ranking** | Unranked lists | Visual leaderboard with medals (🥇 `#1`, 🥈 `#2`, 🥉 `#3`) |
| **Persistence** | Requires external database server setup | Built-in zero-dependency ACID-compliant JSON document store |

### Core Feature Set
- **Multi-Format Ingestion**: Upload batch PDF and TXT resumes or paste text for multiple candidates separated by `---`.
- **Entity Extraction**: Structured JSON extraction for Candidate Name, Contact, Technical Skills, Spoken Languages, Degrees, Experience, and Projects.
- **Explainable Multi-Factor Scoring**: Weighted mathematical formula combining deterministic skill coverage with LLM contextual reasoning.
- **Skill Gap Matrix**: Categorizes requirements into **Strong Matches** (Green), **Partial / Transferable Matches** (Amber), and **Missing Requirements** (Red).
- **Recruiter Dashboard**: Filter by candidate name, target role, minimum match score, or shortlist status with interactive detail inspection modals.
- **One-Click Export**: Copy leaderboard summaries to clipboard, export complete JSON evaluations, or generate print-friendly reports.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend Client (HTML5, CSS3 Glassmorphism, Vanilla JS)"]
        UI_Screen["Screening Workspace<br>• Multi-file Dropzone (PDF/TXT)<br>• Text Paste Mode<br>• 1-Click Job Presets"]
        UI_Leaderboard["Ranked Leaderboard<br>• Medals (Rank #1, #2, #3)<br>• Side-by-Side Comparison Matrix"]
        UI_Report["Candidate Inspection<br>• 1-10 & % Score Ring<br>• 6-Card Sub-Scores Breakdown<br>• Color-Coded Skills Matrix<br>• AI Recruiter Justification"]
        UI_DB["Candidate Database View<br>• Analytics Stats Cards<br>• Search & Filter Toolbar<br>• Inspection Modal"]
    end

    subgraph Backend["Backend Gateway (Node.js & Express 5.x)"]
        Server["server.js (REST API Gateway & Static Server)"]
        PDFParser["PDF / Text Stream Extractor (pdf-parse)"]
        ResumeExt["Resume Extractor<br>(Gemini 3.5 Flash Lite)"]
        JobExt["Job Extractor<br>(Gemini 3.5 Flash Lite)"]
        SemMatch["Semantic Matcher<br>(Gemini 3.5 Flash Lite)"]
        Scorer["Multi-Factor Scoring Engine (finalScorer.js)"]
        DB["Persistent Storage Engine (database.js)"]
    end

    subgraph Storage["Storage Layer"]
        DB_File[("backend/data/screener_database.json")]
    end

    UI_Screen -->|POST /screen (Multipart / JSON)| Server
    Server --> JobExt
    Server --> PDFParser
    PDFParser -->|Concurrent Streams| ResumeExt
    ResumeExt --> SemMatch
    JobExt --> SemMatch
    ResumeExt --> Scorer
    JobExt --> Scorer
    SemMatch --> Scorer
    Scorer --> DB
    DB <--> DB_File
    Scorer -->|Ranked Leaderboard Results| UI_Leaderboard
    UI_Leaderboard -->|Select Candidate| UI_Report
    UI_DB <-->|GET /api/candidates, GET /api/stats| Server
```

---

## 📂 Project Directory Structure

```
smart-resume-screener/
├── backend/
│   ├── data/
│   │   ├── screener_database.json   # Persistent ACID-compliant document database
│   │   ├── last_resume.json         # Cache of latest parsed resume
│   │   ├── last_job.json            # Cache of latest parsed job description
│   │   ├── last_semantic_result.json# Cache of latest semantic evaluation
│   │   └── last_final_result.json   # Cache of latest composite score
│   ├── database.js                  # Persistent database engine (CRUD & stats)
│   ├── finalScorer.js               # Multi-factor hybrid mathematical scoring
│   ├── jobExtractor.js              # Gemini LLM job requirements extractor
│   ├── matcher.js                   # Standalone deterministic skill matcher
│   ├── package.json                 # Backend package definitions
│   ├── resumeExtractor.js           # Gemini LLM candidate profile extractor
│   ├── resumeParser.js              # Standalone PDF text extractor
│   ├── semanticMatcher.js           # Gemini LLM contextual fit evaluator
│   └── server.js                    # Main Express API server & static host
├── frontend/
│   ├── index.html                   # Dual-view responsive recruiter UI
│   ├── script.js                    # Client controller, state management, API calls
│   └── style.css                    # Modern dark recruiter theme & glassmorphism
├── test_api.js                      # HTTP integration & DB search verification test
├── test_batch_screener.js           # Multi-candidate concurrent ranking test
├── test_screener.js                 # End-to-end 5-stage automated system test
├── Smart_Resume_Screener_Project_Guide.pdf # Complete printable project guide
├── .env                             # Environment configuration (API Key & Port)
├── .gitignore                       # Git ignore definitions
├── package.json                     # Root project scripts and dependencies
└── README.md                        # Project documentation
```

---

## 👥 Multi-Resume Batch Screening & Ranking

1. **Single Job Description Extraction**: When a recruiter submits a job description, Gemini LLM parses it **once** to isolate mandatory skills, preferred tools, and education requirements.
2. **Concurrent Resume Processing**: All uploaded candidate resumes are processed in parallel using asynchronous promises (`Promise.all`), extracting structured profiles and computing semantic fit concurrently.
3. **Leaderboard Sorting**: Evaluated candidates are sorted in descending order based on `scores.final_score` ($O(N \log N)$) and assigned ranks (`#1`, `#2`, `#3`).
4. **Side-by-Side Comparison**: Recruiters can compare all candidates simultaneously in a tabular format or click any individual profile to review the 6-factor sub-scores, skill breakdown, and AI justifications.

---

## 📊 Multi-Factor Composite Scoring Engine

SmartHire AI combines deterministic rule-based algorithms with Large Language Model semantic reasoning through a weighted composite formula:

$$\text{Final Score} = (0.35 \times S_{\text{req}}) + (0.25 \times S_{\text{sem}}) + (0.15 \times S_{\text{exp}}) + (0.10 \times S_{\text{edu}}) + (0.10 \times S_{\text{proj}}) + (0.05 \times S_{\text{pref}})$$

### Factor Weights Breakdown

| Factor | Weight | Evaluation Method | Rationale |
| :--- | :---: | :--- | :--- |
| **Required Skills ($S_{\text{req}}$)** | **35%** | Deterministic coverage ($1.0$ for exact match, $0.5$ for partial/alias match) | Mandatory technical stack is the foundation of qualification. |
| **Semantic LLM Match ($S_{\text{sem}}$)** | **25%** | Gemini 3.5 contextual competency & transferable skill evaluation | Evaluates practical depth, system understanding, and project scope. |
| **Experience ($S_{\text{exp}}$)** | **15%** | Industry tenure & academic projects check | Awards full marks for meeting tenure or accepted project experience. |
| **Education ($S_{\text{edu}}$)** | **10%** | Degree level (B.Tech, B.E., M.S.) & CS/IT discipline alignment | Verifies fundamental academic prerequisites. |
| **Projects ($S_{\text{proj}}$)** | **10%** | Demonstrated applied project portfolio | Confirms hands-on engineering capability beyond theory. |
| **Preferred Skills ($S_{\text{pref}}$)** | **5%** | Bonus tech & secondary tools coverage | Awards bonus consideration for nice-to-have technologies. |

### Recommendation Thresholds

| Score Range | 1–10 Rating | Status Badge | Recruiter Action |
| :--- | :--- | :--- | :--- |
| **80% – 100%** | **8.0 – 10.0** | ⭐ **Strong Match (Shortlisted)** | Priority Interview Scheduling |
| **65% – 79%** | **6.5 – 7.9** | 👍 **Good Match (Shortlisted)** | Secondary Interview Scheduling |
| **50% – 64%** | **5.0 – 6.4** | 📋 **Moderate Match (Review)** | Manual Recruiter Review |
| **< 50%** | **< 5.0** | ✕ **Low Match (Not Shortlisted)** | Automated Polite Rejection |

---

## 🧠 LLM Prompts & Anti-Hallucination Pipeline

The system uses Google Gemini 3.5 Flash Lite across three defensive, specialized prompt stages:

### 1. Resume Information Extraction
```text
You are an expert AI Resume Parsing System.
Analyze the following resume text and extract comprehensive structured candidate information in valid JSON format.

FIELDS TO EXTRACT:
1. "name": Candidate's full name (string)
2. "email": Candidate email (string or empty)
3. "phone": Candidate phone (string or empty)
4. "skills": Technical skills, languages, frameworks, tools, databases (array of strings)
5. "languages_known": Natural/spoken languages such as English, Telugu, Spanish (array of strings)
6. "education": Degrees and qualifications (array of objects with "degree", "field", "institution", "year", "grade")
7. "experience": Work experience and internships (array of objects with "company", "role", "duration", "description", "technologies")
8. "projects": Notable projects (array of objects with "name", "description", "technologies")
9. "summary": Brief professional profile summary (string)

STRICT RULES:
- Extract only information explicitly present. Do NOT invent skills.
- Do NOT include spoken languages in "skills"; place them in "languages_known".
- Return ONLY valid JSON format.
```

### 2. Job Description Requirements Extraction
```text
You are an expert Technical Job Requirements Analyzer.
Analyze the following Job Description and extract structured requirements into a valid JSON object.

FIELDS TO EXTRACT:
1. "job_title": Designation or role title (string)
2. "required_skills": Mandatory must-have skills, languages, frameworks (array of strings)
3. "preferred_skills": Good-to-have bonus skills or certifications (array of strings)
4. "required_education": Required degrees and fields (array of objects)
5. "required_experience": Required experience level (string)
6. "responsibilities": Key job duties (array of strings)
7. "domain": Primary industry domain (string)

STRICT RULES:
- Extract ONLY what is explicitly specified.
- Clearly separate mandatory (required) vs bonus (preferred) skills.
- Return ONLY valid JSON format.
```

### 3. Semantic Competency Matching & Recruiter Justification
```text
You are an expert Talent Acquisition AI and Technical Hiring Specialist.
Compare the candidate's resume with the target job description and evaluate candidate-job fit using semantic understanding, practical competency evaluation, and transferable skills.

EVALUATION CRITERIA:
1. Technical Competencies: Matching languages, frameworks, databases, and domain tools.
2. Educational Background: Degree relevance, field of study, academic alignment.
3. Experience & Project Portfolio: Practical application of required skills, project complexity.
4. Problem Solving & Responsibilities: Ability to fulfill stated core job duties.

SCORING INSTRUCTIONS:
- Rate overall candidate fit on a scale of 1 to 10 (decimal allowed, e.g. 7.5).
- Provide equivalent semantic match percentage (0 to 100).
- Identify exact strong matches, transferable partial matches, and missing requirements.
- Provide a clear, objective recruiter justification and recommendations.
```

---

## 🗄️ Database Architecture & Schema

The persistent database engine ([`backend/database.js`](backend/database.js)) manages an ACID-compliant JSON document store in `backend/data/screener_database.json`. It guarantees write safety using atomic temporary file swapping (`fs.renameSync`).

### `screenings` Record Schema
```json
{
  "id": "scr_1787576838174_27638908",
  "candidate_name": "Keerthana S.",
  "job_title": "Software Developer Intern",
  "job_description_preview": "Software Developer Intern\nRequirements:\n- Strong knowledge of Java...",
  "scores": {
    "required_skills": 87.5,
    "preferred_skills": 50.0,
    "education": 100.0,
    "experience": 100.0,
    "projects": 100.0,
    "semantic_score": 85.0,
    "final_score": 88.8,
    "rating_out_of_10": 8.9,
    "score_out_of_ten": 8.9
  },
  "recommendation": "Strong Match (Shortlisted)",
  "matched_required_skills": ["java", "python", "javascript", "react", "sql"],
  "partial_required_skills": ["data structures & algorithms"],
  "missing_required_skills": ["git"],
  "justification": "Candidate demonstrates strong proficiency in core programming languages, React front-end development, and relational databases with relevant projects.",
  "created_at": "2026-08-24T18:25:00.000Z"
}
```

---

## 🔌 REST API Documentation

### 1. Screen Resumes (Single & Batch)
* **Endpoint**: `POST /screen`
* **Content-Type**: `multipart/form-data` or `application/json`
* **Request Body**:
  * `resumes`: One or more binary files (`.pdf`, `.txt`, `.md`)
  * `jobDescription`: Target job requirements text *(Required)*
  * *(Alternative)* `resumeText`: Raw candidate text (separate multiple candidates with `---`)
* **Response**:
```json
{
  "success": true,
  "total_candidates": 3,
  "job_title": "Software Developer Intern",
  "results": [
    {
      "rank": 1,
      "candidate": "Alex Chen",
      "scores": { "final_score": 89.3, "rating_out_of_10": 8.9 },
      "recommendation": "Strong Match (Shortlisted)"
    },
    {
      "rank": 2,
      "candidate": "Priya Sharma",
      "scores": { "final_score": 55.3, "rating_out_of_10": 5.5 },
      "recommendation": "Moderate Match (Review)"
    }
  ]
}
```

### 2. Candidate Database Endpoints
* `GET /api/candidates`: Query screenings (Supports `?search=term&minScore=70&recommendation=Strong`).
* `GET /api/candidates/:id`: Retrieve complete screening report by ID.
* `DELETE /api/candidates/:id`: Delete a screening record.
* `GET /api/stats`: Retrieve aggregate analytics (Total Screened, Shortlisted Count, Average Score, Top Skills).
* `GET /api/health`: Check server and API key status.

---

## ⚙️ Installation & Quickstart Guide

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **Google Gemini API Key** ([Obtain free from Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/sumalakeerthana-06/smart-resume-screener.git
cd smart-resume-screener

# Install all dependencies at once from root
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 3. Launch the Server
```bash
npm start
```
Open **`http://localhost:3000`** in your browser to access the web dashboard.

---

## 🧪 Automated Verification Test Suite

Run the built-in automated test suites to verify system health:

```bash
# 1. Complete End-to-End System Test (5 Stages)
npm test

# 2. Multi-Candidate Batch Screening & Ranking Test
npm run test:batch

# 3. HTTP API & Database Persistence Test
npm run test:api
```

### Expected Test Output
```
=======================================================
 SMART RESUME SCREENER - AUTOMATED SYSTEM TEST
=======================================================
[Test 1/5] Extracting Resume Profile with Gemini LLM...  ✓ Passed
[Test 2/5] Extracting Job Requirements with Gemini LLM...✓ Passed
[Test 3/5] Computing Semantic Match & Justification...   ✓ Passed (8.9/10)
[Test 4/5] Computing Weighted Multi-Factor Final Score...✓ Passed (88.8%)
[Test 5/5] Testing Database Persistence & Stats...       ✓ Saved
=======================================================
 🎉 ALL SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY!
=======================================================
```

---

## 🎬 Recruiter Demo Video Script (2–3 Minutes)

Use this script for project presentation and demo video recordings:

| Timestamp | Section | Screen Action | Voiceover / Talking Points |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:35** | **Intro & Vision** | Show `http://localhost:3000` dark theme with ambient glow. | *"Hello! Welcome to SmartHire AI, an intelligent multi-resume screening and candidate ranking platform. Traditional ATS systems fail because they rely solely on keyword matching. SmartHire AI solves this by combining structured extraction, deterministic skill matching, and LLM semantic intelligence with database persistence."* |
| **0:35 – 1:20** | **Batch Screening** | 1. Drop 2–3 PDF/TXT resumes into the dropzone.<br>2. Click preset chip *"Software Dev"*.<br>3. Click **"Analyze & Rank Candidates"**.<br>4. Show live animated progress steps. | *"Let's upload 3 different candidate resumes simultaneously and select our Software Developer Intern job template. When we click Analyze, Gemini parses the job description once, concurrently screens all candidates in parallel, and calculates their multi-factor scores."* |
| **1:20 – 2:05** | **Leaderboard & Insights** | Point to Rank #1 🥇, #2 🥈, #3 🥉 cards, the side-by-side comparison table, and switch between candidate tabs. | *"Here is the ranked leaderboard! We see Candidate 1 ranked #1 with an 89% match (8.9/10). Below, the Side-by-Side Comparison table compares all candidates simultaneously. Clicking on any candidate reveals their score ring gauge, 6-factor sub-scores breakdown, color-coded skill matrix, and AI recruiter justification."* |
| **2:05 – 2:45** | **Recruiter Database** | Switch to the **"Candidate Database"** tab. Show stat cards, type a search query, and click "View" on a candidate. | *"All screened candidates are automatically stored in our persistent database. Recruiters can view overall analytics like average match score, search candidates by skill or role, filter by minimum score, and open full inspection reports in an interactive modal."* |
| **2:45 – 3:00** | **Conclusion** | Show export buttons (Copy Leaderboard, Export JSON). | *"With batch processing, multi-factor scoring, explainable AI justifications, and database persistence, SmartHire AI makes recruitment fast, fair, and accurate. Thank you!"* |

---

## 📄 License
This project is open-source and distributed under the [MIT License](LICENSE).
