import { Badge } from "@/components/ui/badge"
import { getPillarCoverageFromData } from "../data/creative-pillars"

import { Creative } from "../data/creative-data"

interface CreativePillarsDisplayProps {
  creatives: Creative[]
  showMissing?: boolean
}

export function CreativePillarsDisplay({ creatives, showMissing = false }: CreativePillarsDisplayProps) {
  const { used } = getPillarCoverageFromData(creatives)

  return (
    <>
      <div className="text-xs font-medium text-muted-foreground">Creative Pillars:</div>
      <div className="flex flex-wrap gap-1 mt-1">
        {used.length > 0 ? (
          used.map((pillar) => (
            <Badge
              key={pillar}
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 px-2 py-0.5 text-[11px] h-5 min-h-0"
            >
              {pillar}
            </Badge>
          ))
        ) : (
          <span className="text-[11px] text-muted-foreground">No creative pillars used</span>
        )}
      </div>
    </>
  )
}
