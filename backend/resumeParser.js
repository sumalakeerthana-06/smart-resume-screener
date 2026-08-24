const fs = require("fs");
const { PDFParse } = require("pdf-parse");

async function extractTextFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);

    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();

    return data.text;
}

async function main() {
    const text = await extractTextFromPDF("./resume.pdf");

    console.log("----- EXTRACTED RESUME TEXT -----");
    console.log(text);

    fs.writeFileSync("./resume.txt", text);

    console.log("\nResume text saved to resume.txt");
}

main();