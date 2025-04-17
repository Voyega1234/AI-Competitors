import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CompetitorOverview } from "@/components/dashboard/competitor-overview"
import { RecentAnalyses } from "@/components/dashboard/recent-analyses"
import { AnalysisMetrics } from "@/components/dashboard/analysis-metrics"

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Dashboard" text="Get a comprehensive overview of your competitor analysis." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalysisMetrics />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <CompetitorOverview className="col-span-4" />
        <RecentAnalyses className="col-span-3" />
      </div>
    </DashboardShell>
  )
}
