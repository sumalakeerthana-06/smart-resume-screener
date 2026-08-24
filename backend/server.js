require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { PDFParse } = require("pdf-parse");

const { extractResumeInformation } = require("./resumeExtractor");
const { extractJobInformation } = require("./jobExtractor");
const { semanticMatch } = require("./semanticMatcher");
const { calculateFinalScore } = require("./finalScorer");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload & data directories exist
const UPLOADS_DIR = path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ==========================================
// Middleware
// ==========================================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve frontend statically
const FRONTEND_PATH = path.join(__dirname, "..", "frontend");
if (fs.existsSync(FRONTEND_PATH)) {
    app.use(express.static(FRONTEND_PATH));
}

// Multer storage for single or multiple files
const upload = multer({
    dest: UPLOADS_DIR,
    limits: { fileSize: 25 * 1024 * 1024 } // 25 MB per file
});

// ==========================================
// Helper: Extract text from uploaded file
// ==========================================
async function extractTextFromFile(filePath, originalName) {
    const ext = path.extname(originalName || filePath).toLowerCase();

    if (ext === ".pdf") {
        const fileBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: fileBuffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        return pdfData.text || "";
    } else if (ext === ".txt" || ext === ".text" || ext === ".md") {
        return fs.readFileSync(filePath, "utf-8");
    } else {
        throw new Error(`Unsupported file type '${ext}'. Please upload a PDF or TXT resume.`);
    }
}

// ==========================================
// Helper: Process a Single Candidate Resume
// ==========================================
async function processCandidateResume(resumeText, jobData, originalFilename = "") {
    // 1. Structured Profile Extraction
    const resumeData = await extractResumeInformation(resumeText);
    if (!resumeData.name || resumeData.name === "Candidate") {
        if (originalFilename) {
            const cleanName = path.basename(originalFilename, path.extname(originalFilename)).replace(/[_-]/g, " ");
            resumeData.name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        }
    }

    // 2. Semantic Matching
    const semanticResult = await semanticMatch(resumeData, jobData);

    // 3. Multi-Factor Scoring
    const finalResult = calculateFinalScore(resumeData, jobData, semanticResult);
    finalResult.filename = originalFilename;

    // 4. Persist to Database
    try {
        db.saveCandidate(resumeData, resumeText);
        const savedScreening = db.saveScreening(finalResult);
        finalResult.screening_id = savedScreening.id;
    } catch (dbErr) {
        console.warn("[Database] Could not save record:", dbErr.message);
    }

    return finalResult;
}

// ==========================================
// API Routes
// ==========================================

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        timestamp: new Date().toISOString(),
        hasApiKey: Boolean(process.env.GEMINI_API_KEY)
    });
});

