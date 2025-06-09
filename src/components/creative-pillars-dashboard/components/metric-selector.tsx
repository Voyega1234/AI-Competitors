"use client"

import { ArrowDownAZ, ArrowUpAZ } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MetricSelectorProps {
  selectedMetric: string
  onMetricChange: (metric: string) => void
  sortOrder: "asc" | "desc"
  onSortOrderChange: (order: "asc" | "desc") => void
}

export function MetricSelector({ selectedMetric, onMetricChange, sortOrder, onSortOrderChange }: MetricSelectorProps) {
  const metrics = [
    { value: "ROAS", label: "Return on Ad Spend (ROAS)" },
    { value: "CTR", label: "Click-Through Rate (CTR)" },
    { value: "CPC", label: "Cost Per Click (CPC)" },
    { value: "Reach", label: "Reach" },
    { value: "Impressions", label: "Impressions" },
    { value: "Spend", label: "Spend" },
  ]

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <span className="text-sm font-medium mr-2">Priority Metric:</span>
        <Select value={selectedMetric} onValueChange={onMetricChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent>
            {metrics.map((metric) => (
              <SelectItem key={metric.value} value={metric.value}>
                {metric.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center">
        <span className="text-sm font-medium mr-2">Sort Order:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
          className="flex items-center gap-1"
        >
          {sortOrder === "asc" ? (
            <>
              <ArrowUpAZ className="h-4 w-4" />
              <span>Low to High</span>
            </>
          ) : (
            <>
              <ArrowDownAZ className="h-4 w-4" />
              <span>High to Low</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
