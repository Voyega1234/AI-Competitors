import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface RecentAnalysesProps extends React.HTMLAttributes<HTMLDivElement> {}

export function RecentAnalyses({ className, ...props }: RecentAnalysesProps) {
  return (
    <Card className={cn("col-span-3", className)} {...props}>
      <CardHeader>
        <CardTitle>Recent Analyses</CardTitle>
        <CardDescription>Your most recent competitor analyses.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div className="flex items-center">
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">Thai Food Delivery App</p>
              <p className="text-sm text-muted-foreground">5 competitors identified</p>
            </div>
            <div className="ml-auto font-medium">
              <Badge variant="outline">In Progress</Badge>
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">Bangkok Fitness Center</p>
              <p className="text-sm text-muted-foreground">8 competitors analyzed</p>
            </div>
            <div className="ml-auto font-medium">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Completed
              </Badge>
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">Thai E-commerce Platform</p>
              <p className="text-sm text-muted-foreground">10 competitors analyzed</p>
            </div>
            <div className="ml-auto font-medium">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Completed
              </Badge>
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">Phuket Tourism Agency</p>
              <p className="text-sm text-muted-foreground">6 competitors identified</p>
            </div>
            <div className="ml-auto font-medium">
              <Badge variant="outline">In Progress</Badge>
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">Bangkok Real Estate</p>
              <p className="text-sm text-muted-foreground">7 competitors analyzed</p>
            </div>
            <div className="ml-auto font-medium">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Completed
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
