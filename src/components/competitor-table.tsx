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

export type Competitor = {
  id: string
  name: string
  website: string | null
  services: string[]
  features: string[]
  pricing: string
  strengths: string[]
  weaknesses: string[]
  specialty: string
  targetAudience: string
  brandTone: string
  brandPerception: {
    positive: string
    negative: string
  }
  marketShare: string
  complaints: string[]
  adThemes: string[]
  seo: {
    domainAuthority: number
    backlinks: number
    organicTraffic: string
  }
  websiteQuality: {
    uxScore: number
    loadingSpeed: string
    mobileResponsiveness: string
  }
  usp: string
  socialMetrics: {
    followers: number
  }
  facebookUrl: string | null
}

// Define props for the component
interface CompetitorTableProps {
  initialCompetitors: Competitor[]; // Fetched data from parent
  isLoading: boolean;
  error: string | null;
}

export function CompetitorTable({ initialCompetitors, isLoading, error }: CompetitorTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    strengths: false,
    weaknesses: false,
    specialty: false,
    targetAudience: false,
    brandTone: false,
    brandPerception: false,
    marketShare: false,
    complaints: false,
    adThemes: false,
    seo: false,
    websiteQuality: false,
  })
  const [rowSelection, setRowSelection] = React.useState({})
  const [editingCell, setEditingCell] = React.useState<{
    id: string
    column: string
    value: any
  } | null>(null)
  const [competitors, setCompetitors] = React.useState<Competitor[]>(initialCompetitors)

  // Function to handle editing a cell
  const handleEdit = (id: string, column: string, value: any) => {
    setEditingCell({ id, column, value })
  }

  // Function to save edited cell
  const handleSave = () => {
    if (!editingCell) return

    const { id, column, value } = editingCell
    const updatedCompetitors = competitors.map((competitor) => {
      if (competitor.id === id) {
        // Handle nested properties
        if (column.includes(".")) {
          const [parent, child] = column.split(".")
          const parentValue = competitor[parent as keyof Competitor]
          return {
            ...competitor,
            [parent]: {
              ...(typeof parentValue === 'object' && parentValue !== null ? parentValue : {}),
              [child]: value,
            },
          }
        }
        // Handle array properties
        else if (Array.isArray(competitor[column as keyof Competitor])) {
          return {
            ...competitor,
            [column]: typeof value === "string" ? value.split(",").map((item) => item.trim()) : value,
          }
        }
        // Handle regular properties
        else {
          return {
            ...competitor,
            [column]: value,
          }
        }
      }
      return competitor
    })

    setCompetitors(updatedCompetitors)
    setEditingCell(null)
  }

  // Function to cancel editing
  const handleCancel = () => {
    setEditingCell(null)
  }

  // Define columns with edit functionality
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
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : editingCell.value}
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
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : editingCell.value}
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
          <div className="flex items-center gap-2">
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
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : editingCell.value}
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
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
        accessorKey: "brandPerception",
        header: "Brand Perception",
      cell: ({ row }) => {
        const perception = row.getValue("brandPerception") as { positive: string; negative: string }
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "brandPerception.positive") {
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

        if (editingCell && editingCell.id === id && editingCell.column === "brandPerception.negative") {
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
          <div className="grid gap-2">
                    <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-green-600">Positive:</div>
                      <Button
                        variant="ghost"
                size="icon"
                onClick={() => handleEdit(id, "brandPerception.positive", perception.positive)}
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                <Edit className="h-3 w-3" />
                      </Button>
                    </div>
            <div className="text-xs max-w-[200px]">{perception.positive}</div>

                    <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-red-600">Negative:</div>
                      <Button
                        variant="ghost"
                size="icon"
                onClick={() => handleEdit(id, "brandPerception.negative", perception.negative)}
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                <Edit className="h-3 w-3" />
                      </Button>
                    </div>
            <div className="text-xs max-w-[200px]">{perception.negative}</div>
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
          <div className="flex items-center gap-2">
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
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : editingCell.value}
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
          <div className="flex items-center gap-2">
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
                value={Array.isArray(editingCell.value) ? editingCell.value.join(", ") : editingCell.value}
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
                  <div className="flex items-center gap-2">
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
        accessorKey: "seo",
      header: "SEO Performance",
      cell: ({ row }) => {
        const seo = row.getValue("seo") as { domainAuthority: number; backlinks: number; organicTraffic: string }
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "seo.domainAuthority") {
          return (
            <div className="flex items-center gap-2">
                  <Input
                    type="number"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: Number.parseInt(e.target.value) })}
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

        if (editingCell && editingCell.id === id && editingCell.column === "seo.backlinks") {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: Number.parseInt(e.target.value) })}
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

        if (editingCell && editingCell.id === id && editingCell.column === "seo.organicTraffic") {
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
          <div className="grid gap-1 text-xs max-w-[200px]">
                    <div className="flex items-center justify-between">
              <span>Domain Authority:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{seo.domainAuthority}/100</span>
                      <Button
                        variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(id, "seo.domainAuthority", seo.domainAuthority)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                  <Edit className="h-3 w-3" />
                      </Button>
              </div>
                    </div>
                    <div className="flex items-center justify-between">
              <span>Backlinks:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{seo.backlinks.toLocaleString()}</span>
                      <Button
                        variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(id, "seo.backlinks", seo.backlinks)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                  <Edit className="h-3 w-3" />
                      </Button>
              </div>
                    </div>
                    <div className="flex items-center justify-between">
              <span>Organic Traffic:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{seo.organicTraffic}</span>
                      <Button
                        variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(id, "seo.organicTraffic", seo.organicTraffic)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                  <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
            </div>
          )
        },
      },
      {
        accessorKey: "websiteQuality",
        header: "Website Quality",
      cell: ({ row }) => {
        const quality = row.getValue("websiteQuality") as {
          uxScore: number
          loadingSpeed: string
          mobileResponsiveness: string
        }
        const id = row.original.id

        if (editingCell && editingCell.id === id && editingCell.column === "websiteQuality.uxScore") {
          return (
            <div className="flex items-center gap-2">
                  <Input
                    type="number"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: Number.parseInt(e.target.value) })}
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

        if (editingCell && editingCell.id === id && editingCell.column === "websiteQuality.loadingSpeed") {
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

        if (editingCell && editingCell.id === id && editingCell.column === "websiteQuality.mobileResponsiveness") {
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
          <div className="grid gap-1 text-xs max-w-[200px]">
                    <div className="flex items-center justify-between">
              <span>UX Score:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{quality.uxScore}/100</span>
                      <Button
                        variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(id, "websiteQuality.uxScore", quality.uxScore)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                  <Edit className="h-3 w-3" />
                      </Button>
              </div>
                    </div>
                    <div className="flex items-center justify-between">
              <span>Loading Speed:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{quality.loadingSpeed}</span>
                      <Button
                        variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(id, "websiteQuality.loadingSpeed", quality.loadingSpeed)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                  <Edit className="h-3 w-3" />
                      </Button>
              </div>
                    </div>
                    <div className="flex items-center justify-between">
              <span>Mobile:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{quality.mobileResponsiveness}</span>
                      <Button
                        variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(id, "websiteQuality.mobileResponsiveness", quality.mobileResponsiveness)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                  <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
            </div>
          )
        },
      },
      {
      accessorKey: "socialMetrics",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Social Metrics
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const metrics = row.getValue("socialMetrics") as { followers: number; }
        const id = row.original.id
        const facebookUrl = row.original.facebookUrl;

        if (editingCell && editingCell.id === id && editingCell.column === "socialMetrics.followers") {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: Number.parseInt(e.target.value) })}
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
          <div className="grid gap-1">
            <div className="flex items-center gap-1">
              <span>{metrics.followers.toLocaleString()} followers</span>
                      <Button
                        variant="ghost"
                size="icon"
                onClick={() => handleEdit(id, "socialMetrics.followers", metrics.followers)}
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                <Edit className="h-3 w-3" />
                      </Button>
                    </div>
            {facebookUrl && (
              <div className="flex items-center gap-1">
                <a
                  href={facebookUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-xs text-blue-600 hover:underline"
                >
                  Visit Facebook <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const metricsA = rowA.getValue("socialMetrics") as { followers: number }
        const metricsB = rowB.getValue("socialMetrics") as { followers: number }
        return metricsA.followers - metricsB.followers
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
                          <span>{competitor.socialMetrics.followers.toLocaleString()}</span>
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
                          <span>{competitor.seo.domainAuthority}/100</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Domain Authority Score</span>
                            <span>{competitor.seo.domainAuthority}/100</span>
                          </div>
                          <Progress value={competitor.seo.domainAuthority} className="h-2 mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Backlinks:</span>
                          <span>{competitor.seo.backlinks.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Organic Traffic:</span>
                          <span>{competitor.seo.organicTraffic}</span>
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
                            <span>{competitor.websiteQuality.uxScore}/100</span>
                          </div>
                          <Progress value={competitor.websiteQuality.uxScore} className="h-2 mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Loading Speed:</span>
                          <span>{competitor.websiteQuality.loadingSpeed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Mobile Responsiveness:</span>
                          <span>{competitor.websiteQuality.mobileResponsiveness}</span>
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
                          <p className="mt-1 text-sm">{competitor.brandPerception.positive}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-red-600">Negative Perception</h4>
                          <p className="mt-1 text-sm">{competitor.brandPerception.negative}</p>
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
    data: competitors,
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
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4 justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
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
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
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
              {table.getRowModel().rows?.length ? (
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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
