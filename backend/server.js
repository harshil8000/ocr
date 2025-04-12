const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');
const app = express();

// Set up storage for uploaded files (use /tmp directory for Vercel)
const upload = multer({ dest: '/tmp/uploads/' });

// Middleware setup
app.use(cors());
app.use(express.json());

// Ensure /tmp/uploads directory exists
if (!fs.existsSync('/tmp/uploads')) {
    fs.mkdirSync('/tmp/uploads');
}

// Serve the index.html file at the root route
app.get("/", (req, res) => {
    console.log('Serving index.html');
    res.sendFile(path.join(__dirname, '../index.html')); // Ensure index.html is at the root level
});

// Endpoint to extract data from Aadhar file
app.post('/api/extract-aadhar', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log('File uploaded:', req.file.path); // Debug log

    try {
        // Path to the Python script folder
        const scriptPath = path.join(__dirname, '../ocr_scripts'); // Make sure the path is correct

        // PythonShell options
        const options = {
            mode: 'text',
            pythonPath: 'python', // Ensure this points to the correct Python executable
            pythonOptions: ['-u'], // unbuffered output
            scriptPath: scriptPath, // Path to your OCR script folder
            args: [req.file.path]  // Pass uploaded file path to Python script
        };

        // Run Python script to extract data
        PythonShell.run('pdf_aadhar_ocr.py', options, (err, results) => {
            if (err) {
                console.error('PythonShell error:', err); // Log Python errors
                // Clean up uploaded file
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            // Clean up uploaded file after processing
            fs.unlinkSync(req.file.path);

            console.log('Python script results:', results); // Debug log

            if (results && results.length > 0) {
                try {
                    // Assuming results[0] is a JSON string, parse and send back
                    const extractedData = JSON.parse(results[0]);
                    res.json({
                        success: true,
                        data: extractedData
                    });
                } catch (parseError) {
                    console.error('JSON parsing error:', parseError);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to parse extracted data'
                    });
                }
            } else {
                res.status(500).json({
                    success: false,
                    error: 'No data extracted from the file'
                });
            }
        });
    } catch (error) {
        // Clean up uploaded file on unexpected errors
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Unexpected error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Set port to 5000 or environment variable value
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
app.get('/check-python', (req, res) => {
    const { exec } = require('child_process');

    // Run the python3 command to check the version
    exec('python3 --version', (err, stdout, stderr) => {
        if (err) {
            console.error('Error checking Python version:', err);
            res.status(500).send('Error checking Python version');
            return;
        }

        res.send(`Python Version: ${stdout || stderr}`);
    });
});


module.exports = app;
