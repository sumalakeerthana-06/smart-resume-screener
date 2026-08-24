require("dotenv").config();

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = 3000;


// ------------------------------------
// Middleware
// ------------------------------------

app.use(express.json());


// ------------------------------------
// File upload configuration
// ------------------------------------

const upload = multer({
    dest: "uploads/"
});


// ------------------------------------
// Home route
// ------------------------------------

app.get("/", (req, res) => {

    res.json({
        message: "Smart Resume Screener API is running"
    });

});


// ------------------------------------
// Existing result route
// ------------------------------------

app.get("/result", (req, res) => {

    try {

        const result = JSON.parse(
            fs.readFileSync("./finalResult.json", "utf-8")
        );

        res.json(result);

    } catch (error) {

        res.status(404).json({
            error: "Screening result not found."
        });

    }

});


// ------------------------------------
// Upload route
// ------------------------------------

app.post(
    "/upload",
    upload.single("resume"),
    (req, res) => {

        try {

            // Check whether file was uploaded
            if (!req.file) {

                return res.status(400).json({
                    error: "Please upload a resume PDF."
                });

            }


            // Check file type
            const extension =
                path.extname(req.file.originalname)
                    .toLowerCase();

            if (extension !== ".pdf") {

                fs.unlinkSync(req.file.path);

                return res.status(400).json({
                    error: "Only PDF resumes are allowed."
                });

            }


            console.log("\nResume uploaded:");
            console.log(req.file.originalname);


            // Rename uploaded file
            const newPath =
                "./uploads/resume.pdf";

            fs.renameSync(
                req.file.path,
                newPath
            );


            // Get job description
            const jobDescription =
                req.body.jobDescription;


            if (!jobDescription) {

                return res.status(400).json({
                    error: "Job description is required."
                });

            }


            // Save job description
            fs.writeFileSync(
                "./jobDescription.txt",
                jobDescription
            );


            res.json({

                message: "Resume and job description uploaded successfully.",

                resume: req.file.originalname,

                jobDescriptionReceived: true

            });

        }

        catch (error) {

            console.error(error);

            res.status(500).json({
                error: "Something went wrong while uploading."
            });

        }

    }
);


// ------------------------------------
// Start server
// ------------------------------------

app.listen(PORT, () => {

    console.log(
        `\nSmart Resume Screener running at http://localhost:${PORT}`
    );

});