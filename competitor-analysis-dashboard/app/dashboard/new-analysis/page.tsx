import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { NewAnalysisForm } from "@/components/dashboard/new-analysis-form"

export default function NewAnalysisPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="New Analysis"
        text="Start a new competitor analysis by entering your client's information."
      />
      <div className="grid gap-8">
        <NewAnalysisForm />
      </div>
    </DashboardShell>
  )
}
