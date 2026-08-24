require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Safely parse JSON from LLM text response
 */
function cleanAndParseJSON(responseText) {
    let text = responseText.trim();

    // Remove markdown code blocks if present
    if (text.startsWith("```json")) {
        text = text.replace(/^```json\s*/i, "");
    } else if (text.startsWith("```")) {
        text = text.replace(/^```\s*/i, "");
    }
    if (text.endsWith("```")) {
        text = text.replace(/```\s*$/i, "");
    }
    text = text.trim();

    try {
        return JSON.parse(text);
    } catch (err) {
        // Fallback regex attempt for JSON object
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        throw new Error("Could not parse structured JSON from LLM response: " + err.message);
    }
}

/**
 * Extract structured candidate information from resume text using Gemini LLM
 */
async function extractResumeInformation(resumeText) {
    if (!resumeText || typeof resumeText !== "string" || !resumeText.trim()) {
        throw new Error("Resume text is empty or invalid.");
    }

    const prompt = `
You are an expert AI Resume Parsing System.

Analyze the following resume text and extract comprehensive structured candidate information in valid JSON format.

FIELDS TO EXTRACT:
1. "name": Candidate's full name (string)
2. "email": Candidate email if present (string or empty)
3. "phone": Candidate phone if present (string or empty)
4. "skills": List of technical skills, programming languages, frameworks, libraries, databases, cloud tools, DevOps, and technical methodologies (array of strings)
5. "languages_known": Spoken/natural languages such as English, Spanish, Telugu, Hindi, etc. (array of strings)
6. "education": List of degrees/qualifications (array of objects with "degree", "field", "institution", "year", "grade")
7. "experience": List of professional experiences/internships (array of objects with "company", "role", "duration", "description", "technologies")
8. "projects": List of notable projects (array of objects with "name", "description", "technologies")
9. "summary": Brief professional profile summary (string)

STRICT RULES:
- Extract only information explicitly present or directly verifiable in the resume.
- Do NOT invent or hallucinate skills.
- Do NOT include spoken languages (like English, Spanish) in the "skills" list; put them in "languages_known".
- Return ONLY a valid JSON object. Do not include markdown code block formatting or explanations.

RESUME TEXT:
${resumeText}
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt
    });

    const resumeData = cleanAndParseJSON(response.text);

    // Ensure safe default structures
    resumeData.name = resumeData.name || "Candidate";
    resumeData.skills = Array.isArray(resumeData.skills) ? resumeData.skills : [];
    resumeData.languages_known = Array.isArray(resumeData.languages_known) ? resumeData.languages_known : [];
    resumeData.education = Array.isArray(resumeData.education) ? resumeData.education : [];
    resumeData.experience = Array.isArray(resumeData.experience) ? resumeData.experience : [];
    resumeData.projects = Array.isArray(resumeData.projects) ? resumeData.projects : [];

    // Persist cache inside data directory
    try {
        fs.writeFileSync(path.join(DATA_DIR, "last_resume.json"), JSON.stringify(resumeData, null, 2));
    } catch (_) {}

    return resumeData;
}

module.exports = {
    extractResumeInformation
};