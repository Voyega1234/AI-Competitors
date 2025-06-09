"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Info, Users } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreativeCard } from "./creative-card"
import { fetchCreatives, Creative } from "../data/creative-data"
import { CreativePillarsDisplay } from "./creative-pillars-display"
import { MetricSelector } from "./metric-selector"
import { AdSetMappingTable } from "./ad-set-mapping-table"
import { AdSetCard } from "./ad-set-card"
import { getPillarCoverageFromData } from "../data/creative-pillars"

interface FunnelViewProps {
  clientName: string | null
  productFocus: string | null
}

interface AdSet {
  id: string
  name: string
  ads: {
    id: string
    name: string
    imageUrl: string
    body?: string
  }[]
  stages: string[]
}

interface FunnelStage {
  stage: string
  adSets: AdSet[]
}

export function FunnelView({ clientName, productFocus }: FunnelViewProps) {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [priorityMetric, setPriorityMetric] = useState<string>("CTR")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [adSetMappingOpen, setAdSetMappingOpen] = useState<boolean>(false)
  const [adAccountId, setAdAccountId] = useState<string>("") // Will be fetched dynamically
  const [adAccountLoading, setAdAccountLoading] = useState<boolean>(false)
  const [showLegacyView, setShowLegacyView] = useState<boolean>(false) // Toggle between ad sets and legacy view
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0) // Used to trigger data refresh
  
  // Function to refresh funnel data
  const refreshFunnelView = () => {
    setRefreshTrigger(prev => prev + 1);
  }

  // Fetch ad account ID when client or product selection changes
  useEffect(() => {
    const fetchAdAccount = async () => {
      if (!clientName || !productFocus) {
        setAdAccountId("");
        return;
      }

      setAdAccountLoading(true);
      
      try {
        const url = `/api/ad-account?clientName=${encodeURIComponent(clientName)}&productFocus=${encodeURIComponent(productFocus)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ad account: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.ad_account_id) {
          setAdAccountId(data.ad_account_id);
          console.log(`Ad account ID set to: ${data.ad_account_id}`);
        } else {
          // Fallback to default if no ad account found
          setAdAccountId("act_909760306304891");
          console.warn("No ad account ID found, using default");
        }
      } catch (err) {
        console.error('Error fetching ad account ID:', err);
        // Fallback to default if error
        setAdAccountId("act_909760306304891");
      } finally {
        setAdAccountLoading(false);
      }
    };

    fetchAdAccount();
  }, [clientName, productFocus]);
  
  // Fetch ad sets with ads when ad account ID changes
  useEffect(() => {
    const fetchAdSetsWithAds = async () => {
      if (!adAccountId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/ad-sets-with-ads?adAccountId=${adAccountId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ad sets: ${response.statusText}`);
        }
        
        const data = await response.json();
        setFunnelData(data.funnelData || []);
        console.log(`Loaded ${data.totalAdSets} ad sets across ${data.funnelData?.length || 0} funnel stages`);
      } catch (err) {
        console.error('Error fetching ad sets with ads:', err);
        setError(err instanceof Error ? err : new Error('Failed to load ad sets'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAdSetsWithAds();
  }, [adAccountId, refreshTrigger]);
  
  // Fetch creatives when client or product selection changes
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
        setCreatives(data || []);
      } catch (err) {
        console.error('Error fetching creatives:', err);
        setError(err instanceof Error ? err : new Error('Failed to load creatives'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientName, productFocus]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
    );
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
    );
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
    );
  }

  // Group creatives by funnel segment
  const segmentItems = creatives.reduce((acc: {segment: string, creatives: Creative[]}[], creative) => {
    const segmentName = creative.funnel_segment || 'Uncategorized';
    const existingSegment = acc.find(s => s.segment === segmentName);
    
    if (existingSegment) {
      existingSegment.creatives.push(creative);
    } else {
      acc.push({
        segment: segmentName,
        creatives: [creative]
      });
    }
    
    return acc;
  }, []);

  // Sorting function
  const sortCreatives = (creatives: Creative[]) => {
    if (!creatives || creatives.length === 0) return [];
    return [...creatives].sort((a, b) => {
      let aValue: number = 0, bValue: number = 0;
      switch (priorityMetric) {
        case "ROAS":
          aValue = Number.parseFloat(a.roas || "0");
          bValue = Number.parseFloat(b.roas || "0");
          break;
        case "CTR":
          aValue = Number.parseFloat(a.ctr || "0");
          bValue = Number.parseFloat(b.ctr || "0");
          break;
        case "CPC":
          aValue = Number.parseFloat(a.cpc || "0");
          bValue = Number.parseFloat(b.cpc || "0");
          break;
        case "Reach":
          aValue = Number.parseInt(a.reach?.replace(/[^0-9]/g, "") || "0", 10);
          bValue = Number.parseInt(b.reach?.replace(/[^0-9]/g, "") || "0", 10);
          break;
        case "Impressions":
          aValue = Number.parseInt(a.impressions?.replace(/[^0-9]/g, "") || "0", 10);
          bValue = Number.parseInt(b.impressions?.replace(/[^0-9]/g, "") || "0", 10);
          break;
        case "Spend":
          aValue = Number.parseFloat(a.spend?.replace(/[^0-9.]/g, "") || "0");
          bValue = Number.parseFloat(b.spend?.replace(/[^0-9.]/g, "") || "0");
          break;
        default:
          aValue = 0;
          bValue = 0;
      }
      if (priorityMetric === "CPC") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MetricSelector
            selectedMetric={priorityMetric}
            onMetricChange={setPriorityMetric}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
          />
          <div className="flex items-center gap-2 ml-4">
            <label className="text-sm font-medium">
              <input 
                type="checkbox" 
                checked={showLegacyView} 
                onChange={e => setShowLegacyView(e.target.checked)} 
                className="mr-2"
              />
              Legacy View
            </label>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setAdSetMappingOpen(true)}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Ad Set Mapping
        </Button>
      </div>
      
      {/* Ad Set Mapping Dialog */}
      <Dialog open={adSetMappingOpen} onOpenChange={setAdSetMappingOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Ad Set Mapping</DialogTitle>
            <DialogDescription>
              Map your ad sets to funnel stages to better organize your ad campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {adAccountLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : adAccountId ? (
              <AdSetMappingTable 
                adAccountId={adAccountId} 
                onMappingSaved={refreshFunnelView} 
                onClose={() => setAdSetMappingOpen(false)} 
              />
            ) : (
              <div className="p-4 border rounded-md bg-amber-50 text-amber-800">
                <p>No ad account found for the selected client and product. Please select a different client or product.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Ad Sets with Thumbnails View */}
      {!showLegacyView && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-3">
          {funnelData.map((funnelStage, index) => {
            // Use index to determine column color instead of hardcoding by name
            const colorClasses = [
              'bg-blue-50 border-blue-200',   // First column (index 0)
              'bg-purple-50 border-purple-200', // Second column (index 1)
              'bg-green-50 border-green-200',  // Third column (index 2)
            ];
            
            // Get color class based on index, cycling through available colors
            const colorClass = colorClasses[index % colorClasses.length];
            
            return (
              <Card 
                key={funnelStage.stage} 
                className={`relative ${colorClass} border-2`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg font-bold">{funnelStage.stage}</span>
                    <span className="text-sm text-muted-foreground">
                      {funnelStage.adSets.length} Ad Sets
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {funnelStage.adSets.length > 0 ? (
                    funnelStage.adSets.map((adSet) => (
                      <AdSetCard key={adSet.id} adSet={adSet} />
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-md">
                      No ad sets in this stage
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Legacy Creatives View */}
      {showLegacyView && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
          {segmentItems.map(({ segment, creatives: segmentCreatives }) => {
            if (!segment) return null;
            
            // Calculate coverage for this segment
            const { used, missing } = getPillarCoverageFromData(segmentCreatives);
            const totalPillars = used.length + missing.length;
            const percentCovered = totalPillars === 0 ? 0 : used.length / totalPillars;
            
            // Determine coverage label and color
            let coverageLabel = "Unknown";
            let coverageColor = "bg-gray-600";
            if (percentCovered >= 0.8) {
              coverageLabel = "High Coverage";
              coverageColor = "bg-green-600";
            } else if (percentCovered >= 0.4) {
              coverageLabel = "Medium Coverage";
              coverageColor = "bg-yellow-600";
            } else if (percentCovered > 0) {
              coverageLabel = "Low Coverage";
              coverageColor = "bg-red-600";
            }
            
            // Calculate metrics
            const topCtr = Math.max(...segmentCreatives.map(c => parseFloat(c.ctr || "0")));
            const lastRefresh = segmentCreatives
              .map(c => c.launch_date)
              .sort()
              .reverse()[0] || "N/A";

            return (
              <Card key={segment} className={`relative ${coverageColor} bg-opacity-10`}>
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg font-bold">{segment}</span>
                    <span 
                      className={`flex items-center justify-center min-w-[56px] px-2 py-0.5 rounded-full text-[11px] font-semibold ${coverageColor} text-white h-5 min-h-0 text-center whitespace-normal leading-tight`}
                      style={{fontSize: '11px', lineHeight: '1.1'}}
                    >
                      {coverageLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground font-normal">
                    <span className="flex items-center gap-0.5">
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                      </svg>
                      {segmentCreatives.length} Creatives
                    </span>
                    <span className="flex items-center gap-0.5">
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      Top CTR: {topCtr ? `${topCtr}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-normal mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4l3 3"/>
                      </svg>
                      Launch: {segmentCreatives.length ? new Date(
                        Math.max(...segmentCreatives.map(c => 
                          c.launch_date ? new Date(c.launch_date).getTime() : 0
                        ))
                      ).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : 'N/A'}
                    </span>
                  </div>
                  <CreativePillarsDisplay creatives={segmentCreatives} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {sortCreatives(segmentCreatives).map((creative) => (
                      <CreativeCard 
                        key={creative.id} 
                        creative={creative} 
                        priorityMetric={priorityMetric} 
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
