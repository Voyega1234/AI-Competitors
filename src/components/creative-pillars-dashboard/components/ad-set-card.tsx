"use client"

import { useState } from "react"
import Image from "next/image"
import { Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface Ad {
  id: string
  name: string
  imageUrl: string
  body?: string
  funnel_segment?: string
  customAudiences?: string[]
  demographics?: {
    age_min?: number
    age_max?: number
    countries?: string[]
  }
  metrics?: {
    ctr?: string
    cpc?: string
    impressions?: string
    reach?: string
    spend?: string
    frequency?: string
    roas?: string
  }
  launch_date?: string
  objective?: string
}

interface AdSetCardProps {
  adSet: {
    id: string
    name: string
    ads: Ad[]
    stages: string[]
    metrics?: {
      ctr?: string
      cpc?: string
      impressions?: string
      reach?: string
      spend?: string
      frequency?: string
      roas?: string
      clicks?: number
      totalAds?: number
    }
    audiences?: string[]
  }
}

export function AdSetCard({ adSet }: AdSetCardProps) {
  const [imageError, setImageError] = useState<Record<string, boolean>>({})
  const [showAllAds, setShowAllAds] = useState(false)

  // Handle image load errors
  const handleImageError = (adId: string) => {
    setImageError(prev => ({ ...prev, [adId]: true }))
  }

  // Calculate metrics for this ad set
  const totalAds = adSet.ads.length;
  // Always display max 3 thumbnails
  const displayAds = adSet.ads.slice(0, 3);
  
  // Get custom audiences if available
  const customAudiences = adSet.ads[0]?.customAudiences || [];
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium truncate" title={adSet.name}>
            {adSet.name}
          </h3>
          <div className="flex gap-1">
            {adSet.stages.map(stage => (
              <Badge key={stage} variant="outline" className="text-xs px-1.5 py-0">
                {stage}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-xs font-medium">
            {totalAds} {totalAds === 1 ? 'Ad' : 'Ads'}
            {adSet.metrics?.totalAds && adSet.metrics.totalAds > totalAds && (
              <span className="text-muted-foreground ml-1">
                (showing {displayAds.length} of {adSet.metrics.totalAds})
              </span>
            )}
          </div>
          {adSet.metrics && (
            <div className="flex gap-1">
              {adSet.metrics.ctr && (
                <Badge variant="secondary" className="text-xs">
                  CTR: {adSet.metrics.ctr}%
                </Badge>
              )}
              {adSet.metrics.cpc && (
                <Badge variant="secondary" className="text-xs">
                  CPC: ${adSet.metrics.cpc}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex overflow-x-auto">
          {displayAds.length > 0 ? (
            displayAds.map((ad, index) => (
              <div 
                key={ad.id} 
                className={`relative min-w-[33%] w-1/3 h-24 ${index > 0 ? 'border-l border-border' : ''}`}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full h-full">
                        {!imageError[ad.id] ? (
                          <Image
                            src={ad.imageUrl}
                            alt={ad.name}
                            fill
                            className="object-cover"
                            onError={() => handleImageError(ad.id)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs p-1 text-center">
                            {ad.name.length > 20 ? `${ad.name.substring(0, 20)}...` : ad.name}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[300px]">
                      <div className="space-y-2">
                        <div>
                          <p className="font-medium text-xs">{ad.name}</p>
                          {ad.body && <p className="text-xs opacity-90">{ad.body.length > 80 ? `${ad.body.substring(0, 80)}...` : ad.body}</p>}
                        </div>
                        
                        {ad.objective && (
                          <div className="text-xs">
                            <span className="font-medium">Objective:</span> {ad.objective}
                          </div>
                        )}
                        
                        {ad.launch_date && (
                          <div className="text-xs">
                            <span className="font-medium">Launched:</span> {new Date(ad.launch_date).toLocaleDateString()}
                          </div>
                        )}
                        
                        {ad.metrics && Object.values(ad.metrics).some(value => value) && (
                          <div className="text-xs">
                            <p className="font-medium mb-1">Performance:</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {ad.metrics.ctr && <div><span className="opacity-70">CTR:</span> {ad.metrics.ctr}%</div>}
                              {ad.metrics.cpc && <div><span className="opacity-70">CPC:</span> ${ad.metrics.cpc}</div>}
                              {ad.metrics.impressions && <div><span className="opacity-70">Impressions:</span> {ad.metrics.impressions}</div>}
                            </div>
                          </div>
                        )}
                        
                        {ad.demographics && ad.demographics.countries && ad.demographics.countries.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium">Countries:</span> {ad.demographics.countries.slice(0, 3).join(', ')}
                            {ad.demographics.countries.length > 3 && ` +${ad.demographics.countries.length - 3} more`}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))
          ) : (
            <div className="w-full h-24 flex items-center justify-center bg-muted text-muted-foreground text-xs">
              No ad images available
            </div>
          )}
        </div>
        
        {/* Display additional metrics and audience information */}
        <div className="p-3 border-t border-border">
          {/* Performance Metrics */}
          {adSet.metrics && Object.values(adSet.metrics).some(value => value !== null) && (
            <div className="mb-2">
              <h4 className="text-xs font-medium mb-1">Performance</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Define metric types and their display properties */}
                {[
                  { key: 'ctr', label: 'CTR', value: adSet.metrics.ctr ? `${adSet.metrics.ctr}%` : null, colorIndex: 0 },
                  { key: 'cpc', label: 'CPC', value: adSet.metrics.cpc ? `$${adSet.metrics.cpc}` : null, colorIndex: 1 },
                  { key: 'impressions', label: 'Impressions', value: adSet.metrics.impressions || null, colorIndex: 2 },
                  { key: 'reach', label: 'Reach', value: adSet.metrics.reach || null, colorIndex: 3 },
                  { key: 'spend', label: 'Spend', value: adSet.metrics.spend ? `$${adSet.metrics.spend}` : null, colorIndex: 4 },
                  { key: 'frequency', label: 'Frequency', value: adSet.metrics.frequency || null, colorIndex: 5 },
                  { key: 'roas', label: 'ROAS', value: adSet.metrics.roas ? `${adSet.metrics.roas}x` : null, colorIndex: 6 },
                ].map((metric, idx) => {
                  if (!metric.value) return null;
                  
                  // Define indicator colors
                  const indicatorColors = [
                    'bg-blue-500',
                    'bg-green-500',
                    'bg-purple-500',
                    'bg-amber-500',
                    'bg-red-500',
                    'bg-indigo-500',
                    'bg-emerald-500',
                  ];
                  
                  const colorClass = indicatorColors[metric.colorIndex % indicatorColors.length];
                  
                  return (
                    <div key={metric.key} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${colorClass} mr-1.5`}></div>
                      <span className="text-muted-foreground">{metric.label}:</span> {metric.value}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Audience Information */}
          {adSet.audiences && adSet.audiences.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-1">Audiences</h4>
              <div className="flex flex-wrap gap-1">
                {adSet.audiences.slice(0, 3).map((audience, index) => {
                  // Use a consistent badge style based on index for visual consistency
                  const badgeStyles = [
                    { variant: "secondary", className: "text-xs bg-blue-100 text-blue-800 hover:bg-blue-100" },
                    { variant: "secondary", className: "text-xs bg-purple-100 text-purple-800 hover:bg-purple-100" },
                    { variant: "secondary", className: "text-xs bg-green-100 text-green-800 hover:bg-green-100" },
                  ];
                  
                  // Get badge style based on index position
                  const badgeStyle = badgeStyles[index % badgeStyles.length];
                  
                  return (
                    <Badge 
                      key={index} 
                      variant={badgeStyle.variant as any} 
                      className={badgeStyle.className}
                    >
                      {audience.length > 20 ? `${audience.substring(0, 20)}...` : audience}
                    </Badge>
                  );
                })}
                {adSet.audiences.length > 3 && (
                  <Badge variant="outline" className="text-xs">+{adSet.audiences.length - 3} more</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
