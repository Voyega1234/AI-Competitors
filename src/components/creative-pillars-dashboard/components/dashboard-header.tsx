"use client"

import { useState, useEffect, useRef } from "react"
import { Download, Filter, Moon, Sun, RefreshCw } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { DatePickerWithRange } from "../components/date-range-picker"

interface DashboardHeaderProps {
  onClientProductChange?: (clientName: string | null, productFocus: string | null) => void;
  campaignType: "app" | "ecommerce";
  onCampaignTypeChange: (type: "app" | "ecommerce") => void;
}

export function DashboardHeader({ 
  onClientProductChange = () => {}, 
  campaignType, 
  onCampaignTypeChange 
}: DashboardHeaderProps) {
  const { setTheme } = useTheme()
  
  // State for client and product selection
  const [clientNames, setClientNames] = useState<string[]>([])
  const [productFocuses, setProductFocuses] = useState<string[]>([])
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null)
  const [selectedProductFocus, setSelectedProductFocus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch client names on component mount
  useEffect(() => {
    const fetchClientNames = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/clients')
        if (!response.ok) throw new Error('Failed to fetch client names')
        const data = await response.json()
        setClientNames(data.clients || [])
      } catch (err: any) {
        console.error("Error fetching client names:", err)
        setError("Could not load client list.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchClientNames()
  }, [])

  // Fetch product focuses when client name changes
  useEffect(() => {
    console.log('Client selection changed:', selectedClientName);
    
    if (!selectedClientName) {
      console.log('No client selected, clearing product focuses');
      setProductFocuses([]);
      setSelectedProductFocus(null);
      return;
    }

    const fetchProductFocuses = async () => {
      console.log('Fetching product focuses for client:', selectedClientName);
      
      setIsLoading(true);
      setError(null);
      
      // Only clear the product focuses if we have a new client
      if (selectedProductFocus) {
        console.log('Clearing previous product focus selection');
        setSelectedProductFocus(null);
      }
      
      try {
        const response = await fetch(`/api/products?clientName=${encodeURIComponent(selectedClientName)}`);
        if (!response.ok) throw new Error('Failed to fetch product focuses');
        
        const data = await response.json();
        console.log('Fetched product focuses:', data.products || []);
        
        setProductFocuses(data.products || []);
      } catch (err: any) {
        console.error("Error fetching product focuses:", err);
        setError(`Could not load products for ${selectedClientName}.`);
        setProductFocuses([]);
        setSelectedProductFocus(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProductFocuses();
  }, [selectedClientName]) // Removed onClientProductChange from deps to prevent loops

  // Notify parent when client or product selection changes
  const prevClientRef = useRef<string | null>(null);
  const prevProductRef = useRef<string | null>(null);

  useEffect(() => {
    // Only trigger the callback if the values have actually changed
    if (selectedClientName !== prevClientRef.current || 
        selectedProductFocus !== prevProductRef.current) {
      console.log('DashboardHeader: Selection changed', { 
        clientName: selectedClientName, 
        productFocus: selectedProductFocus 
      });
      onClientProductChange(selectedClientName, selectedProductFocus);
      
      // Update the refs with the current values
      prevClientRef.current = selectedClientName;
      prevProductRef.current = selectedProductFocus;
    }
  }, [selectedClientName, selectedProductFocus, onClientProductChange])

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Creative Coverage</h1>
          <Separator orientation="vertical" className="h-6" />
          {/* <Select value={campaignType} onValueChange={(value) => onCampaignTypeChange(value as "app" | "ecommerce")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Campaign Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="app">App Campaigns</SelectItem>
              <SelectItem value="ecommerce">Ecommerce Campaigns</SelectItem>
            </SelectContent>
          </Select> */}
        </div>
        
        {/* Client and Product Focus Selection */}
        <div className="ml-4 flex items-center gap-2">
          {/* Client Selector */}
          <Select
            value={selectedClientName ?? ""}
            onValueChange={(value) => setSelectedClientName(value || null)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Client..." />
            </SelectTrigger>
            <SelectContent>
              {isLoading && clientNames.length === 0 ? (
                <SelectItem value="loading-clients" disabled>Loading clients...</SelectItem>
              ) : clientNames.length > 0 ? (
                clientNames.map((client) => (
                  <SelectItem key={client} value={client}>{client}</SelectItem>
                ))
              ) : (
                <SelectItem value="no-clients" disabled>No clients available</SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* Product Focus Selector */}
          <div className="relative">
            <Select
              value={selectedProductFocus ?? ""}
              onValueChange={(value) => {
                console.log('Product focus changed to:', value);
                setSelectedProductFocus(value || null);
              }}
              disabled={!selectedClientName || isLoading || productFocuses.length === 0}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={!selectedClientName ? "Select client first" : "Select Product..."}>
                  {selectedProductFocus || (!selectedClientName ? "Select client first" : "Select Product...")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Loading products...</SelectItem>
                ) : selectedClientName && productFocuses.length > 0 ? (
                  productFocuses.map((product) => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))
                ) : selectedClientName ? (
                  <SelectItem value="no-products" disabled>No products available</SelectItem>
                ) : (
                  <SelectItem value="select-client" disabled>Select a client first</SelectItem>
                )}
              </SelectContent>
            </Select>
            {isLoading && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>
        
        {/* <div className="ml-auto flex items-center gap-2">
          <DatePickerWithRange />
          <Button variant="outline" size="icon" disabled={isLoading}>
            <Filter className="h-4 w-4" />
            <span className="sr-only">Filter</span>
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div> */}
      </div>
    </header>
  )
}
