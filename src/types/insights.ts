export interface StrategicIdea {
  category: "Marketing" | "Product" | "Pricing" | "Customer Service" | "Other";
  title: string;
  description: string;
  targetCompetitors?: string[]; // Optional: List of competitor names this idea specifically targets
  rationale: string; // Why this idea is relevant based on the analysis
}

export interface StrategicInsights {
  analysisSummary: string; // Overall summary of the competitive landscape and key opportunities
  strategicIdeas: StrategicIdea[];
} 