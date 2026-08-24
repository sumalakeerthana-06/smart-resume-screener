# 🎯 Smart Resume Screener (SmartHire AI)

> **An AI-powered multi-resume screening and candidate ranking platform that parses resumes in batch, extracts structured profiles, performs semantic matching against job descriptions, computes explainable multi-factor fit scores (1–10 rating), generates ranked leaderboards, and persists all records in a recruiter database.**

---

## 📌 Table of Contents
1. [Objective & Key Features](#-objective--key-features)
2. [System Architecture](#-system-architecture)
3. [Multi-Resume Batch Screening & Ranking](#-multi-resume-batch-screening--ranking)
4. [LLM Prompt Engineering & System Prompts](#-llm-prompt-engineering--system-prompts)
5. [Multi-Factor Scoring Formula](#-multi-factor-scoring-formula)
6. [Database Schema & Persistence](#-database-schema--persistence)
7. [API Documentation](#-api-documentation)
8. [Installation & Setup Guide](#-installation--setup-guide)
9. [Running the Application](#-running-the-application)
10. [2–3 Minute Demo Video Script](#-23-minute-demo-video-script)

---

## 🚀 Objective & Key Features

### Objective
To automate candidate resume screening by combining structured data extraction, deterministic skill matching, and LLM-powered semantic analysis to deliver accurate candidate evaluations with actionable recruiter justifications and ranked candidate leaderboards.

### Key Capabilities
- **Multi-Resume Batch Screening**: Upload **1 to 20 candidate resumes at once** (PDF/TXT) or paste multiple candidate profiles.
- **Ranked Candidate Leaderboard**: Automatically ranks candidates from highest to lowest fit with medals (🥇 Rank 1, 🥈 Rank 2, 🥉 Rank 3...).
- **Side-by-Side Comparison Matrix**: Compare all candidate fit scores, 1–10 ratings, required skills coverage, and recommendation statuses in a unified table.
- **Structured Data Extraction**: Automatically extracts candidate name, contact info, skills, education, experience, and projects.
- **LLM-Powered Semantic Matching**: Evaluates contextual alignment, transferable skills, and practical project competency using Google Gemini.
- **Explainable Fit Scoring (1–10 Rating & Percentage)**: Multi-factor scoring across Required Skills, Preferred Skills, Semantic Fit, Education, Experience, and Projects.
- **Skill Gap Matrix**: Identifies **Strong Matches** (Green), **Partial Matches** (Yellow), and **Missing Requirements** (Red).
- **Candidate Shortlist & Database Dashboard**: Automatically stores parsed resumes and screenings in a persistent database with search, score filtering, and full inspection modals.
- **Report Export**: 1-click **Copy Leaderboard Summary**, **Export JSON**, and **Printable Report**.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend Dashboard (HTML5, CSS3, Vanilla JS)"]
        UI_Screen["Screen Candidate View<br>(Batch PDF/TXT Upload or Multi-Text Paste)"]
        UI_Leaderboard["Ranked Candidate Leaderboard<br>(Rank #1, #2, #3 Cards + Comparison Table)"]
        UI_Report["Detailed Candidate Report<br>(Score Ring 1-10 & %, Skill Matrix, AI Justification)"]
        UI_DB["Candidate Database & Shortlist<br>(Search, Filter, Stats, Modal Inspection)"]
    end

    subgraph Backend["Backend API (Node.js & Express)"]
        Server["server.js (API Router & Static Server)"]
        PDFParser["PDF / Text Extractor (pdf-parse)"]
        ResumeExt["Resume Extractor<br>(Gemini 3.5 Flash)"]
        JobExt["Job Requirements Extractor<br>(Gemini 3.5 Flash)"]
        SemMatch["Semantic Matcher & Justifier<br>(Gemini 3.5 Flash)"]
        Scorer["Multi-Factor Scoring Engine"]
        DB["Persistent Database Engine (screener_database.json)"]
    end

    UI_Screen -->|POST /screen (Multiple Files + JD)| Server
    Server --> JobExt
    Server --> PDFParser
    PDFParser -->|Concurrent Resumes| ResumeExt
    ResumeExt --> SemMatch
    JobExt --> SemMatch
    ResumeExt --> Scorer
    JobExt --> Scorer
    SemMatch --> Scorer
    Scorer --> DB
    Scorer -->|Ranked Leaderboard Array| UI_Leaderboard
    UI_Leaderboard -->|Switch Active Candidate| UI_Report
    UI_DB <-->|GET /api/candidates, GET /api/stats| Server
```

---

## 👥 Multi-Resume Batch Screening & Ranking

### How It Works:
1. **Single JD Extraction**: The Job Description is parsed **once** by Gemini LLM to extract mandatory skills, bonus tools, and education requirements.
2. **Concurrent Resume Processing**: Resumes are processed in parallel using asynchronous workers (`Promise.all`), extracting structured profiles, computing semantic fit, and calculating multi-factor scores.
3. **Leaderboard Sorting**: Candidates are sorted in descending order by `scores.final_score` and assigned rankings.
4. **Interactive Inspection**: Recruiter can click any candidate card or tab to inspect their full score ring gauge, skill matrix, and AI recruiter justification.

---

## 🧠 LLM Prompt Engineering & System Prompts

The system employs three specialized prompts for high accuracy and zero hallucination:

### 1. Resume Information Extraction Prompt
```text
You are an expert AI Resume Parsing System.
Analyze the following resume text and extract comprehensive structured candidate information in valid JSON format.

FIELDS TO EXTRACT:
1. "name": Candidate's full name
2. "email": Candidate email if present
3. "phone": Candidate phone if present
4. "skills": List of technical skills, programming languages, frameworks, libraries, databases, cloud tools, DevOps
5. "languages_known": Spoken/natural languages (English, Telugu, Hindi, etc.)
6. "education": List of degrees, fields, institutions, years
7. "experience": List of companies, roles, durations, descriptions
8. "projects": List of project names, descriptions, technologies
9. "summary": Brief professional profile summary

STRICT RULES:
- Extract only information explicitly present. Do NOT invent skills.
- Keep spoken languages separate in languages_known.
- Return ONLY valid JSON format.
```

### 2. Job Description Extraction Prompt
```text
You are an expert Technical Job Requirements Analyzer.
Analyze the following Job Description and extract structured requirements into a valid JSON object.

FIELDS TO EXTRACT:
1. "job_title": Designation or role title
2. "required_skills": Mandatory must-have technical skills, tools, languages
3. "preferred_skills": Good-to-have bonus skills
4. "required_education": Required degrees and fields
5. "required_experience": Required experience level (e.g. "0-2 years", "Entry Level")
6. "responsibilities": Key job responsibilities
7. "domain": Primary industry or technical domain

STRICT RULES:
- Extract ONLY explicitly stated requirements.
- Clearly separate mandatory vs preferred skills.
- Return ONLY valid JSON format.
```

### 3. Semantic Fit & Justification Prompt
```text
You are an expert Talent Acquisition AI and Technical Hiring Specialist.
Compare the candidate's resume with the target job description and evaluate candidate-job fit using semantic understanding, practical competency evaluation, and transferable skills.

EVALUATION CRITERIA:
1. Technical Competencies: Matching languages, frameworks, databases, and domain tools.
2. Educational Background: Degree relevance, field of study.
3. Experience & Project Portfolio: Practical application of skills, project complexity.
4. Problem Solving & Responsibilities: Ability to fulfill stated core job duties.

SCORING INSTRUCTIONS:
- Rate the overall candidate fit on a scale of 1 to 10 (decimal allowed, e.g. 7.5).
- Provide an equivalent semantic match percentage (0 to 100).
- Identify exact strong matches, partial matches, and missing requirements.
- Provide a clear, objective recruiter justification and recommendations.
```

---

## 📊 Multi-Factor Scoring Formula

The final candidate match score is calculated using a weighted multi-factor composite:

$$\text{Final Score} = (0.35 \times S_{\text{req}}) + (0.25 \times S_{\text{semantic}}) + (0.15 \times S_{\text{exp}}) + (0.10 \times S_{\text{edu}}) + (0.10 \times S_{\text{proj}}) + (0.05 \times S_{\text{pref}})$$

| Factor | Weight | Description |
| :--- | :--- | :--- |
| **Required Skills ($S_{\text{req}}$)** | 35% | Exact and partial match coverage of mandatory tech stack |
| **Semantic Match ($S_{\text{semantic}}$)** | 25% | LLM contextual reasoning, depth of experience, transferable skills |
| **Work Experience ($S_{\text{exp}}$)** | 15% | Years of experience and relevant industry exposure |
| **Education Relevance ($S_{\text{edu}}$)** | 10% | Degree and field of study alignment |
| **Projects Portfolio ($S_{\text{proj}}$)** | 10% | Practical application in real-world/academic projects |
| **Preferred Skills ($S_{\text{pref}}$)** | 5% | Bonus skills and nice-to-have competencies |

### Recommendation Thresholds:
- **$\ge 80\%$** $\rightarrow$ `Strong Match (Shortlisted)` ⭐
- **$65\% - 79\%$** $\rightarrow$ `Good Match (Shortlisted)` ⭐
- **$50\% - 64\%$** $\rightarrow$ `Moderate Match (Review)` 📋
- **$< 50\%$** $\rightarrow$ `Low Match (Not Shortlisted)` ✕

---

## 🗄️ Database Schema & Persistence

All parsed candidate profiles and screening sessions are stored in `backend/data/screener_database.json`:

### `candidates` Collection
```json
{
  "id": "cand_1787553473615_4f21",
  "name": "Alex Chen",
  "skills": ["Java", "Python", "React", "SQL", "Data Structures", "Node.js"],
  "languages_known": ["English"],
  "education": [
    {
      "degree": "B.Tech",
      "field": "Computer Science and Engineering",
      "institution": "ABC University",
      "year": "2025"
    }
  ],
  "experience": [],
  "projects": [
    {
      "name": "Smart Resume Screener",
      "description": "Built an AI-powered resume screening web application",
      "technologies": ["React", "Node.js", "AI"]
    }
  ],
  "created_at": "2026-08-24T06:30:00.000Z"
}
```

### `screenings` Collection
```json
{
  "id": "scr_1787553473630_a65d",
  "candidate_name": "Alex Chen",
  "job_title": "Software Developer Intern",
  "scores": {
    "required_skills": 89.3,
    "preferred_skills": 100,
    "education": 100,
    "experience": 100,
    "projects": 90,
    "semantic_score": 88,
    "final_score": 89.3,
    "rating_out_of_10": 8.9
  },
  "recommendation": "Strong Match (Shortlisted)",
  "matched_required_skills": ["java", "python", "javascript", "react", "sql"],
  "missing_required_skills": [],
  "justification": "Candidate demonstrates strong technical alignment with all core requirements and relevant academic projects.",
  "created_at": "2026-08-24T06:30:00.000Z"
}
```

---

## 🔌 API Documentation

### 1. Screen Candidate Resumes (Single or Batch)
- **Endpoint**: `POST /screen`
- **Content-Type**: `multipart/form-data` or `application/json`
- **Parameters**:
  - `resumes` (array of files: `.pdf` or `.txt`) **OR** `resumeText` (string)
  - `jobDescription` (string, required)
- **Response**:
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

### 2. Get All Stored Candidates
- **Endpoint**: `GET /api/candidates`
- **Query Params**: `?search=Alex&minScore=70&recommendation=Strong`
- **Response**: `{ "success": true, "count": 5, "candidates": [...] }`

### 3. Get Dashboard Analytics
- **Endpoint**: `GET /api/stats`
- **Response**:
```json
{
  "success": true,
  "stats": {
    "totalScreened": 15,
    "shortlistedCount": 10,
    "averageScore": 78.2,
    "topSkills": [{ "name": "python", "count": 12 }, { "name": "react", "count": 10 }]
  }
}
```

---

## ⚙️ Installation & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Google Gemini API Key ([Get one free at Google AI Studio](https://aistudio.google.com/))

### Setup Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/smart-resume-screener.git
   cd smart-resume-screener
   ```

2. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in `backend/.env`:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   PORT=3000
   ```

---

## 💻 Running the Application

### Start the Server:
From the root directory or `backend/` directory:
```bash
npm start
```
*Or directly:*
```bash
node backend/server.js
```

### Open the Dashboard:
Open your browser and navigate to:
👉 **`http://localhost:3000`**

### Run Automated System Tests:
```bash
# Single Candidate Test
node test_screener.js

# Multi-Resume Batch Ranking Test
node test_batch_screener.js
```

---

## 🎬 2–3 Minute Demo Video Script

Use this structured script when recording your 2–3 minute demo video:

| Timestamp | Section | What to Show on Screen | What to Say / Highlight |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:30** | **Introduction & Architecture** | Open `http://localhost:3000` in browser. Show modern UI. | *"Hello! This is SmartHire AI, an intelligent multi-resume screening and candidate ranking platform built with Node.js, Express, and Google Gemini LLM. It parses multiple resumes at once, performs semantic matching against job requirements, and provides ranked leaderboards with database persistence."* |
| **0:30 - 1:15** | **Batch Resume Screening** | 1. Drop 2-3 PDF/TXT resumes into the dropzone.<br>2. Click a preset sample JD ("Software Dev Intern").<br>3. Click **"Analyze & Rank Candidates"**.<br>4. Show live animated progress steps. | *"Let's select 3 candidate resumes simultaneously and choose a Software Developer Intern job description. When we click Analyze, Gemini parses the job description once, concurrently screens all 3 candidate resumes, and evaluates their technical and semantic fit."* |
| **1:15 - 2:00** | **Ranked Leaderboard & Detailed Insights** | Point to Rank #1 🥇, Rank #2 🥈, Rank #3 🥉 cards, the side-by-side comparison table, and click on candidate tabs to switch individual score gauges, skill matrices, and AI justifications. | *"Here is the instant ranked leaderboard! Candidate 1 is ranked #1 with an 89.3% match (8.9/10), while Candidate 2 is ranked #2 with 55.3%. We can view a side-by-side comparison matrix, or click any candidate tab to inspect their individual sub-score radar, skill gap breakdown, and explainable AI justification."* |
| **2:00 - 2:45** | **Database & Shortlisting** | Switch to the **"Candidate Database"** tab. Show the stats cards (Total Screened, Shortlisted, Avg Score), search by skill, filter by score, and click "View" to open the candidate inspection modal. | *"Every screened candidate is automatically persisted in our database. In the Candidate Database tab, recruiters can search by candidate name or skill, filter by minimum score or recommendation status, and inspect full past screening reports."* |
| **2:45 - 3:00** | **Conclusion** | Show terminal and export buttons (Copy Leaderboard, Export JSON). | *"With multi-resume batch processing, multi-factor scoring, explainable AI justifications, and database persistence, SmartHire AI streamlines recruitment from start to finish. Thank you!"* |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
