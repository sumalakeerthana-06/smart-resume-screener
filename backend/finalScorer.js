const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Normalizes skill names for consistent matching
 */
function normalizeSkill(skill) {
    if (!skill || typeof skill !== "string") return "";
    skill = skill.toLowerCase().trim();

    const aliasMap = {
        "react.js": "react",
        "reactjs": "react",
        "node.js": "node.js",
        "nodejs": "node.js",
        "node": "node.js",
        "js": "javascript",
        "ts": "typescript",
        "py": "python",
        "ml": "machine learning",
        "ai": "artificial intelligence",
        "mongo": "mongodb",
        "postgres": "postgresql",
        "cpp": "c++",
        "csharp": "c#",
        "restful api": "rest apis",
        "restful apis": "rest apis",
        "rest api": "rest apis",
        "dsa": "data structures & algorithms",
        "data structures": "data structures",
        "algorithms": "algorithms"
    };

    return aliasMap[skill] || skill;
}

/**
 * Check match quality between candidate skill pool and a required job skill
 */
function checkSkillMatch(resumeSkills, requiredSkill) {
    const normalizedReq = normalizeSkill(requiredSkill);

    // Exact Match
    if (resumeSkills.some(s => s === normalizedReq)) {
        return "full";
    }

    // Special handling for Data Structures & Algorithms
    if (
        normalizedReq.includes("data structures") && normalizedReq.includes("algorithms") ||
        normalizedReq === "data structures & algorithms" ||
        normalizedReq === "data structures and algorithms"
    ) {
        const hasDS = resumeSkills.some(s => s.includes("data structure"));
        const hasAlgo = resumeSkills.some(s => s.includes("algorithm"));
        if (hasDS && hasAlgo) return "full";
        if (hasDS || hasAlgo) return "partial";
        return "missing";
    }

    // Substring / partial match
    for (const skill of resumeSkills) {
        if (skill.length > 2 && (skill.includes(normalizedReq) || normalizedReq.includes(skill))) {
            return "partial";
        }
    }

    return "missing";
}

/**
 * Calculate match statistics for a list of job skills against candidate skills
 */
function calculateSkillMetrics(candidateSkills, targetSkills) {
    const fullMatches = [];
    const partialMatches = [];
    const missingSkills = [];

    if (!targetSkills || targetSkills.length === 0) {
        return {
            score: 100,
            fullMatches: [],
            partialMatches: [],
            missingSkills: []
        };
    }

    targetSkills.forEach(skill => {
        const matchType = checkSkillMatch(candidateSkills, skill);
        if (matchType === "full") {
            fullMatches.push(skill);
        } else if (matchType === "partial") {
            partialMatches.push(skill);
        } else {
            missingSkills.push(skill);
        }
    });

    const calculatedScore = (
        (fullMatches.length * 1.0 + partialMatches.length * 0.5) / targetSkills.length
    ) * 100;

    return {
        score: Math.min(Math.max(calculatedScore, 0), 100),
        fullMatches,
        partialMatches,
        missingSkills
    };
}

/**
 * Calculate education match score
 */
function calculateEducationScore(resume, job) {
    if (!job.required_education || job.required_education.length === 0) {
        return 100;
    }
    if (!resume.education || resume.education.length === 0) {
        return 50; // Partial baseline if education info unlisted
    }

    const candidateDegrees = resume.education.map(e => `${e.degree || ""} ${e.field || ""}`.toLowerCase());
    const requiredDegrees = job.required_education.map(e => `${e.degree || ""} ${e.field || ""}`.toLowerCase());

    let matchCount = 0;
    for (const req of requiredDegrees) {
        if (
            candidateDegrees.some(cand =>
                cand.includes("bachelor") || cand.includes("b.tech") || cand.includes("b.e") ||
                cand.includes("master") || cand.includes("m.tech") || cand.includes("computer") ||
                cand.includes("engineering")
            )
        ) {
            matchCount++;
        }
    }

    return matchCount > 0 ? 100 : 70;
}

/**
 * Calculate experience match score
 */
