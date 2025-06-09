"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchCreatives, Creative } from "../data/creative-data"
import { getPillarCoverageFromData } from "../data/creative-pillars"

interface FunnelViewProps {
  clientName: string | null
  productFocus: string | null
}

export function FunnelView({ clientName, productFocus }: FunnelViewProps) {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch creatives when client or product selection changes
  useEffect(() => {
    console.log('FunnelView: useEffect triggered', { clientName, productFocus });
    
    const fetchData = async () => {
      if (!clientName || !productFocus) {
        console.log('FunnelView: Missing client or product, clearing creatives');
        setCreatives([]);
        return;
      }

      console.log('FunnelView: Starting to fetch creatives');
      setIsLoading(true);
      setError(null);

      try {
        console.log('FunnelView: Calling fetchCreatives with:', { clientName, productFocus });
        const data = await fetchCreatives(clientName, productFocus);
        console.log('FunnelView: Successfully fetched creatives:', {
          count: data?.length,
          sample: data?.slice(0, 2) // Log first 2 items to avoid cluttering
        });
        setCreatives(data || []);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('FunnelView: Error fetching creatives:', {
          error: errorMsg,
          clientName,
          productFocus,
          fullError: err
        });
        setError(err instanceof Error ? err : new Error('Failed to load creatives'));
      } finally {
        console.log('FunnelView: Finished loading');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientName, productFocus])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show error state
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
              <p>{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state when no client or product is selected
  if (!clientName || !productFocus) {
    return (
      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Incomplete Selection</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Please select both a client and product focus to view creatives.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state when no creatives are found
  if (creatives.length === 0) {
    return (
      <div className="bg-amber-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-amber-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">No creatives found</h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>No creatives were found for the selected client and product focus.</p>
              <p className="mt-1">Client: {clientName} • Product: {productFocus}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Group creatives by funnel segment
  const segments = creatives.reduce((acc: Record<string, Creative[]>, creative) => {
    const segment = creative.funnel_segment || 'Uncategorized'
    if (!acc[segment]) {
      acc[segment] = []
    }
    acc[segment].push(creative)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(segments).map(([segment, segmentCreatives]) => {
        const { used, missing } = getPillarCoverageFromData(segmentCreatives)
        const coveragePercent = Math.round((used.length / (used.length + missing.length)) * 100) || 0

        return (
          <Card key={segment} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{segment}</h3>
                <div className="text-sm text-muted-foreground">
                  {segmentCreatives.length} creatives • {coveragePercent}% coverage
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {segmentCreatives.map(creative => (
                  <div key={creative.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{creative.name || 'Untitled Creative'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {creative.platform} • {creative.objective}
                        </p>
                      </div>
                      <div className="text-sm text-right">
                        <div>CTR: {creative.ctr || 'N/A'}</div>
                        <div>Impressions: {creative.impressions || 'N/A'}</div>
                      </div>
                    </div>
                    {creative.thumbnail_url && (
                      <div className="mt-2">
                        <img 
                          src={creative.thumbnail_url} 
                          alt={creative.name || 'Creative thumbnail'} 
                          className="rounded border max-h-40 mx-auto"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
