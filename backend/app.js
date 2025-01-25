const express = require('express');
const { IncomingForm } = require('formidable');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS (important if frontend and backend are on different ports)
app.use(cors());

// Set up the route to handle file uploads and run the Python script
app.post('/api/aadhar-pdf-verify', (req, res) => {
    const form = new IncomingForm();
  
    let responseSent = false;  // Flag to track if response is already sent
  
    // Disable the default body parser to handle file uploads with Formidable
    form.parse(req, async (err, fields, files) => {
      if (err) {
        if (!responseSent) {
          console.error("Error parsing form:", err);
          res.status(500).json({ status: 'FAILED', error: 'File upload failed' });
          responseSent = true;
        }
        return;
      }
  
      // Log the entire files object to see its structure
      console.log('Uploaded Files:', files);
  
      // Access the file from the array
      const pdfFile = files.pdf_file[0]; // Access the first item in the array
  
      if (!pdfFile) {
        if (!responseSent) {
          res.status(400).json({ status: 'FAILED', error: 'No file uploaded' });
          responseSent = true;
        }
        return;
      }
  
      // Log the file details to inspect the full structure of the file object
      console.log('PDF File Details:', pdfFile);
  
      // Verify if the file path is correctly set
      const filePath = pdfFile.filepath;
      console.log('File Path:', filePath);  // Log the file path
  
      if (!filePath) {
        if (!responseSent) {
          res.status(400).json({ status: 'FAILED', error: 'Invalid file path' });
          responseSent = true;
        }
        return;
      }
  
      // Specify the path to the Python script
      const scriptPath = path.join(__dirname, '..', 'ocr_scripts', 'pdf_aadhar_ocr.py').replace(/\\/g, '/');

      // Set a timeout for the Python script execution
      const timeout = setTimeout(() => {
        if (!responseSent) {
          res.status(500).json({ status: 'FAILED', error: 'Request timed out' });
          responseSent = true;
        }
      }, 10000); // Timeout after 10 seconds
  
      try {
        const result = await new Promise((resolve, reject) => {
          exec(`python "${scriptPath}" "${filePath}"`, (error, stdout, stderr) => {
            clearTimeout(timeout); // Clear timeout if execution succeeds
            if (error || stderr) {
              console.error("Error executing Python script:", error || stderr);
              if (!responseSent) {
                res.status(500).json({ status: 'FAILED', error: "Error executing Python script" });
                responseSent = true;
              }
              reject(new Error("Error executing Python script"));
              return;
            }
            try {
              const output = JSON.parse(stdout);
              resolve(output);
            } catch (parseError) {
              console.error("Error parsing Python script output:", parseError);
              if (!responseSent) {
                res.status(500).json({ status: 'FAILED', error: "Error parsing Python script output" });
                responseSent = true;
              }
              reject(new Error("Error parsing Python script output"));
            }
          });
        });
  
        if (!responseSent) {
          res.status(200).json(result); // Return successful result
          responseSent = true;
        }
      } catch (error) {
        console.error("Error:", error.message);
        if (!responseSent) {
          res.status(500).json({ status: 'FAILED', error: error.message });
          responseSent = true;
        }
      }
    });
  });

// Test route
app.get('/api/me', (req, res) => {
  console.log('hello');
  res.send('Hello, World!');
});

// Start server
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
