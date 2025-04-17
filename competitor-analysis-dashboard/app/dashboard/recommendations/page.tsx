import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { RecommendationCards } from "@/components/dashboard/recommendation-cards"
import { RecommendationFilters } from "@/components/dashboard/recommendation-filters"

export default function RecommendationsPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Creative Recommendations"
        text="AI-generated creative ideas based on competitive analysis."
      />
      <div className="grid gap-4">
        <RecommendationFilters />
        <RecommendationCards />
      </div>
    </DashboardShell>
  )
}
