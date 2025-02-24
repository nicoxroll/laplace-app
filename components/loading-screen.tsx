"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  const [showDelayMessage, setShowDelayMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  useEffect(() => {
    // Show "taking longer than expected" message after 3 seconds
    const delayTimeout = setTimeout(() => {
      setShowDelayMessage(true);
    }, 3000);

    // Show error message after 10 seconds
    const errorTimeout = setTimeout(() => {
      setShowErrorMessage(true);
    }, 10000);

    return () => {
      clearTimeout(delayTimeout);
      clearTimeout(errorTimeout);
    };
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0d1117]">
      <div className="flex flex-col items-center gap-4 max-w-md text-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        
        <div className="space-y-2">
          <p className="text-gray-200">Loading your workspace...</p>
          
          {showDelayMessage && (
            <p className="text-sm text-gray-400">
              This is taking longer than expected...
            </p>
          )}
          
          {showErrorMessage && (
            <div className="mt-4 p-4 bg-red-500/10 rounded-lg">
              <p className="text-sm text-red-400">
                Having trouble connecting? Try:
              </p>
              <ul className="text-sm text-gray-400 list-disc list-inside mt-2">
                <li>Refreshing the page</li>
                <li>Checking your internet connection</li>
                <li>Signing out and back in</li>
              </ul>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}