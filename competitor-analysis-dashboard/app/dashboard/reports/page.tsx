import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ReportsList } from "@/components/dashboard/reports-list"
import { ReportsFilters } from "@/components/dashboard/reports-filters"

export default function ReportsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Reports" text="Access and export your competitor analysis reports." />
      <div className="grid gap-4">
        <ReportsFilters />
        <ReportsList />
      </div>
    </DashboardShell>
  )
}
