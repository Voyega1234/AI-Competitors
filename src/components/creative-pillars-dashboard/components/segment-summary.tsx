import { Award, Clock, ImageIcon } from "lucide-react"

export function SegmentSummary({ segment }: { segment: any }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center gap-1">
        <ImageIcon className="h-3 w-3 text-muted-foreground" />
        <span>{segment.creatives.length} Creatives</span>
      </div>
      <div className="flex items-center gap-1">
        <Award className="h-3 w-3 text-muted-foreground" />
        <span>Top CTR: {segment.topCtr}%</span>
      </div>
      <div className="flex items-center gap-1 col-span-2">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span>Last refresh: {segment.lastRefresh}</span>
      </div>
    </div>
  )
}
