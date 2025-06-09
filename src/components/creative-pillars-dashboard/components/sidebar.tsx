"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, ChevronDown, ChevronRight, Cog, Grid3X3, LayoutDashboard, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  return (
    <div className={cn("pb-12 min-h-screen border-r bg-background", open ? "w-64" : "w-16")}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {open && <h2 className="text-lg font-semibold tracking-tight">Creative Coverage</h2>}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setOpen(!open)}>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="px-3">
          <div className="space-y-1">
            <NavItem href="/" icon={LayoutDashboard} label="Dashboard" open={open} active={pathname === "/"} />
            <NavItem
              href="/audience-mapping"
              icon={Users}
              label="Audience Mapping"
              open={open}
              active={pathname === "/audience-mapping"}
            />
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start px-3 py-2 text-muted-foreground hover:text-foreground",
                    open ? "" : "justify-center",
                  )}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {open && (
                    <>
                      <span className="flex-1 text-left">Reports</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1">
                {open && (
                  <>
                    <NavItem href="/reports/funnel" icon={Grid3X3} label="Funnel Analysis" open={open} />
                    <NavItem href="/reports/performance" icon={BarChart3} label="Performance" open={open} />
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
            <NavItem href="/settings" icon={Cog} label="Settings" open={open} active={pathname === "/settings"} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: React.ElementType
  label: string
  open: boolean
  active?: boolean
}

function NavItem({ href, icon: Icon, label, open, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        open ? "" : "justify-center",
      )}
    >
      <Icon className="h-4 w-4 mr-2" />
      {open && <span>{label}</span>}
    </Link>
  )
}
