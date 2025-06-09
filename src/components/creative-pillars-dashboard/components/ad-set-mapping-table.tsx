"use client"

import type React from "react"

import { useState, useEffect } from 'react'
import { Info, Save, RefreshCcw, Loader2, Sparkles, Check, ChevronsUpDown } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

// Define the ad set type
interface AdSet {
  ad_set_id: string
  ad_set: string
  mappedStage?: string
  mappedStages?: string[]
}

interface AdSetMappingTableProps {
  adAccountId: string;
  onMappingSaved?: () => void;
}

export function AdSetMappingTable({ adAccountId, onMappingSaved }: AdSetMappingTableProps) {
  const [adSets, setAdSets] = useState<AdSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [multiStageEnabled, setMultiStageEnabled] = useState(false)
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true)
  const [savingMapping, setSavingMapping] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{adSetName: string, suggestedStage: string, confidence: number, reasoning: string}[]>([])
  const [funnelStages, setFunnelStages] = useState<string[]>(["Evaluation", "Consideration", "Conversion"])
  const [loadingFunnelStages, setLoadingFunnelStages] = useState(false)
  
  // Fetch ad sets and funnel stages when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setLoadingFunnelStages(true)
        
        // Fetch ad sets
        const adSetsResponse = await fetch(`/api/ad-sets?adAccountId=${adAccountId}`)
        
        if (!adSetsResponse.ok) {
          throw new Error(`Failed to fetch ad sets: ${adSetsResponse.statusText}`)
        }
        
        const adSetsData = await adSetsResponse.json()
        setAdSets(adSetsData.map((adSet: any) => ({
          ...adSet,
          mappedStage: undefined,
          mappedStages: []
        })))
        
        // Fetch existing mappings
        try {
          const mappingsResponse = await fetch(`/api/ad-set-mapping?adAccountId=${adAccountId}`)
          
          if (mappingsResponse.ok) {
            const mappingsData = await mappingsResponse.json()
            
            if (mappingsData && mappingsData.length > 0) {
              // Apply existing mappings to ad sets
              setAdSets(prevAdSets => 
                prevAdSets.map(adSet => {
                  const mapping = mappingsData.find((m: any) => m.ad_set_id === adSet.ad_set_id)
                  if (mapping) {
                    return {
                      ...adSet,
                      mappedStage: mapping.stages && mapping.stages.length > 0 ? mapping.stages[0] : undefined,
                      mappedStages: mapping.stages || []
                    }
                  }
                  return adSet
                })
              )
            }
          }
        } catch (mappingErr) {
          console.warn("Error fetching existing mappings:", mappingErr)
        }
        
        // Fetch funnel stages from database
        try {
          const funnelStagesResponse = await fetch(`/api/funnel-stages?adAccountId=${adAccountId}`)
          
          if (funnelStagesResponse.ok) {
            const funnelStagesData = await funnelStagesResponse.json()
            if (funnelStagesData.stages && funnelStagesData.stages.length > 0) {
              setFunnelStages(funnelStagesData.stages)
            }
          }
        } catch (funnelErr) {
          console.warn("Error fetching funnel stages, using defaults:", funnelErr)
          // Keep default funnel stages if fetch fails
        } finally {
          setLoadingFunnelStages(false)
        }
      } catch (err) {
        console.error("Error fetching ad sets:", err)
        setError(err instanceof Error ? err.message : "Failed to load ad sets")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [adAccountId])
  
  // Fetch AI suggestions when ad sets are loaded and auto-suggest is enabled
  useEffect(() => {
    if (autoSuggestEnabled && adSets.length > 0) {
      fetchAiSuggestions()
    }
  }, [adSets, autoSuggestEnabled])

  const handleStageChange = (adSetId: string, stage: string) => {
    setAdSets(
      adSets.map((adSet) => {
        if (adSet.ad_set_id === adSetId) {
          // If multi-stage is enabled, we need to handle arrays
          if (multiStageEnabled) {
            const currentStages = adSet.mappedStages || []
            
            // If stage already exists, remove it
            if (currentStages.includes(stage)) {
              return {
                ...adSet,
                mappedStages: currentStages.filter((s) => s !== stage),
              }
            } 
            // Otherwise add it
            else {
              return {
                ...adSet,
                mappedStages: [...currentStages, stage],
              }
            }
          } 
          // For single stage, toggle it on/off
          else {
            // If the stage is already selected, clear it
            if (adSet.mappedStage === stage) {
              return {
                ...adSet,
                mappedStage: undefined,
              }
            } 
            // Otherwise set it
            else {
              return {
                ...adSet,
                mappedStage: stage,
              }
            }
          }
        }
        return adSet
      }),
    )
  }

  // Get AI-powered suggestion for an ad set
  const autoSuggestStage = (adSetName: string): string | null => {
    // If suggestions are loading or not yet fetched, return null
    if (suggestionsLoading || (autoSuggestEnabled && aiSuggestions.length === 0)) {
      return null
    }
    
    // Check if we have an AI suggestion for this ad set
    const aiSuggestion = aiSuggestions.find(s => s.adSetName === adSetName)
    if (aiSuggestion) {
      return aiSuggestion.suggestedStage
    }
    
    // Fall back to null if no suggestion is available
    return null
  }
  
  // Fetch AI-powered suggestions for all ad sets
  const fetchAiSuggestions = async () => {
    if (adSets.length === 0) return
    
    try {
      setSuggestionsLoading(true)
      
      const response = await fetch('/api/suggest-funnel-stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adSets: adSets.map(a => a.ad_set),
          adSetIds: adSets.map(a => a.ad_set_id),
          adAccountId,
          funnelStages
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch AI suggestions: ${response.statusText}`)
      }
      
      const data = await response.json()
      setAiSuggestions(data.suggestions)
      
    } catch (err) {
      console.error('Error fetching AI suggestions:', err)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  // Save the ad set mapping to the backend
  const saveAdSetMapping = async () => {
    try {
      setSavingMapping(true);
      
      // Format the data for the API
      const mappingData = adSets.map(adSet => ({
        ad_set_id: adSet.ad_set_id,
        ad_set: adSet.ad_set,
        stages: multiStageEnabled ? adSet.mappedStages : adSet.mappedStage ? [adSet.mappedStage] : [],
      }))
      
      // Call the API to save the mapping
      const response = await fetch('/api/ad-set-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_account_id: adAccountId,
          mappings: mappingData
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save mapping: ${response.statusText}`)
      }
      
      // Show success message
      alert('Ad set mapping saved successfully!')
      
      // Notify parent component to refresh data
      if (onMappingSaved) {
        onMappingSaved();
      }
      
    } catch (err) {
      console.error('Error saving ad set mapping:', err)
      alert(`Error saving mapping: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSavingMapping(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading ad sets...</p>
        </div>
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    )
  }
  
  // Show empty state
  if (adSets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No ad sets found for this ad account.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch id="multi-stage" checked={multiStageEnabled} onCheckedChange={setMultiStageEnabled} />
          <label
            htmlFor="multi-stage"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Enable multi-stage mapping
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  When enabled, you can assign an ad set to multiple funnel stages. This is useful for broad ad sets
                  that span several steps.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="auto-suggest" checked={autoSuggestEnabled} onCheckedChange={(checked) => {
            setAutoSuggestEnabled(checked);
            if (checked && adSets.length > 0 && aiSuggestions.length === 0) {
              fetchAiSuggestions();
            }
          }} />
          <label
            htmlFor="auto-suggest"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            AI-powered stage suggestions
          </label>
          {suggestionsLoading && <Loader2 className="h-4 w-4 animate-spin ml-2 text-primary" />}
          {autoSuggestEnabled && (
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 h-7 text-xs" 
              onClick={fetchAiSuggestions}
              disabled={suggestionsLoading || adSets.length === 0}
            >
              <RefreshCcw className="h-3.5 w-3.5 mr-1" />
              Refresh Suggestions
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Uses Gemini AI to intelligently suggest funnel stages based on ad set names.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-medium">Ad Set Name</th>
                <th className="p-2 text-left font-medium">Funnel Stage</th>
                <th className="p-2 text-left font-medium">Auto-Suggested</th>
              </tr>
            </thead>
            <tbody>
            {adSets.map((adSet) => {
              const suggestedStage = autoSuggestEnabled ? autoSuggestStage(adSet.ad_set) : null

              return (
                <tr key={adSet.ad_set_id} className="border-b">
                  <td className="p-2">{adSet.ad_set}</td>
                  <td className="p-2">
                    {multiStageEnabled ? (
                      <div className="flex flex-wrap gap-1">
                        {adSet.mappedStages && adSet.mappedStages.length > 0 ? (
                          adSet.mappedStages.map((stage) => (
                            <Badge key={stage} variant="outline">
                              {stage}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Not mapped</span>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                              <span className="h-3.5 w-3.5">+</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search stages..." />
                              <CommandList>
                                <CommandEmpty>No stage found.</CommandEmpty>
                                <CommandGroup>
                                  {funnelStages.map((stage) => (
                                    <CommandItem
                                      key={stage}
                                      onSelect={() => handleStageChange(adSet.ad_set_id, stage)}
                                      className="flex items-center"
                                    >
                                      <Checkbox
                                        checked={(adSet.mappedStages || []).includes(stage)}
                                        className="mr-2 h-4 w-4"
                                      />
                                      {stage}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-[200px] justify-between">
                            {adSet.mappedStage || "Select stage"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search stages..." />
                            <CommandList>
                              <CommandEmpty>No stage found.</CommandEmpty>
                              <CommandGroup>
                                {funnelStages.map((stage) => (
                                  <CommandItem
                                    key={stage}
                                    onSelect={() => handleStageChange(adSet.ad_set_id, stage)}
                                    className="flex items-center"
                                  >
                                    <Checkbox
                                      checked={(adSet.mappedStages || []).includes(stage)}
                                      className="mr-2 h-4 w-4"
                                    />
                                    {stage}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </td>
                  <td className="p-2">
                    {suggestionsLoading && autoSuggestEnabled ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Loading suggestions...</span>
                      </div>
                    ) : suggestedStage ? (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            if (multiStageEnabled) {
                              handleStageChange(adSet.ad_set_id, suggestedStage)
                            } else {
                              // Toggle off if already selected
                              const currentAdSet = adSets.find(a => a.ad_set_id === adSet.ad_set_id)
                              if (currentAdSet?.mappedStage === suggestedStage) {
                                setAdSets(
                                  adSets.map((a) =>
                                    a.ad_set_id === adSet.ad_set_id ? { ...a, mappedStage: undefined } : a,
                                  ),
                                )
                              } else {
                                setAdSets(
                                  adSets.map((a) =>
                                    a.ad_set_id === adSet.ad_set_id ? { ...a, mappedStage: suggestedStage } : a,
                                  ),
                                )
                              }
                            }
                          }}
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                          {suggestedStage}
                        </Button>
                        {aiSuggestions.find(s => s.adSetName === adSet.ad_set) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground flex items-center">
                                  <span className="inline-block w-1 h-1 rounded-full bg-primary mr-1"></span>
                                  AI-powered
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  {aiSuggestions.find(s => s.adSetName === adSet.ad_set)?.reasoning || 'Suggested by Gemini AI'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveAdSetMapping} disabled={savingMapping}>
          {savingMapping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Mapping
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
