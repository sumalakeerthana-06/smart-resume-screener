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
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        throw new Error("Could not parse structured JSON from job extraction response: " + err.message);
    }
}

/**
 * Extract structured job requirements from job description text using Gemini LLM
 */
async function extractJobInformation(jobText) {
    if (!jobText || typeof jobText !== "string" || !jobText.trim()) {
        throw new Error("Job description is empty or invalid.");
    }

    const prompt = `
You are an expert Technical Job Requirements Analyzer.

Analyze the following Job Description and extract structured requirements into a valid JSON object.

FIELDS TO EXTRACT:
1. "job_title": The designated role or position title (string)
2. "required_skills": Mandatory/must-have technical skills, tools, languages, frameworks (array of strings)
3. "preferred_skills": Good-to-have/bonus skills, secondary tools, preferred certifications (array of strings)
4. "required_education": Required degrees/fields (array of objects with "degree", "field")
5. "required_experience": Experience level requirement e.g. "0-2 years", "Entry Level", "3+ years" (string)
6. "responsibilities": Key day-to-day job duties and responsibilities (array of strings)
7. "domain": Primary industry or technical domain e.g. "Web Development", "AI/ML", "Cloud" (string)

STRICT RULES:
- Extract ONLY what is explicitly specified or clearly stated in the job description.
- Clearly separate mandatory (required) vs bonus (preferred) skills.
- Return ONLY valid JSON format without markdown code fences or conversational text.

JOB DESCRIPTION:
${jobText}
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt
    });

    const jobData = cleanAndParseJSON(response.text);

    // Ensure safe default structures
    jobData.job_title = jobData.job_title || "Job Position";
    jobData.required_skills = Array.isArray(jobData.required_skills) ? jobData.required_skills : [];
    jobData.preferred_skills = Array.isArray(jobData.preferred_skills) ? jobData.preferred_skills : [];
    jobData.required_education = Array.isArray(jobData.required_education) ? jobData.required_education : [];
    jobData.required_experience = jobData.required_experience || "";
    jobData.responsibilities = Array.isArray(jobData.responsibilities) ? jobData.responsibilities : [];

    // Persist cache in data directory
    try {
        fs.writeFileSync(path.join(DATA_DIR, "last_job.json"), JSON.stringify(jobData, null, 2));
    } catch (_) {}

    return jobData;
}

module.exports = {
    extractJobInformation
};