const { IncomingForm } = require('formidable');
const { exec } = require('child_process');
const path = require('path');

module.exports = function (app) {
    app.post('/api/aadhar-pdf-verify', (req, res) => {
        const form = new IncomingForm();

        // Disable the default body parser to handle the file upload with Formidable
        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form:", err);
                return res.status(500).json({ status: 'FAILED', error: 'File upload failed' });
            }

            const pdfFile = files.pdf_file;
            if (!pdfFile) {
                return res.status(400).json({ status: 'FAILED', error: 'No file uploaded' });
            }

            // Log the correct file path here to verify it's being passed correctly
            console.log("PDF File Path:", pdfFile.filepath);

            // Specify the path to the Python script
            const scriptPath = path.join(__dirname, '..', 'ocr_scripts', 'pdf_aadhar_ocr.py');

            // Ensure the Python command is correct (for Windows, we use 'python' instead of 'python3')
            const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

            // Set a timeout for the Python script execution
            const timeout = setTimeout(() => {
                res.status(500).json({ status: 'FAILED', error: 'Request timed out' });
            }, 10000); // Timeout after 10 seconds

            try {
                const result = await new Promise((resolve, reject) => {
                    // Ensure the file path is correct before passing to Python
                    if (!pdfFile.filepath) {
                        reject(new Error("File path is undefined"));
                        return;
                    }

                    exec(`${pythonCommand} ${scriptPath} "${pdfFile.filepath}"`, (error, stdout, stderr) => {
                        clearTimeout(timeout); // Clear timeout if execution succeeds
                        if (error || stderr) {
                            console.error("Error executing Python script:", error || stderr);
                            reject(new Error("Error executing Python script"));
                            return;
                        }
                        try {
                            const output = JSON.parse(stdout);
                            resolve(output);
                        } catch (parseError) {
                            reject(new Error("Error parsing Python script output"));
                        }
                    });
                });

                res.status(200).json(result); // Return successful result
            } catch (error) {
                console.error("Error:", error.message);
                res.status(500).json({ status: 'FAILED', error: error.message });
            }
        });
    });
};
