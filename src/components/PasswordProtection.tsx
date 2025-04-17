import { useState } from 'react';

interface PasswordProtectionProps {
  onAuthenticated: () => void;
}

export default function PasswordProtection({ onAuthenticated }: PasswordProtectionProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const correctPassword = process.env.NEXT_PUBLIC_ENTRY_PASSWORD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      // Store authentication in localStorage
      localStorage.setItem('isAuthenticated', 'true');
      onAuthenticated();
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-lg p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6 rounded-full bg-blue-50 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Restricted Access</h1>
          <p className="mt-4 text-center text-gray-600">
            <span className="block">Enter the password to access the dashboard.</span>
            <span className="block mt-1 text-sm text-gray-500">Contact Convert Cake team for assistance.</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={`w-full rounded-xl border-2 bg-white p-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none ${
                error ? 'border-red-400' : 'border-gray-200'
              }`}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-500">Incorrect password. Please try again.</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-gradient-to-r from-blue-600 to-blue-700 py-4 text-white shadow-sm hover:shadow-md transition-all duration-300 ease-out hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 flex items-center justify-center space-x-3 group"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-12" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M14.5 1A4.5 4.5 0 0010 5.5V9H3a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1.5V5.5a3 3 0 116 0v2.75a.75.75 0 001.5 0V5.5A4.5 4.5 0 0014.5 1z" 
                clipRule="evenodd" 
              />
            </svg>
            <span className="text-base transition-transform duration-300 ease-out group-hover:translate-x-0.5">Unlock Access</span>
          </button>
        </form>
      </div>
    </div>
  );
} 