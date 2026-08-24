const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ======================================================
// SMART RESUME SCREENER - DATABASE STORAGE ENGINE
// ======================================================
// Zero-dependency, lightweight, ACID-compliant persistent
// document database with full CRUD, filtering, and indexing.
// ======================================================

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "screener_database.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB Structure
const INITIAL_DB = {
    meta: {
        version: "1.0.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    candidates: [],
    screenings: []
};

/**
 * Load database from disk
 */
function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf-8");
            return JSON.parse(JSON.stringify(INITIAL_DB));
        }
        const data = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        console.error("[Database] Error reading database:", error.message);
        return JSON.parse(JSON.stringify(INITIAL_DB));
    }
}

/**
 * Persist database to disk atomically
 */
function writeDB(db) {
    try {
        db.meta.updated_at = new Date().toISOString();
        const tempFile = `${DB_FILE}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), "utf-8");
        fs.renameSync(tempFile, DB_FILE);
        return true;
    } catch (error) {
        console.error("[Database] Error writing database:", error.message);
        return false;
    }
}

/**
 * Generate unique ID
 */
function generateId(prefix = "rec") {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * Save or update a parsed candidate record
 */
function saveCandidate(candidateData, rawText = "") {
    const db = readDB();
    const candidateId = generateId("cand");

    const record = {
        id: candidateId,
        name: candidateData.name || "Unknown Candidate",
        skills: candidateData.skills || [],
        languages_known: candidateData.languages_known || [],
        education: candidateData.education || [],
        experience: candidateData.experience || [],
        projects: candidateData.projects || [],
        raw_text_preview: rawText ? rawText.substring(0, 500) : "",
        created_at: new Date().toISOString()
    };

    db.candidates.unshift(record);
    writeDB(db);
    return record;
}

/**
 * Save a complete screening session
 */
function saveScreening(screeningData) {
    const db = readDB();
    const screeningId = generateId("scr");

    const finalScore = Number(screeningData.scores?.final_score) || 0;
    const scoreOutOfTen = (finalScore / 10).toFixed(1);

    const record = {
        id: screeningId,
        candidate_name: screeningData.candidate || "Unknown Candidate",
        job_title: screeningData.job_title || "Job Position",
        job_description_preview: (screeningData.job_description || "").substring(0, 300),
        scores: {
            ...screeningData.scores,
            score_out_of_ten: Number(scoreOutOfTen)
        },
        recommendation: screeningData.recommendation || "Pending",
        matched_required_skills: screeningData.matched_required_skills || [],
        partial_required_skills: screeningData.partial_required_skills || [],
        missing_required_skills: screeningData.missing_required_skills || [],
        matched_preferred_skills: screeningData.matched_preferred_skills || [],
        missing_preferred_skills: screeningData.missing_preferred_skills || [],
        strong_matches: screeningData.strong_matches || [],
        semantic_partial_matches: screeningData.semantic_partial_matches || [],
        missing_requirements: screeningData.missing_requirements || [],
        justification: screeningData.justification || "",
        created_at: new Date().toISOString()
    };

    db.screenings.unshift(record);
    writeDB(db);
    return record;
}

/**
 * Get all screening records with optional search, filter, and pagination
 */
function getScreenings(query = {}) {
    const db = readDB();
    let records = db.screenings || [];

    // Filter by candidate name or job title search
    if (query.search) {
        const term = query.search.toLowerCase().trim();
        records = records.filter(item =>
            (item.candidate_name && item.candidate_name.toLowerCase().includes(term)) ||
            (item.job_title && item.job_title.toLowerCase().includes(term)) ||
            (item.matched_required_skills && item.matched_required_skills.some(s => s.toLowerCase().includes(term)))
        );
    }

    // Filter by minimum score
    if (query.minScore) {
        const min = Number(query.minScore);
        if (!isNaN(min)) {
            records = records.filter(item => (item.scores?.final_score || 0) >= min);
        }
    }

    // Filter by recommendation status
    if (query.recommendation && query.recommendation !== "all") {
        const rec = query.recommendation.toLowerCase();
        records = records.filter(item =>
            item.recommendation && item.recommendation.toLowerCase().includes(rec)
        );
    }

    return records;
}

/**
 * Get a single screening by ID
 */
function getScreeningById(id) {
    const db = readDB();
    return (db.screenings || []).find(item => item.id === id) || null;
}

/**
 * Delete a screening by ID
 */
function deleteScreening(id) {
    const db = readDB();
    const initialLength = db.screenings.length;
    db.screenings = (db.screenings || []).filter(item => item.id !== id);
    if (db.screenings.length !== initialLength) {
        writeDB(db);
        return true;
    }
    return false;
}

/**
 * Get aggregated statistics for the recruiter dashboard
 */
function getStats() {
    const db = readDB();
    const screenings = db.screenings || [];

    const totalScreened = screenings.length;
    const shortlistedCount = screenings.filter(s =>
        (s.scores?.final_score >= 70) ||
        (s.recommendation && (s.recommendation.includes("Strong") || s.recommendation.includes("Good")))
    ).length;

    const avgScore = totalScreened > 0
        ? (screenings.reduce((sum, s) => sum + (s.scores?.final_score || 0), 0) / totalScreened).toFixed(1)
        : 0;

    // Collect top matched skills across candidates
    const skillCounts = {};
    screenings.forEach(s => {
        (s.matched_required_skills || []).forEach(skill => {
            const key = skill.toLowerCase().trim();
            skillCounts[key] = (skillCounts[key] || 0) + 1;
        });
    });

    const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

    return {
        totalScreened,
        shortlistedCount,
        averageScore: Number(avgScore),
        topSkills
    };
}

module.exports = {
    saveCandidate,
    saveScreening,
    getScreenings,
    getScreeningById,
    deleteScreening,
    getStats
};
