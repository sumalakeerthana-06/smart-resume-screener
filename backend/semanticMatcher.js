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
        throw new Error("Could not parse structured JSON from semantic matching response: " + err.message);
    }
}

/**
 * Perform semantic matching and fit scoring between parsed resume and job description
 */
async function semanticMatch(resume, job) {
    const prompt = `
You are an expert Talent Acquisition AI and Technical Hiring Specialist.

Compare the candidate's resume with the target job description and evaluate candidate-job fit using semantic understanding, practical competency evaluation, and transferable skills.

EVALUATION CRITERIA:
1. Technical Competencies: Matching languages, frameworks, databases, and domain tools.
2. Educational Background: Degree relevance, field of study, academic alignment.
3. Experience & Project Portfolio: Practical application of required skills, project complexity.
4. Problem Solving & Responsibilities: Ability to fulfill stated core job duties.

SCORING INSTRUCTIONS:
- Rate the overall candidate fit on a scale of 1 to 10 (decimal allowed, e.g. 7.5).
- Also provide an equivalent semantic match percentage from 0 to 100.
- Identify exact strong matches and transferable partial matches.
- Highlight missing critical requirements objectively.
- Provide a clear, objective recruiter justification and recommendations.

JSON STRUCTURE TO RETURN:
{
  "rating_out_of_10": 7.5,
  "semantic_score": 75,
  "strong_matches": [
    "List of strong skill and qualification matches"
  ],
  "partial_matches": [
    "List of transferable skills or partial matches"
  ],
  "missing_requirements": [
    "List of missing required skills or qualifications"
  ],
  "justification": "2-3 sentence clear, objective summary of the candidate's fit.",
  "strengths_summary": [
    "Key highlight 1",
    "Key highlight 2"
  ],
  "recommended_upskilling": [
    "Skill or area to learn to bridge gaps"
  ]
}

CANDIDATE PROFILE:
${JSON.stringify(resume, null, 2)}

JOB REQUIREMENTS:
${JSON.stringify(job, null, 2)}

STRICT RULES:
- Return ONLY valid JSON format.
- No markdown formatting or exterior explanations.
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt
    });

    const result = cleanAndParseJSON(response.text);

    // Ensure safe default values
    const score = Number(result.semantic_score) || (Number(result.rating_out_of_10) * 10) || 50;
    const rating10 = Number(result.rating_out_of_10) || Number((score / 10).toFixed(1)) || 5.0;

    const semanticResult = {
        rating_out_of_10: rating10,
        semantic_score: Math.min(Math.max(score, 0), 100),
        strong_matches: Array.isArray(result.strong_matches) ? result.strong_matches : [],
        partial_matches: Array.isArray(result.partial_matches) ? result.partial_matches : [],
        missing_requirements: Array.isArray(result.missing_requirements) ? result.missing_requirements : [],
        justification: result.justification || "Candidate profile matches core technical requirements.",
        strengths_summary: Array.isArray(result.strengths_summary) ? result.strengths_summary : [],
        recommended_upskilling: Array.isArray(result.recommended_upskilling) ? result.recommended_upskilling : []
    };

    // Cache in data directory
    try {
        fs.writeFileSync(path.join(DATA_DIR, "last_semantic_result.json"), JSON.stringify(semanticResult, null, 2));
    } catch (_) {}

    return semanticResult;
}

module.exports = {
    semanticMatch
};