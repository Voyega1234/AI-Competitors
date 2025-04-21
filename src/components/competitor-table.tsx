"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, Download, Edit, ExternalLink, Save, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export type Competitor = {
  id: string
  analysisRunId: string
  name: string
  website: string | null
  facebookUrl: string | null
  services: string[]
  serviceCategories: string[]
  features: string[]
  pricing: string
  strengths: string[]
  weaknesses: string[]
  specialty: string
  targetAudience: string
  brandTone: string
  positivePerception: string
  negativePerception: string
  marketShare: string
  complaints: string[]
  adThemes: string[]
  domainAuthority: number
  backlinks: number
  organicTraffic: string
  uxScore: number
  loadingSpeed: string
  mobileResponsiveness: string
  usp: string
  followers: number
}

interface CompetitorTableProps {
  initialCompetitors: Competitor[];
}

export function CompetitorTable({ initialCompetitors }: CompetitorTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    positivePerception: false,
    negativePerception: false,
    domainAuthority: false,
    backlinks: false,
    organicTraffic: false,
    uxScore: false,
    loadingSpeed: false,
    mobileResponsiveness: false,
    usp: false,
    serviceCategories: false,
    strengths: false,
    weaknesses: false,
    specialty: false,
    targetAudience: false,
    brandTone: false,
    marketShare: false,
    complaints: false,
    adThemes: false,
  })
  const [rowSelection, setRowSelection] = React.useState({})
  const [editingCell, setEditingCell] = React.useState<{
    id: string
    column: string
    value: any
  } | null>(null)

  const [competitors, setCompetitors] = React.useState<Competitor[]>(initialCompetitors)

  const [clientNames, setClientNames] = useState<string[]>([])
  const [productFocuses, setProductFocuses] = useState<string[]>([])
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null)
  const [selectedProductFocus, setSelectedProductFocus] = useState<string | null>(null)

  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false)
  const [tableError, setTableError] = useState<string | null>(null)

  // --- State for Service Category Filtering ---
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientNames = async () => {
      try {
        const response = await fetch('/api/clients')
        if (!response.ok) throw new Error('Failed to fetch client names')
        const data = await response.json()
        setClientNames(data.clients || [])
      } catch (error) {
        console.error("Error fetching client names:", error)
        setTableError("Could not load client list.")
      }
    }
    fetchClientNames()
  }, [])

  useEffect(() => {
    if (!selectedClientName) {
      setProductFocuses([])
      setSelectedProductFocus(null)
      return
    }

    const fetchProductFocuses = async () => {
      try {
        const response = await fetch(`/api/products?clientName=${encodeURIComponent(selectedClientName)}`)
        if (!response.ok) throw new Error('Failed to fetch product focuses')
        const data = await response.json()
        setProductFocuses(data.products || [])
        setSelectedProductFocus(null)
      } catch (error) {
        console.error("Error fetching product focuses:", error)
        setTableError(`Could not load products for ${selectedClientName}.`)
        setProductFocuses([])
        setSelectedProductFocus(null)
      }
    }

    fetchProductFocuses()
  }, [selectedClientName])

  useEffect(() => {
    if (!competitors || competitors.length === 0) {
      setAvailableCategories([]);
      return;
    }

    const allCategories = new Set<string>();
    competitors.forEach(competitor => {
      if (competitor.services && Array.isArray(competitor.services)) {
          competitor.services.forEach(service => {
            if (service) {
                 allCategories.add(service.trim().toLowerCase());
            }
          });
      }
    });

    const sortedCategories = Array.from(allCategories).sort();
    setAvailableCategories(sortedCategories);

    // Reset category filter when main competitor list changes
    setSelectedCategoryFilter(null);

  }, [competitors]); // Re-run whenever the main competitor list changes

  const handleSearch = async () => {
    if (!selectedClientName || !selectedProductFocus) {
      setTableError("Please select both a client and a product focus.")
      return
    }

    setIsLoadingTable(true)
    setTableError(null)
    setCompetitors([])

    try {
      const productFocusForQuery = selectedProductFocus === 'placeholder-for-empty' ? null : selectedProductFocus

      const queryParams = new URLSearchParams({
        clientName: selectedClientName,
      })
      if (productFocusForQuery !== null) {
        queryParams.set('productFocus', productFocusForQuery)
      }

      const runResponse = await fetch(`/api/analysis-run?${queryParams.toString()}`)

      if (!runResponse.ok) {
        if (runResponse.status === 404) {
          throw new Error(`No analysis run found for ${selectedClientName} - ${productFocusForQuery ?? 'N/A'}.`)
        } else {
          throw new Error('Failed to find analysis run')
        }
      }
      const runData = await runResponse.json()
      const runId = runData.id

      if (!runId) {
        throw new Error(`Analysis run ID missing for ${selectedClientName} - ${productFocusForQuery ?? 'N/A'}.`)
      }

      const competitorsResponse = await fetch(`/api/competitors?runId=${runId}`)
      if (!competitorsResponse.ok) {
        throw new Error(`Failed to fetch competitors for run ${runId}`)
      }
      const competitorsData = await competitorsResponse.json()
      setCompetitors(competitorsData.competitors || [])

    } catch (error) {
      console.error("Error during search:", error)
      setTableError(error instanceof Error ? error.message : 'An unknown error occurred during search')
      setCompetitors([])
    } finally {
      setIsLoadingTable(false)
    }
  }

  const handleEdit = (id: string, column: string, value: any) => {
    setEditingCell({ id, column, value })
  }

  const handleSave = () => {
    if (!editingCell) return

    const { id, column, value } = editingCell

    // Define keys that are expected to be string arrays
    const arrayKeys: (keyof Competitor)[] = [
        'services', 'serviceCategories', 'features', 'strengths', 
        'weaknesses', 'complaints', 'adThemes'
    ];

    const updatedCompetitors = competitors.map((competitor) => {
      if (competitor.id === id) {
        // Get the original value type for comparison
        const originalValue = competitor[column as keyof Competitor];

        // Specific handling for array types
        if (arrayKeys.includes(column as keyof Competitor)) {
             // Ensure value is treated as a string before splitting, handle potential null/undefined from input
            const stringValue = typeof value === 'string' ? value : String(value ?? '');
            return {
                 ...competitor,
                [column]: stringValue.split(",").map((item) => item.trim()).filter(item => item !== ''), // Split and remove empty strings
            }
        }
        // Handle number properties that might come from input fields
        else if (typeof originalValue === 'number') {
           const numValue = Number(value); // Attempt conversion
           return {
               ...competitor,
               // Use converted number if valid, otherwise revert to original value to prevent saving NaN
               [column]: !isNaN(numValue) ? numValue : originalValue
           }
        }
        // Handle other properties (string, boolean, null)
        else {
          return {
            ...competitor,
            [column]: value, // Assign directly
          }
        }
      }
      return competitor
    })

    setCompetitors(updatedCompetitors)
    setEditingCell(null)
  }

  const handleCancel = () => {
    setEditingCell(null)
  }

  // --- Create Filtered Competitor List ---
  const filteredCompetitors = useMemo(() => {
    if (!selectedCategoryFilter) {
      return competitors; // No filter applied
    }
    return competitors.filter(competitor =>
      competitor.services?.some(service => 
          service.trim().toLowerCase() === selectedCategoryFilter
      )
    );
  }, [competitors, selectedCategoryFilter]); // Recalculate when these change

  const columns: ColumnDef<Competitor>[] = [
    {
      accessorKey: "name",
      header: "Competitor",
      cell: ({ row }) => {
        const value = row.getValue("name") as string
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "name") {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[180px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <span className="font-medium">{value}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "name", value)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "website",
      header: "Website",
      cell: ({ row }) => {
        const value = row.getValue("website") as string
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "website") {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[180px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <a
              href={value ? value : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:underline"
            >
              Visit <ExternalLink className="ml-1 h-3 w-3" />
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "website", value)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "services",
      header: "Services",
      cell: ({ row }) => {
        const services = row.getValue("services") as string[]
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "services") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : String(editingCell.value)}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {services.slice(0, 3).map((service, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
              {services.length > 3 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs cursor-help">
                        +{services.length - 3} more
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="w-[200px]">
                      <ul className="list-disc pl-4 text-xs">
                        {services.slice(3).map((service, i) => (
                          <li key={i}>{service}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "services", services)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "pricing",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Pricing
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const value = row.getValue("pricing") as string
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "pricing") {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[120px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <span>{value}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "pricing", value)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "strengths",
      header: "Strengths",
      cell: ({ row }) => {
        const strengths = row.getValue("strengths") as string[]
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "strengths") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : String(editingCell.value)}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <ul className="list-disc pl-4 text-xs max-w-[200px]">
              {strengths.slice(0, 3).map((strength, i) => (
                <li key={i}>{strength}</li>
              ))}
              {strengths.length > 3 && (
                <li>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-blue-600 cursor-help">+{strengths.length - 3} more</span>
                      </TooltipTrigger>
                      <TooltipContent className="w-[200px]">
                        <ul className="list-disc pl-4 text-xs">
                          {strengths.slice(3).map((strength, i) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              )}
            </ul>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "strengths", strengths)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "weaknesses",
      header: "Weaknesses",
      cell: ({ row }) => {
        const weaknesses = row.getValue("weaknesses") as string[]
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "weaknesses") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : String(editingCell.value)}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <ul className="list-disc pl-4 text-xs max-w-[200px]">
              {weaknesses.slice(0, 3).map((weakness, i) => (
                <li key={i}>{weakness}</li>
              ))}
              {weaknesses.length > 3 && (
                <li>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-blue-600 cursor-help">+{weaknesses.length - 3} more</span>
                      </TooltipTrigger>
                      <TooltipContent className="w-[200px]">
                        <ul className="list-disc pl-4 text-xs">
                          {weaknesses.slice(3).map((weakness, i) => (
                            <li key={i}>{weakness}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              )}
            </ul>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "weaknesses", weaknesses)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "specialty",
      header: "Specialty",
      cell: ({ row }) => {
        const value = row.getValue("specialty") as string
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "specialty") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <div className="max-w-[200px] text-sm">{value}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "specialty", value)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "targetAudience",
      header: "Target Audience",
      cell: ({ row }) => {
        const value = row.getValue("targetAudience") as string
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "targetAudience") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <div className="max-w-[200px] text-sm">{value}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "targetAudience", value)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "brandTone",
      header: "Brand Tone",
      cell: ({ row }) => {
        const value = row.getValue("brandTone") as string
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "brandTone") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <div className="max-w-[200px] text-sm">{value}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "brandTone", value)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "positivePerception",
      header: "Positive Perception",
      cell: ({ row }) => {
        const value = row.getValue("positivePerception") as string
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "positivePerception") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }
        return (
          <div className="flex items-start gap-2 group">
            <div className="text-xs max-w-[200px]">{value}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "positivePerception", value)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "negativePerception",
      header: "Negative Perception",
      cell: ({ row }) => {
        const value = row.getValue("negativePerception") as string
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "negativePerception") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }
        return (
          <div className="flex items-start gap-2 group">
            <div className="text-xs max-w-[200px]">{value}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "negativePerception", value)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "marketShare",
      header: "Market Share",
      cell: ({ row }) => {
        const value = row.getValue("marketShare") as string
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "marketShare") {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[120px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <span>{value}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "marketShare", value)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "complaints",
      header: "Common Complaints",
      cell: ({ row }) => {
        const complaints = row.getValue("complaints") as string[]
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "complaints") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : String(editingCell.value)}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <ul className="list-disc pl-4 text-xs max-w-[200px]">
              {complaints.slice(0, 3).map((complaint, i) => (
                <li key={i}>{complaint}</li>
              ))}
              {complaints.length > 3 && (
                <li>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-blue-600 cursor-help">+{complaints.length - 3} more</span>
                      </TooltipTrigger>
                      <TooltipContent className="w-[200px]">
                        <ul className="list-disc pl-4 text-xs">
                          {complaints.slice(3).map((complaint, i) => (
                            <li key={i}>{complaint}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              )}
            </ul>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "complaints", complaints)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "adThemes",
      header: "Ad Themes",
      cell: ({ row }) => {
        const adThemes = row.getValue("adThemes") as string[]
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "adThemes") {
          return (
            <div className="flex items-center gap-2">
              <Textarea
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : String(editingCell.value)}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-20 w-[200px] text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {adThemes.map((theme, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {theme}
                </Badge>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(id, "adThemes", adThemes)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "domainAuthority",
      header: "Domain Authority",
      cell: ({ row }) => {
        const value = row.getValue("domainAuthority") as number
        const id = row.original.id
        if (editingCell && editingCell.id === id && editingCell.column === "domainAuthority") {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[80px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2 group">
            <span className="font-medium">{value}/100</span>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(id, "domainAuthority", value)} className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "backlinks",
      header: "Backlinks",
      cell: ({ row }) => {
        const value = row.getValue("backlinks") as number
        const id = row.original.id
        if (editingCell && editingCell.id === id && editingCell.column === "backlinks") {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[80px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2 group">
            <span className="font-medium">{value.toLocaleString()}</span>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(id, "backlinks", value)} className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "organicTraffic",
      header: "Organic Traffic",
      cell: ({ row }) => {
        const value = row.getValue("organicTraffic") as string
        const id = row.original.id
        if (editingCell && editingCell.id === id && editingCell.column === "organicTraffic") {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[120px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2 group">
            <span className="font-medium">{value}</span>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(id, "organicTraffic", value)} className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "uxScore",
      header: "UX Score",
      cell: ({ row }) => {
        const value = row.getValue("uxScore") as number
        const id = row.original.id
        if (editingCell && editingCell.id === id && editingCell.column === "uxScore") {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[80px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2 group">
            <span className="font-medium">{value}/100</span>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(id, "uxScore", value)} className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "loadingSpeed",
      header: "Loading Speed",
      cell: ({ row }) => {
        const value = row.getValue("loadingSpeed") as string
        const id = row.original.id
        if (editingCell && editingCell.id === id && editingCell.column === "loadingSpeed") {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[120px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2 group">
            <span className="font-medium">{value}</span>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(id, "loadingSpeed", value)} className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "mobileResponsiveness",
      header: "Mobile Resp.",
      cell: ({ row }) => {
        const value = row.getValue("mobileResponsiveness") as string
        const id = row.original.id
        if (editingCell && editingCell.id === id && editingCell.column === "mobileResponsiveness") {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="h-8 w-[120px]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2 group">
            <span className="font-medium">{value}</span>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(id, "mobileResponsiveness", value)} className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const competitor = row.original
        return (
          <Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DialogTrigger asChild>
                  <DropdownMenuItem>View details</DropdownMenuItem>
                </DialogTrigger>
                <DropdownMenuItem>Compare with client</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" /> Export data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>{competitor.name} - Detailed Analysis</DialogTitle>
                <DialogDescription>Comprehensive competitor analysis data</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="marketing">Marketing</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="perception">Perception</TabsTrigger>
                </TabsList>
                <ScrollArea className="h-[60vh] rounded-md border p-4">
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-lg font-medium">Basic Information</h3>
                        <div className="grid gap-2 mt-2">
                          <div className="flex justify-between">
                            <span className="font-medium">Name:</span>
                            <span>{competitor.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Website:</span>
                            <a
                              href={competitor.website ? competitor.website : undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center"
                            >
                              Visit <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Pricing:</span>
                            <span>{competitor.pricing}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Market Share:</span>
                            <span>{competitor.marketShare}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Specialty & USP</h3>
                        <p className="mt-2 text-sm">{competitor.specialty}</p>
                        <h4 className="font-medium mt-4">Unique Selling Proposition</h4>
                        <p className="mt-1 text-sm">{competitor.usp}</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium">Services & Features</h3>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <h4 className="font-medium">Services Offered</h4>
                          <ul className="list-disc pl-5 mt-1 text-sm">
                            {competitor.services.map((service, i) => (
                              <li key={i}>{service}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium">Key Features</h4>
                          <ul className="list-disc pl-5 mt-1 text-sm">
                            {competitor.features.map((feature, i) => (
                              <li key={i}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium">SWOT Analysis</h3>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <h4 className="font-medium text-green-600">Strengths</h4>
                          <ul className="list-disc pl-5 mt-1 text-sm">
                            {competitor.strengths.map((strength, i) => (
                              <li key={i}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-red-600">Weaknesses</h4>
                          <ul className="list-disc pl-5 mt-1 text-sm">
                            {competitor.weaknesses.map((weakness, i) => (
                              <li key={i}>{weakness}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="marketing" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Target Audience</h3>
                      <p className="mt-2 text-sm">{competitor.targetAudience}</p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium">Brand Voice & Messaging</h3>
                      <div className="grid gap-4 mt-2">
                        <div>
                          <h4 className="font-medium">Brand Tone</h4>
                          <p className="mt-1 text-sm">{competitor.brandTone}</p>
                        </div>
                        <div>
                          <h4 className="font-medium">Ad Messaging Themes</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {competitor.adThemes.map((theme, i) => (
                              <Badge key={i} variant="secondary">
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium">Social Media Presence</h3>
                      <div className="grid gap-4 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Followers:</span>
                          <span>
                            {typeof competitor.followers === 'number' && !isNaN(competitor.followers)
                                ? competitor.followers.toLocaleString()
                                : '0'
                            }
                          </span>
                        </div>
                        {competitor.facebookUrl && (
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Facebook:</span>
                            <a
                              href={competitor.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Visit Page
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="technical" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">SEO Performance</h3>
                      <div className="grid gap-4 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Domain Authority:</span>
                          <span>{competitor.domainAuthority ?? 0}/100</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Domain Authority Score</span>
                            <span>{competitor.domainAuthority ?? 0}/100</span>
                          </div>
                          <Progress value={competitor.domainAuthority ?? 0} className="h-2 mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Backlinks:</span>
                          <span>
                            {typeof competitor.backlinks === 'number' && !isNaN(competitor.backlinks)
                                ? competitor.backlinks.toLocaleString()
                                : '0'
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Organic Traffic:</span>
                          <span>{competitor.organicTraffic ?? 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium">Website Quality</h3>
                      <div className="grid gap-4 mt-2">
                        <div>
                          <div className="flex items-center justify-between text-sm">
                            <span>UX/UI Score</span>
                            <span>{competitor.uxScore ?? 0}/100</span>
                          </div>
                          <Progress value={competitor.uxScore ?? 0} className="h-2 mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Loading Speed:</span>
                          <span>{competitor.loadingSpeed ?? 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Mobile Responsiveness:</span>
                          <span>{competitor.mobileResponsiveness ?? 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium">Technology Stack</h3>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <h4 className="font-medium">Frontend</h4>
                          <ul className="list-disc pl-5 mt-1 text-sm">
                            <li>React</li>
                            <li>Next.js</li>
                            <li>Tailwind CSS</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium">Backend</h4>
                          <ul className="list-disc pl-5 mt-1 text-sm">
                            <li>Node.js</li>
                            <li>Express</li>
                            <li>MongoDB</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="perception" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Brand Perception</h3>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <h4 className="font-medium text-green-600">Positive Perception</h4>
                          <p className="mt-1 text-sm">{competitor.positivePerception}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-red-600">Negative Perception</h4>
                          <p className="mt-1 text-sm">{competitor.negativePerception}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium">Common Complaints</h3>
                      <ul className="list-disc pl-5 mt-2 text-sm">
                        {competitor.complaints.map((complaint, i) => (
                          <li key={i}>{complaint}</li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium">Customer Reviews Analysis</h3>
                      <div className="space-y-4 mt-2">
                        <div>
                          <h4 className="font-medium">Rating Distribution</h4>
                          <div className="space-y-2 mt-2">
                            <div>
                              <div className="flex items-center justify-between text-sm">
                                <span>5 Stars</span>
                                <span>42%</span>
                              </div>
                              <Progress value={42} className="h-2 mt-1" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-sm">
                                <span>4 Stars</span>
                                <span>28%</span>
                              </div>
                              <Progress value={28} className="h-2 mt-1" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-sm">
                                <span>3 Stars</span>
                                <span>15%</span>
                              </div>
                              <Progress value={15} className="h-2 mt-1" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-sm">
                                <span>2 Stars</span>
                                <span>8%</span>
                              </div>
                              <Progress value={8} className="h-2 mt-1" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-sm">
                                <span>1 Star</span>
                                <span>7%</span>
                              </div>
                              <Progress value={7} className="h-2 mt-1" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium">Review Platforms</h4>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="flex items-center justify-between">
                              <span>Google Play:</span>
                              <span>4.2/5</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>App Store:</span>
                              <span>4.5/5</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Trustpilot:</span>
                              <span>3.8/5</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Facebook:</span>
                              <span>4.1/5</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
              <DialogFooter>
                <Button variant="outline">Export Details</Button>
                <Button>Compare with Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredCompetitors,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    autoResetPageIndex: true,
  })

  return (
    <div className="w-full">
      <div className="flex items-end justify-between py-4 gap-2 flex-wrap">
        <div className="flex items-end gap-2 flex-wrap">
          <div className="grid gap-1.5">
            <Label htmlFor="client-select" className="text-sm font-medium">Select Client</Label>
            <Select
              value={selectedClientName ?? ""}
              onValueChange={(value) => setSelectedClientName(value || null)}
            >
              <SelectTrigger className="h-9 w-[250px]" id="client-select">
                <SelectValue placeholder="Select Client..." />
              </SelectTrigger>
              <SelectContent>
                {clientNames.length > 0 ? (
                  clientNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading-clients" disabled>Loading clients...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="product-select" className="text-sm font-medium">Select Product</Label>
            <Select
              value={selectedProductFocus ?? ""}
              onValueChange={(value) => setSelectedProductFocus(value || null)}
              disabled={!selectedClientName || productFocuses.length === 0}
            >
              <SelectTrigger className="h-9 w-[250px]" id="product-select">
                <SelectValue placeholder={!selectedClientName ? "Select client first" : "Select Product Focus..."} />
              </SelectTrigger>
              <SelectContent>
                {selectedClientName && productFocuses.length > 0 ? (
                  productFocuses.map(focus => (
                    <SelectItem key={focus} value={focus || "placeholder-for-empty"}>{focus || "N/A"}</SelectItem>
                  ))
                ) : selectedClientName ? (
                  <SelectItem value="loading-products" disabled>Loading products...</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSearch}
            disabled={!selectedClientName || !selectedProductFocus || isLoadingTable}
            className="h-9"
          >
            {isLoadingTable ? "Loading..." : "Search"}
          </Button>
        </div>

        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 py-4 border-t border-b">
        <Button
          variant={selectedCategoryFilter === null ? "secondary" : "outline"}
          size="sm"
          className="h-8"
          onClick={() => setSelectedCategoryFilter(null)}
         >
           All Competitors
         </Button>
        {availableCategories.map(category => (
           <Button
              key={category}
              variant={selectedCategoryFilter === category ? "secondary" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setSelectedCategoryFilter(category)}
            >
              {category}
            </Button>
        ))}
      </div>

      <div className="rounded-md border mt-4">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoadingTable ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    Loading competitors...
                  </div>
                </TableCell>
              </TableRow>
            ) : tableError ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-red-600">
                  Error loading data: {tableError}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="group">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {selectedCategoryFilter 
                      ? `No competitors found for category: ${selectedCategoryFilter}`
                      : "No results found for the selected analysis."
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() > 0 ? table.getPageCount() : 1}
        </div>
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  )
}
