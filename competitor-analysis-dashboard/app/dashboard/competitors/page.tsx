import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CompetitorTable } from "@/components/dashboard/competitor-table"
import { CompetitorFilters } from "@/components/dashboard/competitor-filters"

export default function CompetitorsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Competitor Analysis" text="Comprehensive analysis of identified competitors." />
      <div className="grid gap-4">
        <CompetitorFilters />
        <CompetitorTable />
      </div>
    </DashboardShell>
  )
}
