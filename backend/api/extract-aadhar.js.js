const multer = require('multer');
const cors = require('cors');
const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');

// Set up multer to save uploaded files to '/tmp/uploads/'
const upload = multer({ dest: '/tmp/uploads/' }); // Vercel allows writing to /tmp

module.exports = async (req, res) => {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle POST request to upload file and process with Python
  if (req.method === 'POST') {
    // Use multer to handle file uploads
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: 'File upload error' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      console.log('File uploaded:', req.file.path); // Debug log

      try {
        // Path to the Python script
        const scriptPath = path.join(__dirname, '../ocr_scripts'); // Resolves path to ocr_scripts folder

        const options = {
          mode: 'text',
          pythonPath: 'python3', // Ensure this points to the correct Python executable
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
              return res.status(200).json({
                success: true,
                data: extractedData
              });
            } catch (parseError) {
              console.error('JSON parsing error:', parseError);
              return res.status(500).json({
                success: false,
                error: 'Failed to parse extracted data'
              });
            }
          } else {
            return res.status(500).json({
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
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  } else {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
};
