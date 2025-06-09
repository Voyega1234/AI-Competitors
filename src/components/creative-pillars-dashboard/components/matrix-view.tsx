"use client"

import * as React from "react"
import { useState } from "react"
import { AlertCircle, Info, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { appFunnelStages, ecommerceFunnelStages } from "../data/funnel-stages"
import { fetchCreatives, Creative } from "../data/creative-data"
import { getPillarCoverageFromData } from "../data/creative-pillars"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

interface MatrixViewProps {
  clientName: string | null;
  productFocus: string | null;
}

export function MatrixView({ clientName, productFocus }: MatrixViewProps) {
  const [funnelType, setFunnelType] = useState<"app" | "ecommerce">("app")
  const [showAdvantage, setShowAdvantage] = useState(true)
  const [creatives, setCreatives] = useState<Creative[]>([])
  // Build funnelData dynamically from real creatives and funnel stages
  const funnelStages: string[] = funnelType === "app" ? appFunnelStages : ecommerceFunnelStages;
  const funnelData = funnelStages.map((stage: string) => ({
    id: stage,
    name: stage,
    creatives: creatives.filter((c: Creative) => c.funnel_segment === stage)
  }));

  // State for loading and error handling
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch creatives when clientName or productFocus changes
  React.useEffect(() => {
    console.log('MatrixView: clientName or productFocus changed:', { clientName, productFocus });
    
    // Only fetch if both clientName and productFocus are provided
    if (clientName && productFocus) {
      setIsLoading(true);
      setError(null);
      console.log('MatrixView: Fetching creatives for:', { clientName, productFocus });
      
      fetchCreatives(clientName, productFocus)
        .then(data => {
          console.log(`MatrixView: Fetched ${data.length} creatives`);
          setCreatives(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching creatives:', err);
          setError(err instanceof Error ? err : new Error('Failed to load creative data'));
          setIsLoading(false);
        });
    } else {
      // Reset creatives when no clientName or productFocus is provided
      console.log('MatrixView: No clientName or productFocus provided, resetting creatives');
      setCreatives([]);
      setIsLoading(false);
    }
  }, [clientName, productFocus])

  // Get all unique creative IDs across all segments
  const creativeIds = creatives.map((creative) => creative.id)

  // Calculate creative pillar coverage from real data
  const pillarCoverage = getPillarCoverageFromData(creatives as any)

  // Display appropriate UI based on state
  if (!clientName || !productFocus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-4 max-w-md">
          <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <h3 className="text-lg font-medium">Incomplete Selection</h3>
          <p className="text-sm text-gray-500 mt-1">
            Please select both a client and product focus to view the creative matrix.
          </p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading creatives</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error instanceof Error ? error.message : String(error)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (creatives.length === 0) {
    return (
      <div className="bg-amber-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">No creatives found</h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>No creatives were found for the selected client and product focus.</p>
              <p className="mt-2">Please check that there are creatives in the database for this ad account.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Creative Pillar Coverage Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Creative Pillar Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            {pillarCoverage.used.length > 0 && (
              <>
                <span className="font-medium text-green-700 dark:text-green-300">Covered:</span>
                {pillarCoverage.used.map((pillar) => (
                  <span key={pillar} className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs font-semibold">
                    {pillar}
                  </span>
                ))}
              </>
            )}
            {pillarCoverage.missing.length > 0 && (
              <>
                <span className="ml-4 font-medium text-red-700 dark:text-red-300">Missing:</span>
                {pillarCoverage.missing.map((pillar) => (
                  <span key={pillar} className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs font-semibold">
                    {pillar}
                  </span>
                ))}
              </>
            )}
            {pillarCoverage.used.length === 0 && pillarCoverage.missing.length === 0 && (
              <span className="text-xs text-muted-foreground">No creative pillar data found.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant={funnelType === "app" ? "default" : "outline"} onClick={() => setFunnelType("app")}>
            App Funnel
          </Button>
          <Button
            variant={funnelType === "ecommerce" ? "default" : "outline"}
            onClick={() => setFunnelType("ecommerce")}
          >
            Ecommerce Funnel
          </Button>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                This matrix view shows which creatives (rows) are targeting which funnel segments (columns). Green
                indicates active targeting, yellow indicates low frequency, and red indicates no coverage.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Audience Mapping Required</AlertTitle>
        <AlertDescription>
          Segments are not auto-detected. You must map your Facebook Custom Audiences to funnel stages using the Custom
          Audience Mapper. This ensures accurate reporting and flexibility in how funnels are defined.
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-2">
        <Switch id="show-advantage" checked={showAdvantage} onCheckedChange={setShowAdvantage} />
        <label
          htmlFor="show-advantage"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Show Advantage+ Campaigns
        </label>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Creative Coverage Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="border p-2 text-left font-medium">Creative</th>
                  {funnelData.map((segment: { id: string; name: string; creatives: Creative[] }) => (
                    <th key={segment.id} className="border p-2 text-center">
                      {segment.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creatives
                  .map((creative) => (
                    <tr key={creative.id}>
                      <td className="border p-2 text-left">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-muted overflow-hidden">
                            <img
                              src={creative.thumbnail_url || "/placeholder.svg?height=32&width=32"}
                              alt={creative.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-medium text-sm flex items-center">
                              {creative.name}
                            </div>
                            <div className="text-xs text-muted-foreground">{creative.objective}</div>
                          </div>
                        </div>
                      </td>
                      {funnelData.map((segment: { id: string; name: string; creatives: Creative[] }) => {
                        // Check if this creative is in this segment
                        const creativeInSegment = segment.creatives.find((c: any) => c && typeof c === 'object' && 'id' in c && c.id === creative.id)

                        let cellClass = "bg-red-100 dark:bg-red-950/20"
                        let cellContent = "—"

                        // Defensive: skip if creativeInSegment is not a resolved object
                        if (creativeInSegment && typeof creativeInSegment === 'object' && 'frequency' in creativeInSegment) {
                          if (creativeInSegment.frequency && Number(creativeInSegment.frequency) > 3) {
                            cellClass = "bg-green-100 dark:bg-green-950/20"
                            cellContent = `${creativeInSegment.frequency}x`
                          } else if (creativeInSegment.frequency) {
                            cellClass = "bg-yellow-100 dark:bg-yellow-950/20"
                            cellContent = `${creativeInSegment.frequency}x`
                          } else {
                            cellClass = "bg-green-100 dark:bg-green-950/20"
                            cellContent = `✔`
                          }
                        }

                        return (
                          <td key={segment.id} className={`border p-2 text-center text-xs ${cellClass}`}>
                            {cellContent}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
