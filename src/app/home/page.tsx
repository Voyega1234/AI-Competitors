"use client" // Add this if client-side interactions like navigation are needed

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Removed lucide-react imports

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-12 text-center">Welcome</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Competitor Ad Intelligence Card */}
        <div className="border border-gray-200 rounded-lg p-6 text-center flex flex-col items-center hover:shadow-sm transition-shadow duration-200">
          <h2 className="text-2xl font-semibold mb-3">
            <span role="img" aria-label="chart" className="mr-2">📊</span>
            Competitor Ad Intelligence
          </h2>
          <p className="text-gray-600 mb-6 flex-grow">
            Analyze competitor Facebook ads and organic posts. View trends, activities, and engagement insights.
          </p>
          <Link href="/competitor-ads" passHref>
            <Button variant="outline" className="border-gray-800 text-gray-800 hover:bg-gray-100">
              Go to Ad Intelligence
            </Button>
          </Link>
        </div>

        {/* Competitor Research Card */}
        <div className="border border-gray-200 rounded-lg p-6 text-center flex flex-col items-center hover:shadow-sm transition-shadow duration-200">
          <h2 className="text-2xl font-semibold mb-3">
            <span role="img" aria-label="magnifying glass" className="mr-2">🔍</span>
            Competitor Research
          </h2>
          <p className="text-gray-600 mb-6 flex-grow">
            Perform deep competitor analysis, view detailed comparisons, and generate strategic recommendations.
          </p>
          <Link href="/competitor-research" passHref>
            <Button variant="outline" className="border-gray-800 text-gray-800 hover:bg-gray-100">
              Go to Research
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 