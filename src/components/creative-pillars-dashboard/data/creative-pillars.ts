// Define creative pillars for content strategy
export const creativePillars = [
  {
    id: "educational",
    name: "Educational",
    description: "Educates users about a topic related to the product.",
  },
  {
    id: "feature-showcase",
    name: "Feature Showcase",
    description: "Highlights specific product features and benefits.",
  },
  {
    id: "problem-solution",
    name: "Problem–Solution",
    description: "Presents a problem and shows how the product solves it.",
  },
]

// Map creative IDs to pillars
export const creativeToPillarMap = {
  "creative-1": "brand-story",
  "creative-2": "problem-solution",
  "creative-3": "testimonial",
  "creative-4": "feature",
  "creative-5": "testimonial",
  "creative-6": "demo",
  "creative-7": "educational",
  "creative-8": "educational",
  "creative-9": "feature",
  "creative-10": "lifestyle",
  "creative-11": "brand-story",
  "creative-12": "lifestyle",
  "creative-13": "demo",
  "creative-14": "testimonial",
  "creative-15": "promotional",
  "creative-16": "promotional",
  "creative-17": "promotional",
  "creative-18": "promotional",
  "creative-19": "lifestyle",
  "adv-creative-1": "feature",
  "adv-creative-2": "demo",
  "adv-creative-3": "lifestyle",
  "adv-creative-4": "promotional",
}

// Helper function to get pillar name by ID
export function getPillarNameById(pillarId: string): string {
  const pillar = creativePillars.find((p) => p.id === pillarId)
  return pillar ? pillar.name : "Unknown"
}

// Helper function to get creative pillars used in a segment (mockup, not used for real coverage)
export function getPillarsForSegment(creatives: any[]): { used: string[]; missing: string[] } {
  // Get all pillar IDs used in this segment
  const usedPillarIds = creatives.map(
    (creative) => creativeToPillarMap[creative.id as keyof typeof creativeToPillarMap] || "unknown",
  )

  // Get unique pillar IDs
  const uniqueUsedPillarIds = [...new Set(usedPillarIds)]

  // Get pillar names for used pillars
  const usedPillars = uniqueUsedPillarIds.map((id) => getPillarNameById(id))

  // Get all pillar names
  const allPillarNames = creativePillars.map((p) => p.name)

  // Get missing pillar names
  const missingPillars = allPillarNames.filter((name) => !usedPillars.includes(name))

  return {
    used: usedPillars,
    missing: missingPillars,
  }
}

// NEW: Helper to get pillar coverage from real Supabase data
export function getPillarCoverageFromData(creatives: Array<{ creative_pillars: string }>): { used: string[]; missing: string[] } {
  // Extract all pillar names from creative_pillars fields (which are comma-separated, sometimes with braces/quotes)
  const allPillars = creatives.flatMap((creative) => {
    if (!creative.creative_pillars) return [];
    // Remove braces and quotes, split by comma
    return creative.creative_pillars
      .replace(/[{}\"]/g, "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  });
  const uniqueUsedPillars = [...new Set(allPillars)];
  // Get all pillar names from creativePillars
  const allPillarNames = creativePillars.map((p) => p.name);
  // Used pillars that match known pillars
  const used = uniqueUsedPillars.filter((p) => allPillarNames.includes(p));
  // Missing pillars
  const missing = allPillarNames.filter((p) => !used.includes(p));
  return { used, missing };
}

