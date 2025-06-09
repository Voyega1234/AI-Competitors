import { Lightbulb } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { creativePillars } from "../data/creative-pillars"
import { getPillarsForSegment } from "../data/creative-pillars"
import React, { useState, useEffect } from "react"
import { fetchCreatives, Creative } from "../data/creative-data"

interface CreativePillarIdeasProps {
  funnelType: "app" | "ecommerce";
  clientName: string | null;
  productFocus: string | null;
}

export function CreativePillarIdeas({ funnelType, clientName, productFocus }: CreativePillarIdeasProps) {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientName || !productFocus) {
        setCreatives([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchCreatives(clientName, productFocus);
        setCreatives(data);
      } catch (err) {
        console.error('Error in CreativePillarIdeas:', err);
        setError(err instanceof Error ? err : new Error('Failed to load creatives'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientName, productFocus])

  // Get used pillars across all segments
  const { used, missing } = getPillarsForSegment(creatives || [])

  // Get pillar ideas - focus on missing pillars and add some underutilized ones
  const pillarIdeas = creativePillars
    .filter((pillar) => missing.includes(pillar.name) || Math.random() > 0.7) // Include all missing pillars and some random ones
    .slice(0, 4) // Limit to 4 ideas

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg">
            <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
            Creative Pillar Ideas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg">
            <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
            Error Loading Ideas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load creative pillar ideas. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (!clientName || !productFocus) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg">
            <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
            Select Client & Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please select a client and product focus to see creative pillar ideas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
          Creative Pillar Ideas
        </CardTitle>
        <CardDescription>Content approaches to explore for your next creative assets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pillarIdeas.map((pillar) => (
            <Card key={pillar.id} className="overflow-hidden border-dashed">
              <CardHeader className="pb-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{pillar.name}</CardTitle>
                  {missing.includes(pillar.name) ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                    >
                      Missing
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                    >
                      Underutilized
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-1">{pillar.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <h4 className="text-sm font-medium mb-2">Content Ideas:</h4>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  {getContentIdeasForPillar(pillar.id, funnelType).map((idea, index) => (
                    <li key={index}>{idea}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function getContentIdeasForPillar(pillarId: string, funnelType: "app" | "ecommerce"): string[] {
  const ideas: Record<string, string[]> = {
    "problem-solution": [
      "Show common pain points and how your product solves them",
      "Before/after comparison videos",
      "Customer journey from problem to solution",
      funnelType === "app"
        ? "App features that address specific user challenges"
        : "Product features that solve specific customer problems",
    ],
    testimonial: [
      "Customer success stories with real metrics",
      "User-generated content showcasing product benefits",
      "Expert endorsements or reviews",
      "Side-by-side comparisons with competitor solutions",
    ],
    feature: [
      "Spotlight on unique product capabilities",
      "How-to guides for key features",
      "Feature benefit explainers",
      funnelType === "app" ? "App walkthrough videos" : "Product demonstration videos",
    ],
    demo: [
      "Step-by-step usage tutorials",
      "Quick tips for getting started",
      "Advanced usage scenarios",
      funnelType === "app" ? "In-app navigation guides" : "Product assembly or setup guides",
    ],
    lifestyle: [
      "Day-in-the-life content with your product",
      "Seasonal usage scenarios",
      "Aspirational content showing ideal outcomes",
      "Cultural relevance and trend integration",
    ],
    promotional: [
      "Limited-time offer announcements",
      "Exclusive deal reveals",
      "Bundle or package promotions",
      "Loyalty program highlights",
    ],
    educational: [
      "Industry insights and trends",
      "How-to content related to your product category",
      "Myth-busting or FAQ content",
      "Expert interviews or webinar snippets",
    ],
    "brand-story": [
      "Origin story and company values",
      "Behind-the-scenes content",
      "Team member spotlights",
      "Social impact initiatives",
    ],
    "user-generated": [
      "Customer photos/videos using your product",
      "Testimonial compilations",
      "Challenge or hashtag campaign content",
      "Community spotlight features",
    ],
  }

  return (
    ideas[pillarId] || [
      "Explore new content approaches",
      "Test different messaging styles",
      "Create content that resonates with your audience",
      "Develop assets that highlight your unique value proposition",
    ]
  )
}
