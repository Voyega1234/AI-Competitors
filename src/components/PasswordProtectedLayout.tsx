'use client';

import { useState, useEffect } from 'react';
import PasswordProtection from './PasswordProtection';

interface PasswordProtectedLayoutProps {
  children: React.ReactNode;
}

export default function PasswordProtectedLayout({ children }: PasswordProtectedLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(authStatus === 'true');
    setIsLoading(false);
  }, []);

  // Handle successful authentication
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-lg p-8 shadow-xl">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-6 rounded-full bg-blue-50 p-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Loading</h1>
            <p className="mt-4 text-center text-gray-600">
              <span className="block">Please wait while we prepare your dashboard.</span>
              <span className="block mt-1 text-sm text-gray-500">This may take a moment...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show password screen if not authenticated
  if (!isAuthenticated) {
    return <PasswordProtection onAuthenticated={handleAuthenticated} />;
  }

  // Show main content if authenticated
  return <>{children}</>;
} 