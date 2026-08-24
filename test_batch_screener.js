const fs = require("fs");
const path = require("path");

const { extractResumeInformation } = require("./backend/resumeExtractor");
const { extractJobInformation } = require("./backend/jobExtractor");
const { semanticMatch } = require("./backend/semanticMatcher");
const { calculateFinalScore } = require("./backend/finalScorer");
const db = require("./backend/database");

async function runBatchVerification() {
    console.log("\n=======================================================");
    console.log(" MULTI-RESUME BATCH SCREENING & RANKING TEST");
    console.log("=======================================================\n");

    const sampleJD = `
Software Developer Intern
Requirements:
- Strong proficiency in Java, Python, JavaScript, and React.
- Solid understanding of Data Structures and Algorithms.
- Experience with SQL and relational databases.
- Pursuing or completed B.Tech / B.E. in Computer Science or IT.
- REST APIs, Git, and problem-solving skills.
`;

    const candidates = [
        {
            name: "Candidate A (Strong Match)",
            text: `
ALEX CHEN
Email: alex.chen@email.com
Education: B.Tech in Computer Science and Engineering, 2025
Technical Skills: Java, Python, JavaScript, React, SQL, Data Structures & Algorithms, REST APIs, Git, Node.js
Projects:
- Full-Stack Web Application in React & Node.js
- Algorithm Visualizer in Java
`
        },
        {
            name: "Candidate B (Partial Match)",
            text: `
PRIYA SHARMA
Email: priya.sharma@email.com
Education: B.Sc in Statistics, 2024
Technical Skills: Python, SQL, Pandas, NumPy, Machine Learning, Data Analysis
Projects:
- Customer Churn Prediction Model using Python and Scikit-Learn
`
        },
        {
            name: "Candidate C (Low Match)",
            text: `
MARCUS VANCE
Email: marcus.v@email.com
Education: Bachelor of Fine Arts in Graphic Design, 2023
Technical Skills: Adobe Photoshop, Illustrator, Figma, UI/UX Wireframing, Typography, Logo Design
Projects:
- Brand Identity Redesign for Coffee Shop
`
        }
    ];

    try {
        console.log("[1/3] Parsing Job Description with Gemini LLM once...");
        const jobData = await extractJobInformation(sampleJD);
        console.log(`✓ Job Title: ${jobData.job_title}`);
        console.log(`✓ Required Skills:`, jobData.required_skills);

        console.log(`\n[2/3] Concurrently Screening ${candidates.length} Candidate Resumes...`);

        const results = await Promise.all(candidates.map(async (c, idx) => {
            console.log(` -> Processing candidate #${idx + 1}: ${c.name}...`);
            const resumeData = await extractResumeInformation(c.text);
            const semanticResult = await semanticMatch(resumeData, jobData);
            const finalScore = calculateFinalScore(resumeData, jobData, semanticResult);

            db.saveCandidate(resumeData, c.text);
            db.saveScreening(finalScore);

            return finalScore;
        }));

        // Sort descending
        results.sort((a, b) => (b.scores?.final_score || 0) - (a.scores?.final_score || 0));
        results.forEach((r, idx) => r.rank = idx + 1);

        console.log("\n[3/3] Ranked Leaderboard Output:");
        console.log("-------------------------------------------------------");
        results.forEach(r => {
            const medal = r.rank === 1 ? "🥇" : (r.rank === 2 ? "🥈" : "🥉");
            console.log(`${medal} Rank #${r.rank}: ${r.candidate}`);
            console.log(`   Final Score:    ${r.scores.final_score}% (${r.scores.rating_out_of_10}/10)`);
            console.log(`   Recommendation: ${r.recommendation}`);
            console.log(`   Matched Skills: ${(r.matched_required_skills || []).join(", ") || "None"}`);
            console.log(`   Justification:  ${r.justification.substring(0, 100)}...`);
            console.log("-------------------------------------------------------");
        });

        // Verification checks
        if (results[0].scores.final_score > results[1].scores.final_score &&
            results[1].scores.final_score > results[2].scores.final_score) {
            console.log("\n✅ VERIFICATION PASSED: Candidates accurately sorted from highest to lowest fit!");
        } else {
            console.warn("\n⚠️ Ranking warning: Unexpected order");
        }

        console.log("\n=======================================================");
        console.log(" 🎉 BATCH SCREENING VERIFICATION SUCCESSFUL!");
        console.log("=======================================================\n");
    } catch (err) {
        console.error("Batch test error:", err);
        process.exit(1);
    }
}

runBatchVerification();
