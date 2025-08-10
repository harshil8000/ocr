import express from 'express';
import { IncomingForm } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Config to disable default body parsing to handle file uploads with formidable
router.post('http://localhost:5000/aadhar-pdf-verify', (req, res) => {
    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("Error parsing form:", err);  // Log error for debugging
            return res.status(500).json({ status: 'FAILED', error: 'File upload failed' });
        }

        const pdfFile = files.pdf_file;

        if (!pdfFile) {
            return res.status(400).json({ status: 'FAILED', error: 'No file uploaded' });
        }

        try {
            const scriptPath = path.join(process.cwd(), 'backend', 'ocr_scripts', 'pdf_aadhar_ocr.py');

            // Ensure the file exists in the server before passing it to the Python script
            if (!fs.existsSync(pdfFile.filepath)) {
                return res.status(400).json({ status: 'FAILED', error: 'File does not exist' });
            }

            const result = await new Promise((resolve, reject) => {
                exec(`python3 ${scriptPath} "${pdfFile.filepath}"`, (error, stdout, stderr) => {
                    if (error || stderr) {
                        console.error("Python script execution error:", stderr || error);  // Log error for debugging
                        return reject(new Error(stderr || error));
                    }
                    resolve(JSON.parse(stdout));
                });
            });

            // Send the result back to the client
            res.status(200).json(result);
        } catch (error) {
            console.error("Error:", error.message);  // Log error for debugging
            res.status(500).json({ status: 'FAILED', error: error.message });
        }
    });
});

export default router;
