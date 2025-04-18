import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, Share2, Loader2, AlertTriangle, BrainCircuit } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Define the structure of a single recommendation (matches API output)
interface Recommendation {
  id?: string; // Optional ID if generated/needed later
  title: string;
  description: string;
  category: string;
  impact: string;
  competitiveGap?: string | null;
  tags?: string[] | null;
}

export function RecommendationCards() {

  // --- State for Data and Loading/Error ---
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Combined loading state
  const [error, setError] = useState<string | null>(null);

  // --- State for Client/Product Selection ---
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [productFocuses, setProductFocuses] = useState<string[]>([]);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedProductFocus, setSelectedProductFocus] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isMetaLoading, setIsMetaLoading] = useState<boolean>(false); // Loading state for client/product lists
  const [metaError, setMetaError] = useState<string | null>(null); // Error state for client/product lists
  const [userBrief, setUserBrief] = useState<string>(""); // State for user brief

  // --- Fetch Client Names on Mount ---
  useEffect(() => {
    const fetchClientNames = async () => {
      setIsMetaLoading(true);
      setMetaError(null);
      try {
        const response = await fetch('/api/clients');
        if (!response.ok) throw new Error('Failed to fetch client names');
        const data = await response.json();
        setClientNames(data.clients || []);
      } catch (err: any) {
        console.error("Error fetching client names for recommendations:", err);
        setMetaError("Could not load client list.");
      } finally {
        setIsMetaLoading(false);
      }
    };
    fetchClientNames();
  }, []);

  // --- Fetch Product Focuses when Client Name changes ---
  useEffect(() => {
    if (!selectedClientName) {
      setProductFocuses([]);
      setSelectedProductFocus(null);
      setSelectedRunId(null); // Clear runId if client changes
      setRecommendations(null); // Clear recommendations
      setError(null);
      return;
    }

    const fetchProductFocuses = async () => {
      setIsMetaLoading(true);
      setMetaError(null);
      setProductFocuses([]); // Clear previous products
      setSelectedProductFocus(null); // Reset selection
      setSelectedRunId(null); // Clear runId
      setRecommendations(null); // Clear recommendations
      setError(null);
      try {
        const response = await fetch(`/api/products?clientName=${encodeURIComponent(selectedClientName)}`);
        if (!response.ok) throw new Error('Failed to fetch product focuses');
        const data = await response.json();
        setProductFocuses(data.products || []);
      } catch (err: any) {
        console.error("Error fetching product focuses for recommendations:", err);
        setMetaError(`Could not load products for ${selectedClientName}.`);
      } finally {
        setIsMetaLoading(false);
      }
    };

    fetchProductFocuses();
  }, [selectedClientName]);

  // --- Fetch Analysis Run ID when Client & Product are selected ---
  // We fetch this *before* generating, to ensure the run exists
  const fetchAnalysisRunId = async () => {
     if (!selectedClientName || !selectedProductFocus) return;
     
     setIsMetaLoading(true);
     setMetaError(null);
     setSelectedRunId(null); // Clear previous
     setRecommendations(null); // Clear recommendations
     setError(null);

     try {
        const productFocusForQuery = selectedProductFocus === 'placeholder-for-empty' ? null : selectedProductFocus;
        const queryParams = new URLSearchParams({ clientName: selectedClientName });
        if (productFocusForQuery !== null) {
            queryParams.set('productFocus', productFocusForQuery);
        }
        const runResponse = await fetch(`/api/analysis-run?${queryParams.toString()}`);
        if (!runResponse.ok) {
            if (runResponse.status === 404) throw new Error(`No analysis run found for ${selectedClientName} - ${productFocusForQuery ?? 'N/A'}. Recommendations cannot be generated.`);
            else throw new Error('Failed to verify analysis run');
        }
        const runData = await runResponse.json();
        if (!runData.id) throw new Error('Analysis run ID missing from response.');
        setSelectedRunId(runData.id);
        console.log("Found runId for recommendations:", runData.id);
     } catch (err: any) {
         console.error("Error fetching analysis run ID:", err);
         setMetaError(err.message);
     } finally {
         setIsMetaLoading(false);
     }
  };

   // Trigger Run ID fetch when product focus is selected
   useEffect(() => {
       if (selectedClientName && selectedProductFocus) {
           fetchAnalysisRunId();
       }
   }, [selectedClientName, selectedProductFocus]);


  // --- Generate Recommendations when Generate Button is Clicked ---
  const handleGenerateRecommendations = async () => {
    if (!selectedRunId) {
      setError("Please select a valid Client and Product combination first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecommendations(null); // Clear previous results

    try {
      console.log(`Fetching recommendations for runId: ${selectedRunId}`);
      let apiUrl = `/api/generate-recommendations?runId=${selectedRunId}`;
      if (userBrief.trim()) {
        apiUrl += `&brief=${encodeURIComponent(userBrief.trim())}`; // Append brief if provided
      }
      const response = await fetch(apiUrl); // Use updated URL
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.status}` })); // Attempt to parse error
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err: any) {
      console.error("Failed to fetch recommendations:", err);
      setError(err.message || "An unknown error occurred while generating recommendations.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div>
      {/* --- Selection UI --- */}
       <div className="flex flex-col gap-4 p-4 border rounded-lg mb-6 bg-muted/40">
           <div className="flex items-end gap-2 flex-wrap">
             {/* Client Selector */}
             <div className="grid gap-1.5">
               <Label htmlFor="rec-client-select" className="text-sm font-medium">Select Client</Label>
               <Select
                 value={selectedClientName ?? ""}
                 onValueChange={(value) => setSelectedClientName(value || null)}
                 disabled={isMetaLoading}
               >
                 <SelectTrigger className="h-9 w-[250px] bg-background" id="rec-client-select">
                   <SelectValue placeholder="Select Client..." />
                 </SelectTrigger>
                 <SelectContent>
                   {clientNames.length > 0 ? (
                     clientNames.map(name => (
                       <SelectItem key={name} value={name}>{name}</SelectItem>
                     ))
                   ) : (
                     <SelectItem value="loading-clients" disabled>Loading clients...</SelectItem>
                   )}
                 </SelectContent>
               </Select>
             </div>

             {/* Product Focus Selector */}
             <div className="grid gap-1.5">
                <Label htmlFor="rec-product-select" className="text-sm font-medium">Select Product</Label>
                <Select
                  value={selectedProductFocus ?? ""}
                  onValueChange={(value) => setSelectedProductFocus(value || null)}
                  disabled={!selectedClientName || isMetaLoading || productFocuses.length === 0}
                >
                  <SelectTrigger className="h-9 w-[250px] bg-background" id="rec-product-select">
                    <SelectValue placeholder={!selectedClientName ? "Select client first" : "Select Product Focus..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClientName && productFocuses.length > 0 ? (
                      productFocuses.map(focus => (
                        <SelectItem key={focus} value={focus || "placeholder-for-empty"}>{focus || "N/A"}</SelectItem>
                      ))
                    ) : selectedClientName ? (
                      <SelectItem value="loading-products" disabled>Loading products...</SelectItem>
                    ) : null}
                   </SelectContent>
                </Select>
              </div>

             {/* Generate Button */}
             <Button
                onClick={handleGenerateRecommendations}
                disabled={!selectedRunId || isLoading || isMetaLoading} // Disabled if no valid runId or loading
                className="h-9"
             >
                 <BrainCircuit className="mr-2 h-4 w-4" />
                {isLoading ? "Generating..." : "Generate Ideas"}
             </Button>
              
             {/* Meta Loading/Error Display */}
              {isMetaLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground ml-2" />}
              {metaError && !isMetaLoading && <span className="text-xs text-destructive ml-2">{metaError}</span>}
           </div>

           {/* User Brief Input */}
           <div className="grid gap-1.5 w-full">
               <Label htmlFor="rec-user-brief" className="text-sm font-medium">Optional Brief for Gemini</Label>
               <Textarea
                   id="rec-user-brief"
                   placeholder="Provide additional context or specific instructions for the AI (e.g., 'Focus on promotions targeting students', 'Generate ideas for social media campaigns only')..."
                   value={userBrief}
                   onChange={(e) => setUserBrief(e.target.value)}
                   className="min-h-[80px] bg-background"
                   disabled={isLoading || isMetaLoading}
               />
           </div>
         </div>

      {/* --- Display Area --- */}
      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center p-10 border rounded-lg min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Generating recommendations...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
         <div className="flex flex-col justify-center items-center p-10 border border-destructive bg-destructive/10 rounded-lg min-h-[200px] text-destructive">
           <AlertTriangle className="h-8 w-8 mb-2" />
           <p className="font-semibold mb-1">Error Generating Recommendations</p>
           <p className="text-sm text-center">{error}</p>
         </div>
       )}

      {/* No Recommendations or Initial State */}
      {!isLoading && !error && (!recommendations || recommendations.length === 0) && (
         <div className="flex justify-center items-center p-10 border rounded-lg min-h-[200px]">
           <p className="text-muted-foreground">Select a Client/Product and click "Generate Ideas".</p>
         </div>
       )}

      {/* Display Recommendations */}
      {!isLoading && !error && recommendations && recommendations.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((recommendation, index) => (
              // Use index as key if no stable ID is provided by API yet
              <Card key={recommendation.id || `rec-${index}`} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {recommendation.category ?? 'Uncategorized'}
                    </Badge>
                    <Badge
                      variant="outline"
                      // Use cn for conditional classes based on impact
                      className={cn(
                        "bg-blue-50 text-blue-700 border-blue-200", // Default (Medium/Low/Other)
                        recommendation.impact?.toLowerCase() === "high" && "bg-orange-50 text-orange-700 border-orange-200",
                        recommendation.impact?.toLowerCase() === "medium" && "bg-yellow-50 text-yellow-700 border-yellow-200", // Example for Medium
                        recommendation.impact?.toLowerCase() === "low" && "bg-gray-50 text-gray-700 border-gray-200" // Example for Low
                      )}
                    >
                      {recommendation.impact ?? 'N/A'} Impact
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl">{recommendation.title ?? 'Untitled Recommendation'}</CardTitle>
                  {recommendation.competitiveGap && (
                      <CardDescription className="text-sm text-muted-foreground">
                        Based on gap: {recommendation.competitiveGap}
                      </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm">{recommendation.description ?? 'No description provided.'}</p>
                  {(recommendation.tags && recommendation.tags.length > 0) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {recommendation.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" size="sm">
                    <Bookmark className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
       )}
    </div>
  )
}
