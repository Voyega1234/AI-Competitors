import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"

interface DashboardHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
  className?: string
}

export function DashboardHeader({ heading, text, children, className }: DashboardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between px-2", className)}>
      <div className="grid gap-1">
        <h1 className="font-heading text-3xl md:text-4xl">{heading}</h1>
        {text && <p className="text-lg text-muted-foreground">{text}</p>}
      </div>
      {heading === "Dashboard" && (
        <Link href="/dashboard/new-analysis">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </Link>
      )}
      {children}
    </div>
  )
}
