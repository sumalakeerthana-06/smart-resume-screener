const fs = require("fs");
const path = require("path");

// ------------------------------------
// Read resume and job data
// ------------------------------------

const resume = JSON.parse(
    fs.readFileSync(path.join(__dirname, "resume.json"), "utf-8")
);

const job = JSON.parse(
    fs.readFileSync(path.join(__dirname, "job.json"), "utf-8")
);


// ------------------------------------
// Normalize skill names
// ------------------------------------

function normalizeSkill(skill) {

    skill = skill.toLowerCase().trim();

    const skillMap = {

        "react.js": "react",
        "reactjs": "react",

        "node.js": "node",
        "nodejs": "node",

        "js": "javascript",

        "ts": "typescript",

        "ml": "machine learning",

        "ai": "artificial intelligence",

        "mongo": "mongodb",

        "cpp": "c++",

        "csharp": "c#",

        "restful api": "rest api",
        "restful apis": "rest api",
        "rest apis": "rest api"
    };

    if (skillMap[skill]) {
        return skillMap[skill];
    }

    return skill;
}


// ------------------------------------
// Resume skills
// ------------------------------------

const resumeSkills = resume.skills.map(skill =>
    normalizeSkill(skill)
);


// ------------------------------------
// Job skills
// ------------------------------------

const requiredSkills = job.required_skills.map(skill =>
    normalizeSkill(skill)
);

const preferredSkills = job.preferred_skills.map(skill =>
    normalizeSkill(skill)
);


// ------------------------------------
// Skill matching function
// ------------------------------------

function checkSkillMatch(resumeSkills, requiredSkill) {

    // Exact match
    if (resumeSkills.includes(requiredSkill)) {
        return "full";
    }


    // Data Structures + Algorithms
    if (requiredSkill === "data structures and algorithms") {

        const hasDataStructures =
            resumeSkills.includes("data structures");

        const hasAlgorithms =
            resumeSkills.includes("algorithms");

        if (hasDataStructures && hasAlgorithms) {
            return "full";
        }

        if (hasDataStructures || hasAlgorithms) {
            return "partial";
        }

        return "missing";
    }


    // General partial matching
    for (const resumeSkill of resumeSkills) {

        if (
            resumeSkill.includes(requiredSkill) ||
            requiredSkill.includes(resumeSkill)
        ) {
            return "partial";
        }
    }

    return "missing";
}


// ------------------------------------
// Calculate skill results
// ------------------------------------

function calculateSkillScore(jobSkills) {

    let fullMatches = [];
    let partialMatches = [];
    let missingSkills = [];

    for (const skill of jobSkills) {

        const result = checkSkillMatch(
            resumeSkills,
            skill
        );

        if (result === "full") {
            fullMatches.push(skill);
        }
        else if (result === "partial") {
            partialMatches.push(skill);
        }
        else {
            missingSkills.push(skill);
        }
    }

    let score = 0;

    if (jobSkills.length > 0) {

        score =
            (
                (
                    fullMatches.length +
                    partialMatches.length * 0.5
                )
                /
                jobSkills.length
            ) * 100;
    }

    return {
        score,
        fullMatches,
        partialMatches,
        missingSkills
    };
}


// ------------------------------------
// Required + Preferred skill scores
// ------------------------------------

const requiredResult =
    calculateSkillScore(requiredSkills);

const preferredResult =
    calculateSkillScore(preferredSkills);


// ------------------------------------
// Education matching
// ------------------------------------

function calculateEducationScore() {

    if (
        !resume.education ||
        resume.education.length === 0 ||
        !job.required_education ||
        job.required_education.length === 0
    ) {
        return 0;
    }

    const resumeEducation =
        resume.education[0];

    const resumeDegree =
        resumeEducation.degree.toLowerCase();

    const resumeField =
        resumeEducation.field.toLowerCase();

    const requiredEducation =
        job.required_education[0];

    const requiredDegree =
        requiredEducation.degree.toLowerCase();

    const requiredField =
        requiredEducation.field.toLowerCase();


    let score = 0;


    // Degree check
    if (
        resumeDegree.includes("b.tech") ||
        resumeDegree.includes("bachelor") ||
        resumeDegree.includes("b.e")
    ) {

        if (
            requiredDegree.includes("bachelor") ||
            requiredDegree.includes("b.tech") ||
            requiredDegree.includes("b.e")
        ) {
            score += 50;
        }
    }


    // Field check
    if (
        resumeField.includes("computer science") &&
        requiredField.includes("computer science")
    ) {
        score += 50;
    }


    return score;
}


