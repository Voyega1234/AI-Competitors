import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BarChart3 } from "lucide-react"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/dashboard" className="hidden items-center space-x-2 md:flex">
        <BarChart3 className="h-6 w-6" />
        <span className="hidden font-bold sm:inline-block">CompetitorSense</span>
      </Link>
      <nav className={cn("flex items-center space-x-6", className)} {...props}>
        <Link href="/dashboard" className="flex items-center text-sm font-medium transition-colors hover:text-primary">
          Dashboard
        </Link>
        <Link
          href="/dashboard/competitors"
          className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Competitors
        </Link>
        <Link
          href="/dashboard/recommendations"
          className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Recommendations
        </Link>
        <Link
          href="/dashboard/reports"
          className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Reports
        </Link>
      </nav>
    </div>
  )
}
