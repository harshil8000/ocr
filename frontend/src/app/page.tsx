import React from 'react';
import AadharVerification from '../components/AadharVerification';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Aadhar Card Verification
        </h1>
        <AadharVerification />
      </div>
    </div>
  );
}