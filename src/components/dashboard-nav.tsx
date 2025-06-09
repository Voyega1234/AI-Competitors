"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Home, Lightbulb, PieChart, Settings, Users, Palette } from "lucide-react"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

export function DashboardNav() {
  const pathname = usePathname()

  const routes = [
    {
      href: "/dashboard",
      icon: Home,
      title: "Overview",
    },
    {
      href: "/dashboard/new-analysis",
      icon: PieChart,
      title: "New Analysis",
    },
    {
      href: "/dashboard/competitors",
      icon: Users,
      title: "Competitors",
    },
    {
      href: "/dashboard/recommendations",
      icon: Lightbulb,
      title: "Recommendations",
    },
    {
      href: "/dashboard/creative-pillars",
      icon: Palette,
      title: "Creative Pillars",
    },
    {
      href: "/dashboard/reports",
      icon: FileText,
      title: "Reports",
    },
    {
      href: "/dashboard/settings",
      icon: Settings,
      title: "Settings",
    },
  ]

  return (
    <SidebarMenu>
      {routes.map((route) => (
        <SidebarMenuItem key={route.href}>
          <SidebarMenuButton asChild isActive={pathname === route.href} tooltip={route.title}>
            <Link href={route.href}>
              <route.icon className="h-4 w-4" />
              <span>{route.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
