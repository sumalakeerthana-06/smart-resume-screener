const path = require("path");
const pdfkitPath = require.resolve("pdfkit", { paths: [path.join(__dirname, "backend", "node_modules")] });
const PDFDocument = require(pdfkitPath);
const fs = require("fs");

function createProjectGuidePDF() {
    const outputPath = path.join(__dirname, "Smart_Resume_Screener_Project_Guide.pdf");
    const doc = new PDFDocument({
        margin: 45,
        size: "A4",
        bufferPages: true
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Color Palette
    const colors = {
        primary: "#4f46e5",     // Indigo
        secondary: "#0284c7",   // Sky
        dark: "#0f172a",        // Slate dark
        body: "#334155",        // Slate text
        muted: "#64748b",       // Slate muted
        bgLight: "#f8fafc",     // Off-white
        border: "#e2e8f0",      // Light border
        accent: "#10b981",      // Emerald
        amber: "#d97706",       // Amber
        cardBg: "#f1f5f9"
    };

    // Helper functions for consistent styling
    function addHeader(title, subtitle = "") {
        doc.fillColor(colors.primary).fontSize(20).font("Helvetica-Bold").text(title);
        if (subtitle) {
            doc.fillColor(colors.muted).fontSize(10).font("Helvetica").text(subtitle);
        }
        doc.moveDown(0.5);
        doc.strokeColor(colors.border).lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.page.width - 45, doc.y).stroke();
        doc.moveDown(0.6);
    }

    function addSectionTitle(title) {
        doc.moveDown(0.4);
        doc.fillColor(colors.dark).fontSize(13).font("Helvetica-Bold").text(title);
        doc.moveDown(0.3);
    }

    function addSubTitle(title) {
        doc.fillColor(colors.secondary).fontSize(10.5).font("Helvetica-Bold").text(title);
        doc.moveDown(0.2);
    }

    function addParagraph(text) {
        doc.fillColor(colors.body).fontSize(9).font("Helvetica").text(text, { lineGap: 2.5, align: "justify" });
        doc.moveDown(0.3);
    }

    function addBullet(label, text) {
        doc.fillColor(colors.dark).fontSize(9).font("Helvetica-Bold").text(`• ${label}: `, { continued: true });
        doc.fillColor(colors.body).font("Helvetica").text(text, { lineGap: 2 });
        doc.moveDown(0.2);
    }

    function addCallout(title, text, borderColor = colors.primary, bgColor = colors.cardBg) {
        const startY = doc.y;
        const boxWidth = doc.page.width - 90;

        doc.fillColor(bgColor).rect(45, startY, boxWidth, 42).fill();
        doc.strokeColor(borderColor).lineWidth(3).moveTo(45, startY).lineTo(45, startY + 42).stroke();

        doc.fillColor(borderColor).fontSize(9.5).font("Helvetica-Bold").text(title, 55, startY + 7);
        doc.fillColor(colors.body).fontSize(8.5).font("Helvetica").text(text, 55, startY + 20, { width: boxWidth - 20 });
        
        doc.y = startY + 48;
        doc.moveDown(0.2);
    }

    // ==========================================
    // PAGE 1: TITLE & EXECUTIVE SUMMARY
    // ==========================================
    addHeader("Smart Resume Screener (SmartHire AI)", "Complete Technical Architecture, Scoring Formulas, Database, Workflow & Demo Video Guide");

    addCallout("🌟 PROJECT AT A GLANCE", "SmartHire AI is an intelligent multi-resume screening and candidate ranking platform. It extracts structured profiles, computes multi-factor fit scores (1–10 rating), evaluates semantic competency using Google Gemini LLM, and persists candidate records in a recruiter database.");

    addSectionTitle("1. Objective & Problem Statement");
    addParagraph("Traditional Applicant Tracking Systems (ATS) rely on rigid keyword matching that fails modern hiring: candidates who stuff keywords rank high, while qualified candidates with transferable skills or synonym phrasing get rejected. SmartHire AI solves this by combining deterministic rule-based algorithms with Large Language Model (LLM) semantic reasoning.");

    addSubTitle("Core System Goals:");
    addBullet("Multi-Format & Batch Ingestion", "Upload single or multiple resumes (1–20 files) in PDF or TXT formats, or paste raw candidate text.");
    addBullet("Structured Entity Extraction", "Extracts candidate names, contact details, technical skills, spoken languages, education, work history, and projects.");
    addBullet("Semantic Match & Justification", "Evaluates practical competence and transferable skills with Gemini LLM, providing explainable recruiter feedback.");
    addBullet("Multi-Factor Scoring Engine", "Computes a transparent weighted composite score (0–100% and 1–10 rating scale).");
    addBullet("Ranked Leaderboard & Comparison", "Ranks candidates from highest to lowest fit with medals (Gold, Silver, Bronze) and side-by-side comparison tables.");
    addBullet("Persistent Database Storage", "Stores all candidate profiles, screening histories, and aggregated stats in a zero-dependency database.");

    addSectionTitle("2. Technology Stack & Dependencies");
    addParagraph("The application is built on a clean, modern, zero-dependency architecture designed for speed, portability, and zero installation headaches:");

    addBullet("Runtime & Server", "Node.js (v18+) with Express.js REST API gateway and static web app hosting.");
    addBullet("AI / LLM Engine", "Google Gemini 3.5 Flash Lite (gemini-3.5-flash-lite) via the official @google/genai SDK.");
    addBullet("Document Ingestion", "pdf-parse for binary PDF text stream extraction and multer for multi-file upload management.");
    addBullet("Database Storage", "ACID-compliant persistent document database (screener_database.json) with atomic write synchronization.");
    addBullet("Frontend Dashboard", "HTML5, CSS3 Glassmorphism with custom glowing mesh gradients, and Vanilla JS (zero build tools required).");

    // ==========================================
    // PAGE 2: FILE-BY-FILE ARCHITECTURE
    // ==========================================
    doc.addPage();
    addHeader("System Architecture & File Breakdown");

    addSectionTitle("3. What is in Each File & What It Does");

    addSubTitle("Backend Components (backend/):");
    addBullet("server.js", "The main entry point and Express API gateway. Configures CORS, file size limits (25 MB), static serving of frontend/, single & multi-file routes (POST /screen), database endpoints (GET /api/candidates, GET /api/stats), and orchestrates the screening pipeline.");
    addBullet("resumeExtractor.js", "Parses raw candidate resume text using Gemini LLM into a strictly structured JSON schema (Name, Technical Skills, Spoken Languages, Education degrees, Experience, Projects). Enforces zero-hallucination rules.");
    addBullet("jobExtractor.js", "Analyzes job descriptions using Gemini LLM to cleanly separate mandatory required skills from preferred/bonus skills, required education level, experience thresholds, and responsibilities.");
    addBullet("semanticMatcher.js", "Performs deep contextual candidate-job matching with Gemini LLM. Evaluates transferable skills, assigns a 1–10 numerical fit rating, identifies strong matches, partial matches, missing gaps, and generates an AI recruiter justification.");
    addBullet("finalScorer.js", "The hybrid scoring engine. Normalizes skill aliases (e.g. 'React.js' -> 'react'), executes mathematical coverage matching, applies the multi-factor weighted formula, and determines recommendation tags.");
    addBullet("database.js", "Persistent database module. Manages candidates and screenings collections in backend/data/screener_database.json, provides search/filter queries, atomic file sync, and computes recruiter dashboard statistics.");

    addSubTitle("Frontend Components (frontend/):");
    addBullet("index.html", "Semantic HTML5 UI layout featuring dual tabs (Screening Workspace vs Candidate Database), multi-file drag-and-drop dropzone, file chip previews, 1-click sample JD preset chips, score ring gauge, sub-scores grid, and candidate inspection modal.");
    addBullet("script.js", "Frontend application controller. Manages multi-file selection, API communication, live progress animation, candidate leaderboard rendering, side-by-side comparison table, candidate switching tabs, clipboard copy, and JSON export.");
    addBullet("style.css", "Modern dark recruiter theme with ambient glowing mesh orbs, frosted glassmorphic panels, color-coded metric progress bars, and responsive layouts.");

    addSubTitle("Verification & Testing Scripts (/):");
    addBullet("test_screener.js", "Automated end-to-end test script verifying resume extraction, job extraction, semantic matching, scoring, and DB persistence.");
    addBullet("test_batch_screener.js", "Automated multi-candidate test script screening 3 distinct profiles concurrently and verifying leaderboard ranking.");

    // ==========================================
    // PAGE 3: SCORING FORMULAS & SEMANTIC MATCHING
    // ==========================================
    doc.addPage();
    addHeader("Scoring Formulas, Weights & Meanings");

    addSectionTitle("4. Multi-Factor Scoring Formula");
    addParagraph("SmartHire AI rejects purely subjective LLM scoring and purely rigid keyword counting. It employs a transparent, weighted multi-factor mathematical formula combining deterministic coverage with AI contextual reasoning:");

    addCallout("THE COMPOSITE SCORING FORMULA", "Final Score = (0.35 x Required Skills) + (0.25 x Semantic Match) + (0.15 x Experience) + (0.10 x Education) + (0.10 x Projects) + (0.05 x Preferred Skills)", colors.secondary);

    addSectionTitle("Detailed Breakdown of Scoring Factors:");

    addBullet("1. Required Skills Score (35% Weight)", "Measures coverage of mandatory technical requirements. Each exact skill match awards 1.0 point; each related/partial match awards 0.5 points. Formula: Score = [(Full Matches + 0.5 x Partial Matches) / Total Required Skills] x 100.");
    addBullet("2. Semantic Match Score (25% Weight)", "Computed by Gemini LLM. Evaluates contextual competency, depth of practical knowledge, transferable technologies (e.g. PostgreSQL satisfying SQL), problem-solving ability, and project complexity on a 0–100 scale.");
    addBullet("3. Experience Alignment Score (15% Weight)", "Evaluates candidate experience level against job requirements. Awards 100% for meeting required years or if academic projects are accepted for entry-level/intern roles.");
    addBullet("4. Education Relevance Score (10% Weight)", "Evaluates degree level (B.Tech, B.E., B.S., M.S.) and discipline alignment (Computer Science, IT, Engineering). Awards 100% for direct alignment, 70–80% for related technical fields.");
    addBullet("5. Projects Portfolio Score (10% Weight)", "Evaluates demonstrated practical application of software development in real-world or academic projects.");
    addBullet("6. Preferred Skills Score (5% Weight)", "Awards bonus points for nice-to-have tools, cloud platforms, and secondary certifications.");

    addSectionTitle("Recommendation Classification Thresholds:");
    addBullet(">= 80% Final Score", "Strong Match (Shortlisted) [Gold Star] - Candidate exceeds mandatory criteria with strong practical alignment.");
    addBullet("65% – 79% Final Score", "Good Match (Shortlisted) [Gold Star] - Candidate satisfies core requirements with minor skill gaps.");
    addBullet("50% – 64% Final Score", "Moderate Match (Review) [Clipboard] - Candidate has foundational skills but lacks key mandatory technologies.");
    addBullet("< 50% Final Score", "Low Match (Not Shortlisted) [Cross] - Candidate background does not match the target role.");

    // ==========================================
    // PAGE 4: DATABASE & LLM PROMPT ARCHITECTURE
    // ==========================================
    doc.addPage();
    addHeader("Database Storage & Gemini LLM Integration");

    addSectionTitle("5. Database Storage Architecture");
    addParagraph("The database engine (backend/database.js) is an embedded persistent document store located at backend/data/screener_database.json. It provides instant persistence with zero database server setup.");

    addSubTitle("Why this Database was Chosen:");
    addBullet("Portability", "Works out-of-the-box on any machine without installing MySQL, MongoDB, or PostgreSQL.");
    addBullet("Atomic Writes", "Writes updates to a temporary .tmp file before replacing the active database file, preventing data corruption.");
    addBullet("Dual Collections", "Maintains two relational collections: candidates (parsed profiles) and screenings (job-specific evaluations).");

    addSubTitle("Database Collections Schema:");
    addBullet("candidates Collection", "Stores candidate ID, full name, technical skills list, spoken languages, education objects, experience objects, project objects, and creation timestamp.");
    addBullet("screenings Collection", "Stores screening ID, candidate name, job title, job description preview, scores object (sub-scores + final score + 1–10 rating), recommendation tag, matched skills, missing skills, and AI justification.");

    addSectionTitle("6. Where & How Gemini LLM is Used");
    addParagraph("The system uses Google Gemini 3.5 Flash Lite across three specialized prompt stages:");

    addBullet("Stage 1: Resume Extraction", "Prompts Gemini to extract structured JSON entities from unstructured resume text. Enforces strict rules: no skill hallucination, and spoken languages must be separated into languages_known.");
    addBullet("Stage 2: Job Requirements Parsing", "Prompts Gemini to analyze unstructured job postings and separate mandatory required_skills from bonus preferred_skills and minimum education levels.");
    addBullet("Stage 3: Semantic Match & Justification", "Prompts Gemini to evaluate candidate-job fit contextually, rate fit on a 1–10 scale, identify strong vs missing skills, and write a 2–3 sentence recruiter justification.");

    addCallout("ZERO-HALLUCINATION DEFENSE", "All LLM outputs pass through a defensive JSON parser (cleanAndParseJSON) that strips markdown code blocks and validates object types before scoring.");

    // ==========================================
    // PAGE 5: EXACT DEMO VIDEO SCRIPT
    // ==========================================
    doc.addPage();
    addHeader("2–3 Minute Demo Video Script (Exact Lines)");

    addCallout("VIDEO RECORDING INSTRUCTIONS", "Speak with confidence, clarity, and moderate pace. Follow the exact timestamped lines below while performing the corresponding actions on your screen.");

    addSectionTitle("Timestamped Video Walkthrough Script:");

    addSubTitle("0:00 – 0:35 | Introduction & Overview");
    addParagraph("[ACTION: Show http://localhost:3000 in your browser with the dark theme and ambient glow visible.]");
    addParagraph("\"Hello everyone! Today, I am excited to present SmartHire AI, an intelligent multi-resume screener and candidate ranking platform built with Node.js, Express, and Google Gemini LLM.");
    addParagraph("Traditional ATS systems often fail because they rely solely on keyword matching. SmartHire AI solves this by combining structured data extraction, deterministic skill matching, and LLM semantic intelligence with database persistence.\"");

    addSubTitle("0:35 – 1:20 | Multi-Resume Upload & Batch Screening");
    addParagraph("[ACTION: Select or drag 2-3 PDF/TXT resumes into the dropzone. Click the 'Software Dev' quick template chip. Click 'Analyze & Rank Candidates'.]");
    addParagraph("\"Let's see it in action. In the Candidate Resumes panel, we can upload multiple resumes at once in PDF or TXT format. Here, I'm selecting three different candidate resumes.");
    addParagraph("Next, I'll select our pre-built 'Software Developer Intern' job description template. When I click 'Analyze & Rank Candidates', Gemini parses the job requirements once, concurrently extracts all candidate profiles, and computes their multi-factor match scores in parallel.\"");

    addSubTitle("1:20 – 2:05 | Ranked Leaderboard & Detailed Insights");
    addParagraph("[ACTION: Point to the Gold, Silver, and Bronze leaderboard cards. Show the comparison table. Click on Candidate 1, then Candidate 2.]");
    addParagraph("\"Here are the results! The system instantly generates a ranked candidate leaderboard. We can see our top candidate ranked #1 with an 89% match score (8.9 out of 10), categorized as a Strong Match.");
    addParagraph("Below, the Side-by-Side Comparison table compares all candidates simultaneously. Clicking on any candidate tab reveals their individual score ring gauge, 6-card sub-scores breakdown, color-coded skills matrix, and an explainable AI recruiter justification.\"");

    addSubTitle("2:05 – 2:45 | Candidate Database & Shortlist Dashboard");
    addParagraph("[ACTION: Switch to the 'Candidate Database' tab. Show the 3 stat cards, type a search keyword, and click 'View' on a candidate.]");
    addParagraph("\"All screened candidates are automatically stored in our persistent database. Switching to the Candidate Database tab, recruiters can view overall analytics like total screened candidates and average score.");
    addParagraph("We can search candidates by name or skill, filter by minimum score or recommendation status, and click 'View' to open an interactive modal with full screening details.\"");

    addSubTitle("2:45 – 3:00 | Conclusion");
    addParagraph("[ACTION: Switch back to the main view and show the action buttons (Copy Leaderboard, Export JSON).]");
    addParagraph("\"With multi-resume batch processing, multi-factor scoring, explainable AI justifications, and database persistence, SmartHire AI makes recruitment fast, fair, and accurate. Thank you!\"");

    // Add page numbers on all pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor(colors.muted).fontSize(8).font("Helvetica").text(
            `SmartHire AI - Project Architecture & Demo Guide  |  Page ${i + 1} of ${range.count}`,
            45,
            doc.page.height - 35,
            { align: "center", width: doc.page.width - 90 }
        );
    }

    doc.end();
    return new Promise((resolve, reject) => {
        writeStream.on("finish", () => resolve(outputPath));
        writeStream.on("error", reject);
    });
}

createProjectGuidePDF()
    .then(p => console.log("PDF created successfully at:", p))
    .catch(err => console.error("Error creating PDF:", err));
