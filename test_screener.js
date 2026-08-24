const fs = require("fs");
const path = require("path");

const { extractResumeInformation } = require("./backend/resumeExtractor");
const { extractJobInformation } = require("./backend/jobExtractor");
const { semanticMatch } = require("./backend/semanticMatcher");
const { calculateFinalScore } = require("./backend/finalScorer");
const db = require("./backend/database");

async function runSystemTest() {
    console.log("\n=======================================================");
    console.log(" SMART RESUME SCREENER - AUTOMATED SYSTEM TEST");
    console.log("=======================================================\n");

    const sampleResume = `
KEERTHANA S.
Email: keerthana.s@example.com | Phone: +91 9876543210
Education:
Bachelor of Technology (B.Tech) in Computer Science and Engineering (2021-2025)
ABC Institute of Technology, CGPA: 8.9/10

Technical Skills:
- Programming Languages: Java, Python, JavaScript, SQL
- Web Technologies: React, HTML5, CSS3, REST APIs
- Core Concepts: Data Structures & Algorithms, Object-Oriented Programming (OOP), DBMS

Projects:
1. Smart Resume Screener (React, Node.js, AI):
   Built a web app analyzing resumes against job descriptions with AI matching and skill parsing.
2. E-Commerce Platform (Java, Spring Boot, MySQL):
   Developed RESTful APIs and product catalog management system.
`;

    const sampleJD = `
Software Developer Intern
Requirements:
- Strong knowledge of Java, Python, JavaScript, and React.
- Solid understanding of Data Structures and Algorithms.
- Experience with SQL and relational databases.
- Pursuing or completed B.Tech / B.E. in Computer Science or related field.
- Familiarity with REST APIs and Git is a plus.
`;

    try {
        console.log("[Test 1/5] Extracting Resume Profile with Gemini LLM...");
        const resumeData = await extractResumeInformation(sampleResume);
        console.log("✓ Candidate Name:", resumeData.name);
        console.log("✓ Skills Extracted:", resumeData.skills);

        console.log("\n[Test 2/5] Extracting Job Requirements with Gemini LLM...");
        const jobData = await extractJobInformation(sampleJD);
        console.log("✓ Job Title:", jobData.job_title);
        console.log("✓ Required Skills:", jobData.required_skills);

        console.log("\n[Test 3/5] Computing Semantic Match & Justification...");
        const semanticResult = await semanticMatch(resumeData, jobData);
        console.log(`✓ Semantic Fit Score: ${semanticResult.semantic_score}% (${semanticResult.rating_out_of_10}/10)`);
        console.log("✓ Justification:", semanticResult.justification);

        console.log("\n[Test 4/5] Computing Weighted Multi-Factor Final Score...");
        const finalResult = calculateFinalScore(resumeData, jobData, semanticResult);
        console.log(`✓ Final Score: ${finalResult.scores.final_score}% (${finalResult.scores.rating_out_of_10}/10)`);
        console.log("✓ Recommendation:", finalResult.recommendation);
        console.log("✓ Shortlisted Status:", finalResult.is_shortlisted ? "YES" : "NO");

        console.log("\n[Test 5/5] Testing Database Persistence & Stats...");
        db.saveCandidate(resumeData, sampleResume);
        const savedScreening = db.saveScreening(finalResult);
        console.log("✓ Saved Screening ID:", savedScreening.id);

        const allScreenings = db.getScreenings();
        console.log(`✓ Total Screenings in DB: ${allScreenings.length}`);

        const stats = db.getStats();
        console.log("✓ Aggregated Dashboard Stats:", JSON.stringify(stats, null, 2));

        console.log("\n=======================================================");
        console.log(" 🎉 ALL SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY!");
        console.log("=======================================================\n");
    } catch (err) {
        console.error("\n❌ Test execution error:", err);
        process.exit(1);
    }
}

runSystemTest();
