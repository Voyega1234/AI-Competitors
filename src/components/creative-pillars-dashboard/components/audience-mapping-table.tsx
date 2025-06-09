"use client"

import type React from "react"

import { useState } from "react"
import { Check, ChevronsUpDown, Info, Save, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { appFunnelStages, ecommerceFunnelStages } from "@/data/funnel-stages"
import { mockAudiences } from "@/data/audience-data"

export function AudienceMappingTable({ funnelType }: { funnelType: "app" | "ecommerce" }) {
  const [audiences, setAudiences] = useState(mockAudiences)
  const [multiStageEnabled, setMultiStageEnabled] = useState(false)
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true)
  const funnelStages = funnelType === "app" ? appFunnelStages : ecommerceFunnelStages

  const handleStageChange = (audienceId: string, stage: string) => {
    setAudiences(
      audiences.map((audience) => {
        if (audience.id === audienceId) {
          // If multi-stage is enabled, toggle the stage in the array
          if (multiStageEnabled) {
            const currentStages = audience.mappedStages || []
            if (currentStages.includes(stage)) {
              return {
                ...audience,
                mappedStages: currentStages.filter((s) => s !== stage),
              }
            } else {
              return {
                ...audience,
                mappedStages: [...currentStages, stage],
              }
            }
          } else {
            // Single stage mapping
            return {
              ...audience,
              mappedStage: stage,
            }
          }
        }
        return audience
      }),
    )
  }

  const autoSuggestStage = (audienceName: string): string | null => {
    const nameLower = audienceName.toLowerCase()

    // App funnel suggestions
    if (nameLower.includes("cold") || nameLower.includes("lookalike")) return "Cold"
    if (nameLower.includes("engaged") || nameLower.includes("video view")) return "Engaged"
    if (nameLower.includes("clicked") || nameLower.includes("landing page")) return "Clicked Ad"
    if (nameLower.includes("download") || nameLower.includes("install")) return "Downloaded App"
    if (nameLower.includes("register") || nameLower.includes("signup")) return "Registered"
    if (nameLower.includes("kyc") || nameLower.includes("verified")) return "Completed KYC"
    if (nameLower.includes("transact") || nameLower.includes("purchase")) return "Transacted"

    // Ecommerce funnel suggestions
    if (nameLower.includes("cart")) return "Added to Cart"
    if (nameLower.includes("checkout")) return "Initiated Checkout"
    if (nameLower.includes("purchase") || nameLower.includes("buyer")) return "Purchased"
    if (nameLower.includes("repeat") || nameLower.includes("loyal")) return "Repeat Buyers"

    return null
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
                  When enabled, you can assign an audience to multiple funnel stages. This is useful for broad audiences
                  that span several steps.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="auto-suggest" checked={autoSuggestEnabled} onCheckedChange={setAutoSuggestEnabled} />
          <label
            htmlFor="auto-suggest"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Auto-suggest stages
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Automatically suggests funnel stages based on audience name keywords.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Audience Name</th>
              <th className="p-2 text-left font-medium">Size</th>
              <th className="p-2 text-left font-medium">Type</th>
              <th className="p-2 text-left font-medium">Funnel Stage</th>
              <th className="p-2 text-left font-medium">Auto-Suggested</th>
            </tr>
          </thead>
          <tbody>
            {audiences.map((audience) => {
              const suggestedStage = autoSuggestEnabled ? autoSuggestStage(audience.name) : null

              return (
                <tr key={audience.id} className="border-b">
                  <td className="p-2">{audience.name}</td>
                  <td className="p-2">{audience.size}</td>
                  <td className="p-2">
                    <Badge variant={audience.type === "Custom" ? "default" : "secondary"}>{audience.type}</Badge>
                    {audience.isAdvantage && (
                      <Badge
                        variant="outline"
                        className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      >
                        Advantage+
                      </Badge>
                    )}
                  </td>
                  <td className="p-2">
                    {multiStageEnabled ? (
                      <div className="flex flex-wrap gap-1">
                        {audience.mappedStages && audience.mappedStages.length > 0 ? (
                          audience.mappedStages.map((stage) => (
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
                              <Plus className="h-3.5 w-3.5" />
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
                                      onSelect={() => handleStageChange(audience.id, stage)}
                                      className="flex items-center"
                                    >
                                      <Checkbox
                                        checked={(audience.mappedStages || []).includes(stage)}
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
                            {audience.mappedStage || "Select stage"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput placeholder="Search stage..." />
                            <CommandList>
                              <CommandEmpty>No stage found.</CommandEmpty>
                              <CommandGroup>
                                {funnelStages.map((stage) => (
                                  <CommandItem
                                    key={stage}
                                    value={stage}
                                    onSelect={() => handleStageChange(audience.id, stage)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        audience.mappedStage === stage ? "opacity-100" : "opacity-0",
                                      )}
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
                    {suggestedStage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() =>
                          multiStageEnabled
                            ? handleStageChange(audience.id, suggestedStage)
                            : setAudiences(
                                audiences.map((a) =>
                                  a.id === audience.id ? { ...a, mappedStage: suggestedStage } : a,
                                ),
                              )
                        }
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                        {suggestedStage}
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Mapping
        </Button>
      </div>
    </div>
  )
}

function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
