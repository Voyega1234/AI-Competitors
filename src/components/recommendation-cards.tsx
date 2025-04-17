import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, Share2 } from "lucide-react"

export function RecommendationCards() {
  const recommendations = [
    {
      id: "1",
      title: "Launch a Thai Street Food Delivery Campaign",
      description:
        "Capitalize on the gap in authentic street food delivery that competitors aren't focusing on. Create a campaign highlighting local street vendors exclusive to your platform.",
      category: "Campaign",
      impact: "High",
      competitiveGap: "Authentic Local Experience",
      tags: ["Street Food", "Local", "Exclusive"],
    },
    {
      id: "2",
      title: "Zero Delivery Fee Weekends",
      description:
        "Analysis shows competitors charge higher delivery fees on weekends. Introduce zero delivery fee weekends to drive higher order volume during peak periods.",
      category: "Promotion",
      impact: "Medium",
      competitiveGap: "Pricing Strategy",
      tags: ["Pricing", "Weekend", "Promotion"],
    },
    {
      id: "3",
      title: "Restaurant Partner Spotlight Series",
      description:
        "Create content highlighting the stories of your restaurant partners. Competitors focus on food, not the people behind it. This builds emotional connection.",
      category: "Content",
      impact: "Medium",
      competitiveGap: "Storytelling",
      tags: ["Content", "Partners", "Stories"],
    },
    {
      id: "4",
      title: "Eco-Friendly Packaging Initiative",
      description:
        "None of your competitors have strong sustainability messaging. Launch an eco-friendly packaging program with participating restaurants to differentiate your brand.",
      category: "Initiative",
      impact: "High",
      competitiveGap: "Sustainability",
      tags: ["Eco-Friendly", "Sustainability", "CSR"],
    },
    {
      id: "5",
      title: "Thai Food Pairing Recommendations",
      description:
        "Implement an AI-driven food pairing system that suggests authentic Thai food combinations. Competitors offer basic recommendations without cultural context.",
      category: "Feature",
      impact: "Medium",
      competitiveGap: "Personalization",
      tags: ["AI", "Personalization", "Culture"],
    },
    {
      id: "6",
      title: "Local Festival Delivery Specials",
      description:
        "Create special themed promotions around Thai festivals that competitors aren't capitalizing on, such as Songkran and Loy Krathong.",
      category: "Seasonal",
      impact: "Medium",
      competitiveGap: "Cultural Relevance",
      tags: ["Festivals", "Seasonal", "Cultural"],
    },
  ]

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recommendations.map((recommendation) => (
        <Card key={recommendation.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {recommendation.category}
              </Badge>
              <Badge
                variant="outline"
                className={
                  recommendation.impact === "High"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }
              >
                {recommendation.impact} Impact
              </Badge>
            </div>
            <CardTitle className="mt-4 text-xl">{recommendation.title}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Based on gap: {recommendation.competitiveGap}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm">{recommendation.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {recommendation.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" size="sm">
              <Bookmark className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
