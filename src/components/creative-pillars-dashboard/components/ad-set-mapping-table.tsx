"use client"

import type React from "react"

import { useState, useEffect } from 'react'
import { Info, Save, RefreshCcw, Loader2, Sparkles, Check, ChevronsUpDown } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
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
  onClose?: () => void;
}

export function AdSetMappingTable({ adAccountId, onMappingSaved, onClose }: AdSetMappingTableProps) {
  const { toast } = useToast()
  const [adSets, setAdSets] = useState<AdSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [multiStageEnabled, setMultiStageEnabled] = useState(false)
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true)
  const [savingMapping, setSavingMapping] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{adSetName: string, suggestedStage: string | null, confidence: number, reasoning: string}[]>([])
  const [funnelStages, setFunnelStages] = useState<string[]>([])
  const [loadingFunnelStages, setLoadingFunnelStages] = useState(false)
  
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Fetch ad sets and funnel stages when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!adAccountId) return
      
      setLoading(true)
      setError(null)
      
      try {
        // Fetch ad sets directly from Supabase with distinct values
        const { data: adSetsData, error: adSetsError } = await supabase
          .from('ads_details')
          .select('ad_set, ad_set_id')
          .eq('ad_account', adAccountId)
          .order('ad_set', { ascending: true })
        
        if (adSetsError) throw adSetsError
        
        if (adSetsData && Array.isArray(adSetsData)) {
          // Filter out duplicate ad sets by ad_set_id
          const uniqueAdSets = adSetsData.reduce((unique: any[], adSet: any) => {
            const exists = unique.find(item => item.ad_set_id === adSet.ad_set_id);
            if (!exists) {
              unique.push(adSet);
            }
            return unique;
          }, []);
          
          console.log(`Filtered ${adSetsData.length} ad sets down to ${uniqueAdSets.length} unique ad sets`);
          
          setAdSets(uniqueAdSets.map(adSet => ({
            ...adSet,
            mappedStage: undefined,
            mappedStages: []
          })))
        }
        
        try {
          // Fetch funnel stages directly from Supabase
          const { data: funnelStagesData, error: funnelStagesError } = await supabase
            .from('funnel_stages')
            .select('stages')
            .eq('ad_account_id', adAccountId)
          
          if (funnelStagesError) throw funnelStagesError
          
          if (funnelStagesData && funnelStagesData.length > 0) {
            // Extract stage names and filter out any null/undefined values
            const stages = funnelStagesData
              .map(stage => stage.stages)
              .filter(stage => stage !== null && stage !== undefined)
              .map(stage => String(stage))
            
            if (stages.length > 0) {
              console.log('Fetched funnel stages from Supabase:', stages)
              setFunnelStages(stages)
            } else {
              // If no stages found in database, use default stages as fallback
              console.log('No funnel stages found in database, using default stages')
              setFunnelStages(["Evaluation", "Consideration", "Conversion"])
            }
          }
        } catch (funnelErr) {
          console.warn("Error fetching funnel stages, using defaults:", funnelErr)
        }
        
        // Fetch existing mappings
        try {
          const { data: mappingsData, error: mappingsError } = await supabase
            .from('ad_set_funnel_mappings')
            .select('ad_set_id, funnel_stage')
            .eq('ad_account', adAccountId)
          
          if (mappingsError) throw mappingsError
          
          if (mappingsData && mappingsData.length > 0) {
            // Apply existing mappings to ad sets
            setAdSets(prevAdSets => 
              prevAdSets.map(adSet => {
                const mapping = mappingsData.find((m: any) => m.ad_set_id === adSet.ad_set_id)
                if (mapping) {
                  // In the ad_set_funnel_mappings table, funnel_stage is a single value, not an array
                  return {
                    ...adSet,
                    mappedStage: mapping.funnel_stage || undefined,
                    mappedStages: mapping.funnel_stage ? [mapping.funnel_stage] : []
                  }
                }
                return adSet
              })
            )
          }
        } catch (mappingErr) {
          console.warn("Error fetching existing mappings:", mappingErr)
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

  // Get suggestion for an ad set based on the most common funnel_segment in its ads
  const autoSuggestStage = (adSetName: string): string | null => {
    // If suggestions are loading or not yet fetched, return null
    if (suggestionsLoading || (autoSuggestEnabled && aiSuggestions.length === 0)) {
      return null
    }
    
    // Check if we have a suggestion for this ad set
    const aiSuggestion = aiSuggestions.find(s => s.adSetName === adSetName)
    if (aiSuggestion && aiSuggestion.suggestedStage) {
      return aiSuggestion.suggestedStage
    }
    
    // Fall back to null if no suggestion is available
    return null
  }
  
  // Fetch suggestions based on the most common funnel_segment in each ad set's ads
  const fetchAiSuggestions = async () => {
    if (adSets.length === 0) return
    
    try {
      setSuggestionsLoading(true)
      
      // Get all ad sets with their ads from Supabase
      const { data: adsData, error: adsError } = await supabase
        .from('ads_details')
        .select('ad_set_id, ad_set, funnel_segment')
        .eq('ad_account', adAccountId)
        .not('funnel_segment', 'is', null)
      
      if (adsError) throw adsError
      
      if (!adsData || adsData.length === 0) {
        console.log('No ads with funnel segments found')
        return
      }
      
      // Group ads by ad set and count funnel segments
      const adSetFunnelSegments: Record<string, Record<string, number>> = {}
      
      // Initialize counters for each ad set
      adsData.forEach((ad: any) => {
        const adSetId = ad.ad_set_id
        const funnelSegment = ad.funnel_segment
        
        if (!adSetId || !funnelSegment) return
        
        if (!adSetFunnelSegments[adSetId]) {
          adSetFunnelSegments[adSetId] = {}
        }
        
        if (!adSetFunnelSegments[adSetId][funnelSegment]) {
          adSetFunnelSegments[adSetId][funnelSegment] = 0
        }
        
        adSetFunnelSegments[adSetId][funnelSegment]++
      })
      
      // Find the most common funnel segment for each ad set
      const suggestions = adSets.map(adSet => {
        const segmentCounts = adSetFunnelSegments[adSet.ad_set_id]
        
        if (!segmentCounts) {
          return {
            adSetName: adSet.ad_set,
            suggestedStage: null,
            confidence: 0,
            reasoning: 'No funnel segments found for this ad set'
          }
        }
        
        // Find the segment with the highest count
        let maxCount = 0
        let mostCommonSegment = null
        
        Object.entries(segmentCounts).forEach(([segment, count]) => {
          if (count > maxCount) {
            maxCount = count
            mostCommonSegment = segment
          }
        })
        
        // Calculate confidence as percentage of ads with this segment
        const totalAds = Object.values(segmentCounts).reduce((sum, count) => sum + count, 0)
        const confidence = totalAds > 0 ? (maxCount / totalAds) * 100 : 0
        
        return {
          adSetName: adSet.ad_set,
          suggestedStage: mostCommonSegment,
          confidence: confidence,
          reasoning: `${maxCount} out of ${totalAds} ads in this ad set have the funnel segment '${mostCommonSegment}'`
        }
      }).filter(suggestion => suggestion.suggestedStage !== null)
      
      console.log('Generated suggestions based on ad funnel segments:', suggestions)
      setAiSuggestions(suggestions)
      
    } catch (err) {
      console.error('Error fetching AI suggestions:', err)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  // Save the ad set mapping to the backend
  const saveAdSetMapping = async () => {
    if (!adAccountId) return
    
    setSavingMapping(true)
    
    try {
      // Format the data for Supabase
      // For multi-stage mapping, we need to create multiple records (one for each stage)
      type MappingRecord = {
        ad_account: string;
        ad_set_id: string;
        ad_set_name: string;
        funnel_stage: string;
        created_at: string;
        updated_at: string;
      };
      
      let mappingData: MappingRecord[] = [];
      
      if (multiStageEnabled) {
        // For multi-stage, create one record per ad set per stage
        adSets.forEach(adSet => {
          if (adSet.mappedStages && adSet.mappedStages.length > 0) {
            adSet.mappedStages.forEach(stage => {
              mappingData.push({
                ad_account: adAccountId,
                ad_set_id: adSet.ad_set_id,
                ad_set_name: adSet.ad_set, // Using ad_set_name from the schema
                funnel_stage: stage,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            });
          }
        });
      } else {
        // For single-stage, create one record per ad set
        mappingData = adSets
          .filter(adSet => adSet.mappedStage) // Only include ad sets with a mapped stage
          .map(adSet => ({
            ad_account: adAccountId,
            ad_set_id: adSet.ad_set_id,
            ad_set_name: adSet.ad_set, // Using ad_set_name from the schema
            funnel_stage: adSet.mappedStage as string, // Type assertion since we filtered out undefined values
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
      }
      
      console.log('Saving ad set mappings to Supabase:', mappingData)
      
      // First delete existing mappings for this ad account
      const { error: deleteError } = await supabase
        .from('ad_set_funnel_mappings')
        .delete()
        .eq('ad_account', adAccountId)
      
      if (deleteError) {
        console.error('Error deleting existing mappings:', deleteError)
        throw new Error(`Failed to update mappings: ${deleteError.message}`)
      }
      
      // Then insert new mappings
      const { error: insertError } = await supabase
        .from('ad_set_funnel_mappings')
        .insert(mappingData)
      
      if (insertError) {
        console.error('Error inserting mappings:', insertError)
        throw new Error(`Failed to save mappings: ${insertError.message}`)
      }
      
      console.log('Ad set mappings saved successfully to Supabase')
      
      // Show success toast notification
      toast({
        title: "Success",
        description: "Ad set mappings saved successfully",
        variant: "default",
      })
      
      // Set success state and clear it after 3 seconds
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
      
      // Notify parent component to refresh data
      if (onMappingSaved) {
        onMappingSaved();
      }
      
    } catch (err) {
      console.error('Error saving ad set mapping:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      
      // Show error toast notification
      toast({
        title: "Error",
        description: `Failed to save mappings: ${errorMessage}`,
        variant: "destructive",
      })
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

      <div className="flex justify-end mt-4 items-center">
        {saveSuccess && (
          <div className="flex items-center mr-4">
            <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-md animate-in fade-in duration-300 mr-2">
              <Check className="mr-1 h-4 w-4" />
              <span className="text-sm font-medium">Saved successfully!</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center" 
              onClick={() => {
                if (onMappingSaved) {
                  onMappingSaved();
                  toast({
                    title: "Refreshed",
                    description: "Funnel view has been refreshed with your changes",
                    variant: "default",
                  });
                }
                
                // Close the dialog
                if (onClose) {
                  onClose();
                }
              }}
            >
              <RefreshCcw className="mr-1 h-4 w-4" />
              Refresh Funnel View
            </Button>
          </div>
        )}
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
