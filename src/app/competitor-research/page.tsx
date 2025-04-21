"use client";

import React, { useState } from 'react';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button';
import { NewAnalysisForm } from '@/components/new-analysis-form';
import { CompetitorTable } from '@/components/competitor-table';
import { RecommendationCards } from '@/components/recommendation-cards';
import { Search, LayoutGrid, Lightbulb, Loader2, Home } from 'lucide-react'; // Import icons including Home
import type { NewAnalysisFormData } from '@/components/new-analysis-form';
import { Competitor } from '@/components/competitor-table'; // Assuming Competitor type is exported from here

// Type for the active section
type ResearchSection = 'new-analysis' | 'competitors' | 'recommendations';

export default function CompetitorResearchPage() {
  const [activeSection, setActiveSection] = useState<ResearchSection>('new-analysis');
  
  // State for CompetitorTable data (results from NewAnalysisForm)
  const [analysisCompetitors, setAnalysisCompetitors] = useState<Competitor[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Handler for when NewAnalysisForm submits
  const handleStartAnalysis = async (formData: NewAnalysisFormData) => {
    console.log("Starting analysis with data:", formData);
    setIsAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisCompetitors([]);
    setActiveSection('competitors'); // Switch view to table while loading

    try {
      const response = await fetch('/api/jina-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      console.log("Analysis successful, received competitors:", result.competitors);
      // TODO: Ensure the CompetitorResult[] from API matches Competitor[] expected by table
      // This might require mapping or adjusting types as done previously.
      // For now, assume direct assignment works or needs adjustment:
      setAnalysisCompetitors(result.competitors || []);

    } catch (error: any) {
      console.error("Analysis failed:", error);
      setAnalysisError(error.message || "Failed to fetch competitor analysis.");
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'new-analysis':
        return <NewAnalysisForm onSubmitAnalysis={handleStartAnalysis} isLoading={isAnalysisLoading} />;
      case 'competitors':
        // Pass the fetched competitors, loading state, and error to the table
        return (
          <CompetitorTable 
            initialCompetitors={analysisCompetitors} 
            // Pass isLoading and error if CompetitorTable accepts them
            // isLoading={isAnalysisLoading} 
            // error={analysisError}
          />
        );
      case 'recommendations':
        return <RecommendationCards />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen max-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col p-4 space-y-3">
        <div className="flex items-center justify-between mb-4"> {/* Header for title and home button */}
          <h2 className="text-xl font-semibold text-gray-800">Competitor Research</h2>
          <Link href="/home" passHref>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Button>
          </Link>
        </div>
        
        <Button
          variant={activeSection === 'new-analysis' ? 'secondary' : 'ghost'}
          className="justify-start gap-2"
          onClick={() => setActiveSection('new-analysis')}
        >
          <Search className="h-4 w-4" />
          New Analysis
        </Button>

        <Button
          variant={activeSection === 'competitors' ? 'secondary' : 'ghost'}
          className="justify-start gap-2"
          onClick={() => setActiveSection('competitors')}
          // Disable if no analysis has been run yet?
        >
          <LayoutGrid className="h-4 w-4" />
          Competitors
        </Button>

        <Button
          variant={activeSection === 'recommendations' ? 'secondary' : 'ghost'}
          className="justify-start gap-2"
          onClick={() => setActiveSection('recommendations')}
          // Disable if no analysis has been run yet?
        >
          <Lightbulb className="h-4 w-4" />
          Recommendations
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-auto">
        {renderSection()}
      </div>
    </div>
  );
} 