// Complete Screening API (Supports Single & Multiple Resumes)
app.post("/screen", upload.any(), async (req, res) => {
    const uploadedFiles = req.files || [];

    try {
        console.log("\n=======================================================");
        console.log(" Starting Resume Screening Workflow (Batch Mode Supported)");
        console.log("=======================================================");

        // 1. Validate and Parse Job Description
        const jobDescription = (req.body.jobDescription || "").trim();
        if (!jobDescription || jobDescription.length < 15) {
            return res.status(400).json({
                success: false,
                error: "Please provide a job description with requirements."
            });
        }

        console.log("\n[1/3] Extracting Job Requirements with Gemini LLM...");
        const jobData = await extractJobInformation(jobDescription);
        console.log(`✓ Job Title: ${jobData.job_title} | Required skills: ${jobData.required_skills?.length || 0}`);

        // 2. Collect All Resume Inputs (from uploaded files or pasted text)
        const resumeItems = [];

        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                try {
                    const text = await extractTextFromFile(file.path, file.originalname);
                    if (text && text.trim().length >= 20) {
                        resumeItems.push({ text: text.trim(), filename: file.originalname });
                    }
                } catch (readErr) {
                    console.warn(`Could not read file ${file.originalname}:`, readErr.message);
                }
            }
        } else if (req.body.resumeText && req.body.resumeText.trim()) {
            // Check if multiple resumes are separated by delimiter (e.g. '---' or '===')
            const rawPasted = req.body.resumeText.trim();
            const delimiterPattern = /\n\s*(?:---|===|\*\*\*)\s*\n/;

            if (delimiterPattern.test(rawPasted)) {
                const chunks = rawPasted.split(delimiterPattern);
                chunks.forEach((chunk, idx) => {
                    const trimmed = chunk.trim();
                    if (trimmed.length >= 20) {
                        resumeItems.push({ text: trimmed, filename: `Pasted Candidate #${idx + 1}` });
                    }
                });
            } else {
                resumeItems.push({ text: rawPasted, filename: "Pasted Resume" });
            }
        }

        if (resumeItems.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Please upload at least one valid PDF/TXT resume or paste resume text."
            });
        }

        console.log(`\n[2/3] Processing ${resumeItems.length} candidate resume(s) against Job Requirements...`);

        // 3. Process each resume concurrently
        const screeningPromises = resumeItems.map((item, index) => {
            console.log(` -> Parsing candidate [${index + 1}/${resumeItems.length}]: ${item.filename}`);
            return processCandidateResume(item.text, jobData, item.filename);
        });

        const screeningResults = await Promise.all(screeningPromises);

        // 4. Sort candidates by final score descending (Leaderboard Ranking)
        screeningResults.sort((a, b) => (b.scores?.final_score || 0) - (a.scores?.final_score || 0));

        // Assign rank numbers
        screeningResults.forEach((result, idx) => {
            result.rank = idx + 1;
            result.job_description = jobDescription;
        });

        console.log("\n=======================================================");
        console.log(`✓ Screening Completed! ${screeningResults.length} Candidate(s) Ranked.`);
        screeningResults.forEach(r => {
            console.log(` Rank #${r.rank}: ${r.candidate} — Score: ${r.scores.final_score}% (${r.scores.rating_out_of_10}/10) [${r.recommendation}]`);
        });
        console.log("=======================================================\n");

        res.json({
            success: true,
            total_candidates: screeningResults.length,
            job_title: jobData.job_title,
            results: screeningResults,
            result: screeningResults[0] // Primary candidate for single-mode compatibility
        });
    } catch (error) {
        console.error("\nScreening error:", error);
        res.status(500).json({
            success: false,
            error: "Resume screening failed.",
            details: error.message
        });
    } finally {
        // Cleanup all temporary files
        uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
                try {
                    fs.unlinkSync(file.path);
                } catch (_) {}
            }
        });
    }
});

// Database API: List all past candidate screenings (with filters & search)
app.get("/api/candidates", (req, res) => {
    try {
        const query = {
            search: req.query.search,
            minScore: req.query.minScore,
            recommendation: req.query.recommendation
        };
        const candidates = db.getScreenings(query);
        res.json({
            success: true,
            count: candidates.length,
            candidates
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Database API: Get candidate screening details by ID
app.get("/api/candidates/:id", (req, res) => {
    try {
        const record = db.getScreeningById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: "Candidate screening record not found." });
        }
        res.json({ success: true, candidate: record });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Database API: Delete candidate record
app.delete("/api/candidates/:id", (req, res) => {
    try {
        const deleted = db.deleteScreening(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Candidate record not found." });
        }
        res.json({ success: true, message: "Candidate record deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Database API: Recruiter Stats Summary
app.get("/api/stats", (req, res) => {
    try {
        const stats = db.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` Smart Resume Screener Server (Batch Mode Enabled)`);
    console.log(` Web App & Dashboard: http://localhost:${PORT}`);
    console.log(` API Endpoint:        http://localhost:${PORT}/screen`);
    console.log(`======================================================\n`);
});