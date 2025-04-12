const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.post('/api/extract-aadhar', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log('File uploaded:', req.file.path); // Debug log

    try {
        // Path to the Python script
        const scriptPath = path.join(__dirname, 'ocr_scripts'); // Resolves path to ocr_scripts folder

        const options = {
            mode: 'text',
            pythonPath: 'python', // Ensure this is pointing to the correct Python executable
            pythonOptions: ['-u'], // unbuffered output
            scriptPath: scriptPath, // The path to the folder containing your python script
            args: [req.file.path]  // The uploaded file
        };

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

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            console.log('Python script results:', results); // Debug log

            if (results && results.length > 0) {
                try {
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
        // Clean up uploaded file
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
