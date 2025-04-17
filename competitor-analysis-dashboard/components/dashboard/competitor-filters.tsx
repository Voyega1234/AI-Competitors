"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Filter, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

export function CompetitorFilters() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input placeholder="Search competitors..." className="h-9 w-full sm:w-[300px]" />
          <Select defaultValue="all">
            <SelectTrigger className="h-9 w-full sm:w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="food">Food Delivery</SelectItem>
              <SelectItem value="ecommerce">E-commerce</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 gap-1">
                <Plus className="h-4 w-4" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Competitor</DialogTitle>
                <DialogDescription>
                  Add a new competitor to track and analyze. Fill in as much information as you have available.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Competitor Name</Label>
                    <Input id="name" placeholder="e.g., Thai Food Express" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" placeholder="e.g., https://thaifoodexpress.co.th" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="services">Services Offered</Label>
                    <Textarea id="services" placeholder="Enter services separated by commas" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pricing">Pricing</Label>
                    <Input id="pricing" placeholder="e.g., 15% Commission" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="strengths">Strengths</Label>
                    <Textarea id="strengths" placeholder="Enter strengths separated by commas" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weaknesses">Weaknesses</Label>
                    <Textarea id="weaknesses" placeholder="Enter weaknesses separated by commas" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <Textarea id="specialty" placeholder="What is this competitor especially known for?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="targetAudience">Target Audience</Label>
                    <Textarea id="targetAudience" placeholder="Describe the target demographics" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="brandTone">Brand Tone & Voice</Label>
                    <Textarea id="brandTone" placeholder="e.g., Formal, casual, humorous" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="positivePerception">Positive Brand Perception</Label>
                    <Textarea id="positivePerception" placeholder="Positive customer sentiment" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="negativePerception">Negative Brand Perception</Label>
                    <Textarea id="negativePerception" placeholder="Negative customer sentiment" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setOpen(false)}>Add Competitor</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="h-8">
          All Competitors
        </Button>
        <Button variant="outline" size="sm" className="h-8">
          Food Delivery
        </Button>
        <Button variant="outline" size="sm" className="h-8">
          Ride Sharing
        </Button>
        <Button variant="outline" size="sm" className="h-8">
          Grocery Delivery
        </Button>
        <Button variant="outline" size="sm" className="h-8">
          Zero Commission
        </Button>
        <Button variant="outline" size="sm" className="h-8">
          Premium Services
        </Button>
      </div>
    </div>
  )
}
