import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { appFunnelData, ecommerceFunnelData } from "../data/funnel-data"

export function CreativeGapSuggestions({ funnelType }: { funnelType: "app" | "ecommerce" }) {
  const funnelData = funnelType === "app" ? appFunnelData : ecommerceFunnelData

  // Find segments with no creatives or low coverage
  const gapSegments = funnelData.filter((segment) => segment.creatives.length === 0 || segment.coverageRating === "Low")

  if (gapSegments.length === 0) {
    return (
      <Alert>
        <AlertTitle>No significant gaps detected</AlertTitle>
        <AlertDescription>
          All segments have at least some creative coverage. Consider refreshing low-performing creatives.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Creative Coverage Gaps Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {gapSegments.map((segment) => (
          <Alert key={segment.id} variant="destructive">
            <AlertTitle>{segment.name} Segment</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {segment.creatives.length === 0
                  ? "No creatives are currently targeting this segment."
                  : "This segment has very low creative coverage."}
              </p>
              <p className="font-medium">Suggestions:</p>
              <ul className="list-disc pl-5 space-y-1">
                {segment.id.includes("kyc") && <li>Create educational content about the KYC process benefits</li>}
                {segment.id.includes("checkout") && (
                  <li>Develop checkout abandonment recovery creatives with incentives</li>
                )}
                {segment.id.includes("downloaded") && (
                  <li>Create onboarding guide creatives to encourage registration</li>
                )}
                {segment.id.includes("registered") && (
                  <li>Develop trust-building creatives to encourage KYC completion</li>
                )}
                <li>Adapt high-performing creatives from adjacent funnel stages</li>
                <li>Consider A/B testing different messaging approaches for this segment</li>
              </ul>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  )
}
