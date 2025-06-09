import Image from "next/image"
import { Calendar, DollarSign, Eye, TrendingUp, Users, Zap } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CreativeCardProps {
  creative: any
  isAdvantage?: boolean
  priorityMetric?: string
}

export function CreativeCard({ creative, isAdvantage = false, priorityMetric }: CreativeCardProps) {
  // Function to get the metric value and icon
  const getMetricValue = (metric: string) => {
    switch (metric) {
      case "ROAS":
        return { value: creative.roas || "N/A", icon: <TrendingUp className="h-3 w-3" /> }
      case "CTR":
        return { value: `${creative.ctr || 0}%`, icon: <TrendingUp className="h-3 w-3" /> }
      case "CPC":
        return { value: `$${creative.cpc || "0"}`, icon: <DollarSign className="h-3 w-3" /> }
      case "Reach":
        return { value: creative.reach || "0", icon: <Users className="h-3 w-3" /> }
      case "Impressions":
        return { value: creative.impressions || "0", icon: <Eye className="h-3 w-3" /> }
      case "Spend":
        return { value: `$${creative.spend || "0"}`, icon: <DollarSign className="h-3 w-3" /> }
      default:
        return { value: "N/A", icon: <TrendingUp className="h-3 w-3" /> }
    }
  }

  // Get the priority metric if specified
  const priorityMetricData = priorityMetric ? getMetricValue(priorityMetric) : null

  return (
    <Card className={`overflow-hidden ${isAdvantage ? "border-amber-200 dark:border-amber-800" : ""}`}>
      <CardContent className="p-0">
        <div className="relative">
          <Image
            src={creative.thumbnail_url || "/placeholder.svg?height=100&width=320"}
            alt={creative.name}
            width={320}
            height={100}
            className="h-[100px] w-full object-cover"
          />
          {isAdvantage && (
            <Badge className="absolute right-2 top-2 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <Zap className="h-3 w-3 mr-1" />
              Advantage+
            </Badge>
          )}

          {/* Display priority metric badge if specified */}
          {priorityMetricData && (
            <Badge className="absolute left-2 top-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {priorityMetricData.icon}
              <span className="ml-1">
                {priorityMetric}: {priorityMetricData.value}
              </span>
            </Badge>
          )}
        </div>
        <div className="p-3 space-y-2">
          <div className="flex flex-col">
  <h3 className="font-medium text-sm truncate" title={creative.name}>
    {creative.name}
  </h3>
  {creative.audience_segment && (
    <div className="text-xs text-muted-foreground italic truncate" title={creative.audience_segment}>
      {creative.audience_segment}
    </div>
  )}

          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{creative.launchDate}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{creative.reach || "0"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{creative.impressions}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>฿{typeof creative.spend === 'string' ? Number(creative.spend.replace(/\$/g, ""))?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Number(creative.spend || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
