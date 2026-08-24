const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

async function extractTextFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);

    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    if (typeof parser.destroy === "function") {
        await parser.destroy();
    }

    return data.text;
}

async function main() {
    const pdfPath = path.join(__dirname, "resume.pdf");
    const outTxtPath = path.join(__dirname, "resume.txt");

    const text = await extractTextFromPDF(pdfPath);

    console.log("----- EXTRACTED RESUME TEXT -----");
    console.log(text);

    fs.writeFileSync(outTxtPath, text);

    console.log(`\nResume text saved to ${outTxtPath}`);
}

main();