function calculateExperienceScore(resume, job) {
    const reqExp = (job.required_experience || "").toLowerCase();

    // If entry level / 0-2 years / academic projects allowed
    if (!reqExp || reqExp.includes("0-") || reqExp.includes("entry") || reqExp.includes("fresh") || reqExp.includes("intern") || reqExp.includes("project")) {
        return 100;
    }

    const hasWorkExp = Array.isArray(resume.experience) && resume.experience.length > 0;
    const hasProjects = Array.isArray(resume.projects) && resume.projects.length > 0;

    if (hasWorkExp) return 100;
    if (hasProjects) return 80;
    return 50;
}

/**
 * Calculate projects alignment score
 */
function calculateProjectsScore(resume, job) {
    if (!Array.isArray(resume.projects) || resume.projects.length === 0) {
        return 60;
    }
    if (!Array.isArray(job.responsibilities) || job.responsibilities.length === 0) {
        return 100;
    }

    // Projects exist and demonstrate applied work
    return Math.min(100, 70 + (resume.projects.length * 10));
}

/**
 * Compute the comprehensive multi-factor final score and recommendation
 */
function calculateFinalScore(resume, job, semanticResult) {
    const candidateSkills = (resume.skills || []).map(s => normalizeSkill(s));
    const requiredSkills = (job.required_skills || []).map(s => normalizeSkill(s));
    const preferredSkills = (job.preferred_skills || []).map(s => normalizeSkill(s));

    const reqResult = calculateSkillMetrics(candidateSkills, requiredSkills);
    const prefResult = calculateSkillMetrics(candidateSkills, preferredSkills);

    const educationScore = calculateEducationScore(resume, job);
    const experienceScore = calculateExperienceScore(resume, job);
    const projectsScore = calculateProjectsScore(resume, job);
    const semanticScore = Number(semanticResult.semantic_score) || 70;

    // Weighted Formula:
    // Required Skills: 35%
    // Semantic LLM Match: 25%
    // Experience: 15%
    // Education: 10%
    // Projects: 10%
    // Preferred Skills: 5%
    const finalScore = (
        reqResult.score * 0.35 +
        semanticScore * 0.25 +
        experienceScore * 0.15 +
        educationScore * 0.10 +
        projectsScore * 0.10 +
        prefResult.score * 0.05
    );

    const roundedFinal = Number(finalScore.toFixed(1));
    const rating10 = Number((roundedFinal / 10).toFixed(1));

    // Determine recommendation badge
    let recommendation = "Low Match (Not Shortlisted)";
    let isShortlisted = false;

    if (roundedFinal >= 80) {
        recommendation = "Strong Match (Shortlisted)";
        isShortlisted = true;
    } else if (roundedFinal >= 65) {
        recommendation = "Good Match (Shortlisted)";
        isShortlisted = true;
    } else if (roundedFinal >= 50) {
        recommendation = "Moderate Match (Review)";
        isShortlisted = false;
    }

    const finalResult = {
        candidate: resume.name || "Candidate",
        job_title: job.job_title || "Target Position",
        scores: {
            required_skills: Number(reqResult.score.toFixed(1)),
            preferred_skills: Number(prefResult.score.toFixed(1)),
            education: Number(educationScore.toFixed(1)),
            experience: Number(experienceScore.toFixed(1)),
            projects: Number(projectsScore.toFixed(1)),
            semantic_score: Number(semanticScore.toFixed(1)),
            final_score: roundedFinal,
            rating_out_of_10: rating10
        },
        recommendation,
        is_shortlisted: isShortlisted,
        matched_required_skills: reqResult.fullMatches,
        partial_required_skills: reqResult.partialMatches,
        missing_required_skills: reqResult.missingSkills,
        matched_preferred_skills: prefResult.fullMatches,
        missing_preferred_skills: prefResult.missingSkills,
        strong_matches: semanticResult.strong_matches || reqResult.fullMatches,
        semantic_partial_matches: semanticResult.partial_matches || reqResult.partialMatches,
        missing_requirements: semanticResult.missing_requirements || reqResult.missingSkills,
        justification: semanticResult.justification || "Candidate matches key technical criteria.",
        strengths_summary: semanticResult.strengths_summary || [],
        recommended_upskilling: semanticResult.recommended_upskilling || []
    };

    // Cache in data directory
    try {
        fs.writeFileSync(path.join(DATA_DIR, "last_final_result.json"), JSON.stringify(finalResult, null, 2));
    } catch (_) {}

    return finalResult;
}

module.exports = {
    calculateFinalScore
};