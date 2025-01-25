const express = require('express');
const { exec } = require('child_process');

const router = express.Router();

// Helper function to execute Python scripts
const runPythonScript = (scriptPath, args = '') =>
  new Promise((resolve, reject) => {
    exec(`python ${scriptPath} ${args}`, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || 'Error executing the Python script');
      } else {
        resolve(stdout);
      }
    });
  });

// Aadhaar verification route
router.post('/verify', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }

  try {
    const scriptOutput = await runPythonScript('ocr_scripts/pdf_aadhar_ocr.py', filePath);
    const result = JSON.parse(scriptOutput); // Parse JSON output from Python script
    res.status(200).json({ status: 'VERIFIED', data: result });
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).json({ status: 'FAILED', error: 'Failed to process Aadhaar file' });
  }
});

module.exports = router;
