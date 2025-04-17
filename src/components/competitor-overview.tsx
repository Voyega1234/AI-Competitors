"use client"

import type React from "react"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CompetitorOverviewProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CompetitorOverview({ className, ...props }: CompetitorOverviewProps) {
  const data = [
    {
      name: "Competitor A",
      socialEngagement: 4000,
      seoScore: 2400,
      features: 2400,
    },
    {
      name: "Competitor B",
      socialEngagement: 3000,
      seoScore: 1398,
      features: 2210,
    },
    {
      name: "Competitor C",
      socialEngagement: 2000,
      seoScore: 9800,
      features: 2290,
    },
    {
      name: "Competitor D",
      socialEngagement: 2780,
      seoScore: 3908,
      features: 2000,
    },
    {
      name: "Competitor E",
      socialEngagement: 1890,
      seoScore: 4800,
      features: 2181,
    },
    {
      name: "Your Client",
      socialEngagement: 2390,
      seoScore: 3800,
      features: 2500,
    },
  ]

  return (
    <Card className={cn("col-span-4", className)} {...props}>
      <CardHeader>
        <CardTitle>Competitor Overview</CardTitle>
        <CardDescription>Comparative analysis of key metrics across identified competitors.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip />
            <Bar dataKey="socialEngagement" fill="#adfa1d" radius={[4, 4, 0, 0]} name="Social Engagement" />
            <Bar dataKey="seoScore" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="SEO Score" />
            <Bar dataKey="features" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Features" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
