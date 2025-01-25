"use client";
import React, { useState, useRef } from 'react';

const AadharPDFVerification = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection and preview
  const handleFileChange = (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPdfFile(file);
      setPdfPreview(reader.result);
    };
    reader.onerror = () => {
      setError('Failed to read the PDF file');
    };
    reader.readAsDataURL(file);
  };

  // Handle file verification process
  const handleVerification = async () => {
    if (!pdfFile) {
      setError('Please upload an Aadhar card PDF');
      return;
    }

    const formData = new FormData();
    formData.append('pdf_file', pdfFile);

    setIsLoading(true);
    setError(null);

    try {
      // Make API call directly from the frontend
      const response = await fetch('http://localhost:5000/api/aadhar-pdf-verify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Verification failed: ${errorText}`);
      }

      const result = await response.json();
      console.log(result); // Check the structure of the result object

      // Handle successful verification result
      if (result.status === 'VERIFIED') {
        setVerificationResult(result);
        setError(null);
      } else {
        setError(result.error || 'Verification failed');
        setVerificationResult(null);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message);
      setVerificationResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear selected file and preview
  const clearFile = () => {
    setPdfFile(null);
    setPdfPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="mb-4">
        <label className="block mb-2">Upload Aadhar PDF</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => handleFileChange(e.target.files[0])}
          className="w-full p-2 border rounded"
        />

        {pdfPreview && (
          <div className="mt-2 relative">
            <embed
              src={pdfPreview}
              type="application/pdf"
              className="w-full h-40 object-cover rounded"
            />
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleVerification}
        disabled={!pdfFile || isLoading}
        className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600 disabled:bg-blue-300"
      >
        {isLoading ? 'Verifying...' : 'Verify Aadhar PDF'}
      </button>

      {error && (
        <div className="mt-4 bg-red-100 p-4 rounded text-red-700">
          {error}
        </div>
      )}

      {verificationResult && (
        <div className="mt-4 bg-green-100 p-4 rounded">
          <h2 className="font-bold text-green-800">Verification Successful</h2>
          <p>Aadhar Numbers: {verificationResult.front_details.aadhar_numbers.join(', ')}</p>
          <p>Potential Names: {verificationResult.front_details.names.join(', ')}</p>
        </div>
      )}
    </div>
  );
};

export default AadharPDFVerification;