const educationScore =
    calculateEducationScore();


// ------------------------------------
// Experience matching
// ------------------------------------

function calculateExperienceScore() {

    const requiredExperience =
        job.required_experience.toLowerCase();

    // No requirement
    if (!requiredExperience) {
        return 100;
    }


    // If relevant projects are accepted
    if (
        requiredExperience.includes("relevant academic projects")
    ) {

        if (
            resume.projects &&
            resume.projects.length > 0
        ) {
            return 100;
        }
    }


    // If the JD accepts 0 years
    if (
        requiredExperience.includes("0-2") ||
        requiredExperience.includes("0 years")
    ) {

        return 100;
    }


    // Actual work experience exists
    if (
        resume.experience &&
        resume.experience.length > 0
    ) {
        return 100;
    }


    return 0;
}


const experienceScore =
    calculateExperienceScore();


// ------------------------------------
// Project matching
// ------------------------------------

function calculateProjectScore() {

    if (
        !resume.projects ||
        resume.projects.length === 0
    ) {
        return 0;
    }

    if (
        !job.responsibilities ||
        job.responsibilities.length === 0
    ) {
        return 100;
    }


    let matchedProjects = 0;


    for (const project of resume.projects) {

        const projectText =
            (
                project.name +
                " " +
                project.description +
                " " +
                project.technologies.join(" ")
            ).toLowerCase();


        for (const responsibility of job.responsibilities) {

            const words =
                responsibility
                    .toLowerCase()
                    .split(" ");


            let matches = 0;


            for (const word of words) {

                if (
                    word.length > 4 &&
                    projectText.includes(word)
                ) {
                    matches++;
                }
            }


            if (matches >= 2) {
                matchedProjects++;
                break;
            }
        }
    }


    if (matchedProjects === 0) {
        return 0;
    }


    return Math.min(
        (matchedProjects / resume.projects.length) * 100,
        100
    );
}


const projectScore =
    calculateProjectScore();


// ------------------------------------
// Final score BEFORE LLM
// ------------------------------------

const basicFinalScore =
    (
        requiredResult.score * 0.40
        +
        preferredResult.score * 0.10
        +
        educationScore * 0.15
        +
        experienceScore * 0.15
        +
        projectScore * 0.10
    );


// ------------------------------------
// Display results
// ------------------------------------

console.log("\n========================================");
console.log("       SMART RESUME SCREENER");
console.log("========================================");

console.log("\nCandidate:");
console.log(resume.name);


console.log("\n----- REQUIRED SKILLS -----");

console.log("Full Match:");
console.log(requiredResult.fullMatches);

console.log("\nPartial Match:");
console.log(requiredResult.partialMatches);

console.log("\nMissing:");
console.log(requiredResult.missingSkills);

console.log(
    "\nRequired Skill Score:",
    requiredResult.score.toFixed(2) + "%"
);


console.log("\n----- PREFERRED SKILLS -----");

console.log("Full Match:");
console.log(preferredResult.fullMatches);

console.log("\nPartial Match:");
console.log(preferredResult.partialMatches);

console.log("\nMissing:");
console.log(preferredResult.missingSkills);

console.log(
    "\nPreferred Skill Score:",
    preferredResult.score.toFixed(2) + "%"
);


console.log("\n----- OTHER SCORES -----");

console.log(
    "Education Score:",
    educationScore.toFixed(2) + "%"
);

console.log(
    "Experience Score:",
    experienceScore.toFixed(2) + "%"
);

console.log(
    "Project Score:",
    projectScore.toFixed(2) + "%"
);


console.log("\n----- BASIC FINAL SCORE -----");

console.log(
    basicFinalScore.toFixed(2) + "%"
);

console.log("\n========================================\n");