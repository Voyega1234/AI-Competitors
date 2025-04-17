import type React from "react"
import { MainNav } from "@/components/dashboard/main-nav"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { SiteFooter } from "@/components/dashboard/site-footer"
import { UserNav } from "@/components/dashboard/user-nav"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="container flex h-16 items-center justify-between py-4">
            <MainNav />
            <UserNav />
          </div>
        </header>
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
          <Sidebar variant="inset" collapsible="icon">
            <SidebarHeader className="flex h-[60px] items-center px-4">
              <span className="font-semibold">CompetitorSense</span>
            </SidebarHeader>
            <SidebarContent>
              <DashboardNav />
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">© 2025 CompetitorSense</span>
              </div>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <main className="flex w-full flex-1 flex-col overflow-hidden p-4 md:p-6">{children}</main>
          </SidebarInset>
        </div>
        <SiteFooter className="border-t" />
      </div>
    </SidebarProvider>
  )
}
