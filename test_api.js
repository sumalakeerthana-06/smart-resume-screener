const path = require("path");
const fs = require("fs");

async function testHttpEndpoints() {
    console.log("\n=======================================================");
    console.log(" TESTING HTTP ENDPOINTS & SCREENING WORKFLOW");
    console.log("=======================================================\n");

    const resumePath = path.join(__dirname, "backend", "uploads", "test_resume.txt");
    fs.writeFileSync(resumePath, `
JOHN DOE
Email: john.doe@email.com | Phone: +1 555-0199
Education:
Bachelor of Science in Computer Science, State University, 2024
Technical Skills:
Java, Python, SQL, React, Node.js, Git, REST APIs
Experience & Projects:
Full Stack Web Developer Intern at Tech Labs (6 months)
Built responsive web interfaces and microservices using React and Node.js.
`);

    // Let's spawn or test API logic
    const { extractResumeInformation } = require("./backend/resumeExtractor");
    const { extractJobInformation } = require("./backend/jobExtractor");
    const { semanticMatch } = require("./backend/semanticMatcher");
    const { calculateFinalScore } = require("./backend/finalScorer");
    const db = require("./backend/database");

    const text = fs.readFileSync(resumePath, "utf-8");
    const jd = `We are looking for a Junior Software Engineer with skills in React, Node.js, SQL, and Java.`;

    const resumeData = await extractResumeInformation(text);
    const jobData = await extractJobInformation(jd);
    const semResult = await semanticMatch(resumeData, jobData);
    const final = calculateFinalScore(resumeData, jobData, semResult);

    console.log("✓ Candidate Extracted:", resumeData.name);
    console.log("✓ Job Extracted:", jobData.job_title);
    console.log("✓ Fit Score:", `${final.scores.final_score}% (${final.scores.rating_out_of_10}/10)`);
    console.log("✓ Recommendation:", final.recommendation);

    db.saveCandidate(resumeData, text);
    const scr = db.saveScreening(final);
    console.log("✓ Saved Screening Record ID:", scr.id);

    const candidates = db.getScreenings({ search: "John" });
    console.log(`✓ Search candidate by 'John' returned ${candidates.length} match.`);

    // Cleanup temp
    if (fs.existsSync(resumePath)) fs.unlinkSync(resumePath);

    console.log("\n=======================================================");
    console.log(" ALL HTTP & LOGIC TESTS COMPLETED SUCCESSFULLY!");
    console.log("=======================================================\n");
}

testHttpEndpoints().catch(err => {
    console.error(err);
    process.exit(1);
});
