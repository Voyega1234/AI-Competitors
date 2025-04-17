import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Share2 } from "lucide-react"

export function ReportsList() {
  const reports = [
    {
      id: "1",
      title: "Thai Food Delivery Competitive Analysis",
      description: "Complete analysis of 5 food delivery competitors in Thailand",
      date: "2023-04-15",
      type: "Full Report",
      format: "PDF, Excel",
    },
    {
      id: "2",
      title: "Bangkok Fitness Center Market Position",
      description: "Analysis of 8 fitness centers in Bangkok metropolitan area",
      date: "2023-03-22",
      type: "Full Report",
      format: "PDF, Excel",
    },
    {
      id: "3",
      title: "Thai E-commerce Platform Comparison",
      description: "Detailed comparison of 10 e-commerce platforms in Thailand",
      date: "2023-02-10",
      type: "Full Report",
      format: "PDF, Excel, CSV",
    },
    {
      id: "4",
      title: "Phuket Tourism Agency Competitive Landscape",
      description: "Analysis of 6 tourism agencies operating in Phuket",
      date: "2023-01-28",
      type: "Preliminary Report",
      format: "PDF",
    },
    {
      id: "5",
      title: "Bangkok Real Estate Developer Comparison",
      description: "Comparison of 7 real estate developers in Bangkok",
      date: "2022-12-15",
      type: "Full Report",
      format: "PDF, Excel, CSV",
    },
  ]

  return (
    <div className="grid gap-6">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl">{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </div>
            <Badge variant="outline">{report.type}</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center space-x-4">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Available formats: {report.format}</p>
                  <p className="text-sm text-muted-foreground">
                    Generated on {new Date(report.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
