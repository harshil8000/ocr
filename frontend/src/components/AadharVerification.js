"use client"
import { useState, useCallback } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
// import { Alert, AlertDescription } from '@/components/ui/alert';


export default function Home() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = (selectedFiles) => {
    const newFiles = selectedFiles.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );

    setFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setResults(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const allResults = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('https://ocr-production-75fe.up.railway.app/api/extract-aadhar', {
            // const response = await fetch('http://localhost:5000/api/extract-aadhar', {

            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          return data;
        })
      );

      setResults(allResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ResultCard = ({ result, index }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Page {index + 1} Results</h3>
      {result.success ? (
        !result.data?.aadhar_number && !result.data?.name && !result.data?.dob && !result.data?.gender ? (
          <div className="text-gray-600 text-sm">
            <h4 className="font-medium text-gray-800 mb-2">Raw Extracted Text</h4>
            <pre className="whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-lg">
              {result.data?.raw_text || 'No text extracted'}
            </pre>
          </div>
        ) : (
          <dl className="space-y-3">
            {['name', 'aadhar_number', 'dob', 'gender'].map((field) => (
              <div key={field} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <dt className="font-medium text-gray-800 capitalize">{field.replace('_', ' ')}:</dt>
                <dd className="text-gray-600">{result.data?.[field] || 'Not found'}</dd>
              </div>
            ))}
          </dl>
        )
      ) : (
        // <Alert variant="destructive">
          // <AlertCircle className="h-4 w-4" />
          // <AlertDescription>
          <div>
            Failed to process this page: {result.error}
            </div>
          // </AlertDescription>
        // </Alert>
      )}
    </div>
  );

  return (
    <div className="` w-[100%] bg-gradient-to-br from-violet-100 via-indigo-50 to-cyan-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl p-8">
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-8">
            Aadhar Card OCR Scanner
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out
                ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
            >
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports images and PDF files
              </p>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      <FileText className="inline h-4 w-4 mr-1" />
                      Page {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={files.length === 0 || loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Extract Details
                </>
              )}
            </button>
          </form>

          {error && (
            // <Alert variant="destructive" className="mt-6">
              // <AlertCircle className="h-4 w-4" />
              // <AlertDescription>
                {error}
                // </AlertDescription>
            // </Alert>
          )}

          {results.length > 0 && (
            <div className="mt-8 space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Extracted Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((result, index) => (
                  <ResultCard key={index} result={result} index={index} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}