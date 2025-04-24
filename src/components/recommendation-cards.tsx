import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bookmark, Share2, Loader2, AlertTriangle, BrainCircuit, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";

// --- Define Defaults for Editable Prompt Sections ---
const DEFAULT_TASK_SECTION = `1. Spark and detail 7-10 fresh, distinctive, and engaging creative ideas for\`ClientName\` specifically focusing on concepts highly suitable for Facebook Ad campaigns. Focus on concepts that can present the client's specific productFocus from new perspectives that spark curiosity, drive engagement, or create a memorable impression within the market on social media. Ideas should build upon the client's strengths and available insights.
2. Focus on Actionable Creativity for Facebook: Ensure each recommendation translates into tangible marketing ideas easily adaptable into compelling Facebook Ad formats (e.g., single image/video, carousel, stories, reels). Include potential ad angles, visual directions, and calls-to-action. Prioritize ideas that are visually arresting, memorable, shareable, emotionally resonant, and push creative boundaries for this specific client on Facebook.
3. Informed by Context: Where available, let the \`groundedClientInfo\` and \`bookSummarySection\` inform the relevance, timeliness, or strategic angle of your ideas, but the core inspiration should stem from the client's fundamental product/service and market position. Use grounding to verify trends or competitor actions if needed.
4. For EACH recommendation, provide the Creative Execution Details below, specifically tailored for a Facebook Ad context. Generate specific, compelling content for each field IN THAI LANGUAGE, imagining how the core idea translates into ad components (e.g., Headline, Ad Copy, Visual Description, Call-to-Action).
5. Populate the corresponding fields in the final JSON object. Ensure all text output is original for this request.
6. Ideas to include but not limited to: why the solutions from \`ClientName\` are different than what is being offered in the market currently. Talk about the differentiation of the product if and when it makes the client's product or service more appealing. `;

const DEFAULT_DETAILS_SECTION = `a.  **\`content_pillar\`:** กำหนดธีมเนื้อหาหลักหรือหมวดหมู่ **(ภาษาไทย)** (เช่น "เคล็ดลับฮาวทู", "เบื้องหลังการทำงาน", "เรื่องราวความสำเร็จลูกค้า", "การหักล้างความเชื่อผิดๆ", "ไลฟ์สไตล์และการใช้งาน", "ปัญหาและการแก้ไข").
                                b.  **\`product_focus\`:** ระบุ {productFocus} หรือฟีเจอร์เฉพาะที่ต้องการเน้น **(ภาษาไทย)**.
                                c.  **\`concept_idea\`:** สรุปแนวคิดสร้างสรรค์หลัก (1-2 ประโยค) สำหรับการนำเสนอไอเดียนี้ **(ภาษาไทย)**.
                                d.  **\`copywriting\`:** สร้างสรรค์องค์ประกอบข้อความโฆษณาเบื้องต้น **(ภาษาไทย)**:
                                    *   **\`headline\`:** พาดหัวที่ดึงดูดความสนใจ **(ภาษาไทย)**.
                                    *   **\`sub_headline_1\`:** พาดหัวรองที่ขยายความหรือเน้นประโยชน์ **(ภาษาไทย)**.
                                    *   **\`sub_headline_2\`:** พาดหัวรองที่สอง (ถ้ามี) เพื่อเพิ่มบริบทหรือความเร่งด่วน **(ภาษาไทย)** (ใช้ \`null\` หากไม่ต้องการ).
                                    *   **\`bullets\`:** รายการจุดเด่น 2-4 ข้อที่เน้นประโยชน์หลัก, ฟีเจอร์ หรือเหตุผลที่น่าเชื่อถือ **(ภาษาไทย)**.
                                    *   **\`cta\`:** ข้อความเรียกร้องให้ดำเนินการ (Call To Action) ที่ชัดเจน **(ภาษาไทย)** (เช่น "เรียนรู้เพิ่มเติม", "ซื้อเลย", "ดูเดโม", "เข้าร่วม Waiting List", "ดาวน์โหลดคู่มือ").`;


// --- Define Expected Structures ---
// (Keep existing interfaces: TopicIdeasStructure, CopywritingStructure, Recommendation)
// Nested structure for Topic Ideas
interface TopicIdeasStructure {
    product_benefits_th?: string; // Make optional for safety
    pain_points_emotional_th?: string; // Make optional for safety
    promotion_after_services_th?: string; // Make optional for safety
}

// Define the structure for the copywriting details
interface CopywritingStructure {
    headline?: string; // Make optional for safety
    sub_headline_1?: string; // Make optional for safety
    sub_headline_2?: string | null; // Make optional for safety
    bullets?: string[]; // Make optional for safety
    cta?: string; // Make optional for safety
}

// Updated structure for a recommendation generated by Gemini
interface Recommendation {
    id?: string; // Optional ID if generated/needed later
    title: string;
    description: string;
    category: string;
    impact: string;
    competitiveGap?: string | null;
    tags?: string[] | null;
    // --- REVERTED Strategic Analysis Fields ---
    purpose_th?: string;        // Make optional for safety
    target_audience_th?: string; // Make optional for safety
    context_th?: string;         // Make optional for safety
    constraints_th?: string;     // Make optional for safety
    competitors_th?: string;     // Make optional for safety
    untapped_potential_th?: string; // Make optional for safety
    // --- Marketing Execution Ideas (Keep existing) ---
    promoted_product_th?: string; // Make optional for safety
    mood_and_tone_th?: string;    // Make optional for safety
    key_message_th?: string;      // Make optional for safety
    execution_example_th?: string; // Make optional for safety

    // --- NEW: Creative Execution Details ---
    content_pillar?: string;        // Make optional for safety
    product_focus?: string;       // Make optional for safety
    concept_idea?: string;        // Make optional for safety
    copywriting?: CopywritingStructure; // Nested object for copy details
}

// --- Define available models ---
const AVAILABLE_MODELS = ['gemini', 'openai', 'claude']; // Define model names

// --- Types for Multi-Model State ---
type ModelResults = { [modelName: string]: Recommendation[] | null };
type ModelLoadingState = { [modelName: string]: boolean };
type ModelErrorState = { [modelName: string]: string | null };

export function RecommendationCards() {

    // --- State for Data and Loading/Error (Updated for Multi-Model) ---
    const [resultsByModel, setResultsByModel] = useState<ModelResults>({});
    const [isLoading, setIsLoading] = useState<ModelLoadingState>({});
    const [error, setError] = useState<ModelErrorState>({});
    const [modelsRequestedInLastRun, setModelsRequestedInLastRun] = useState<string[]>([]); // Track models for current results

    // --- State for Dialog ---
    const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
    // --- State for Image Generation in Dialog ---
    const [aspectRatio, setAspectRatio] = useState<string>('ASPECT_16_9');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
    const [imageError, setImageError] = useState<string | null>(null);

    // --- State for Client/Product Selection ---
    const [clientNames, setClientNames] = useState<string[]>([]);
    const [productFocuses, setProductFocuses] = useState<string[]>([]);
    const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
    const [selectedProductFocus, setSelectedProductFocus] = useState<string | null>(null);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [isMetaLoading, setIsMetaLoading] = useState<boolean>(false);
    const [metaError, setMetaError] = useState<string | null>(null);
    const [userBrief, setUserBrief] = useState<string>("");
    const [editableTaskSection, setEditableTaskSection] = useState<string>(DEFAULT_TASK_SECTION);
    const [editableDetailsSection, setEditableDetailsSection] = useState<string>(DEFAULT_DETAILS_SECTION);

    // --- NEW: State for Model Selection ---
    const [selectedModels, setSelectedModels] = useState<string[]>(['gemini']); // Default to Gemini

    // --- Force re-render check ---
    useEffect(() => {
        if (selectedRecommendation) {
            console.log('Dialog should be showing data for:', selectedRecommendation.title);
        }
    }, [selectedRecommendation]);

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
                console.error("Error fetching client names:", err);
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
            setSelectedRunId(null);
            setResultsByModel({}); // Clear results
            setError({});
            setIsLoading({});
            setModelsRequestedInLastRun([]);
            return;
        }

        const fetchProductFocuses = async () => {
            setIsMetaLoading(true);
            setMetaError(null);
            setProductFocuses([]);
            setSelectedProductFocus(null);
            setSelectedRunId(null);
            setResultsByModel({}); // Clear results
            setError({});
            setIsLoading({});
            setModelsRequestedInLastRun([]);
            try {
                const response = await fetch(`/api/products?clientName=${encodeURIComponent(selectedClientName)}`);
                if (!response.ok) throw new Error('Failed to fetch product focuses');
                const data = await response.json();
                setProductFocuses(data.products || []);
            } catch (err: any) {
                console.error("Error fetching product focuses:", err);
                setMetaError(`Could not load products for ${selectedClientName}.`);
            } finally {
                setIsMetaLoading(false);
            }
        };

        fetchProductFocuses();
    }, [selectedClientName]);

    // --- Fetch Analysis Run ID ---
    const fetchAnalysisRunId = async () => {
        if (!selectedClientName || !selectedProductFocus) return;

        setIsMetaLoading(true);
        setMetaError(null);
        setSelectedRunId(null);
        setResultsByModel({}); // Clear results
        setError({});
        setIsLoading({});
        setModelsRequestedInLastRun([]);

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

    useEffect(() => {
        if (selectedClientName && selectedProductFocus) {
            fetchAnalysisRunId();
        }
    }, [selectedClientName, selectedProductFocus]);

    // --- Generate Recommendations (Updated for Multi-Model) ---
    const handleGenerateRecommendations = async () => {
        if (!selectedRunId) {
            // Set a general error or handle appropriately
            setMetaError("Please select a valid Client and Product combination first.");
            return;
        }
        if (selectedModels.length === 0) {
            setMetaError("Please select at least one generation model.");
            return;
        }

        // Reset state for the selected models
        const initialLoadingState: ModelLoadingState = {};
        const initialErrorState: ModelErrorState = {};
        selectedModels.forEach(model => {
            initialLoadingState[model] = true;
            initialErrorState[model] = null;
        });
        setIsLoading(initialLoadingState);
        setError(initialErrorState);
        setResultsByModel({}); // Clear previous results entirely
        setSelectedRecommendation(null); // Reset selected recommendation
        setModelsRequestedInLastRun(selectedModels); // Track which models were requested for tab generation

        try {
            console.log(`Fetching recommendations for runId: ${selectedRunId}, Models: ${selectedModels.join(', ')}`);
            let apiUrl = `/api/generate-recommendations?runId=${selectedRunId}`;

            // Append selected models
            apiUrl += `&models=${encodeURIComponent(selectedModels.join(','))}`;

            // Append other params
            if (userBrief.trim()) {
                apiUrl += `&brief=${encodeURIComponent(userBrief.trim())}`;
            }
            apiUrl += `&taskSection=${encodeURIComponent(editableTaskSection)}`;
            apiUrl += `&detailsSection=${encodeURIComponent(editableDetailsSection)}`;

            const response = await fetch(apiUrl);
            const data = await response.json(); // Assume API returns structure { results: { model: [...] }, errors: { model: "..." } }

            if (!response.ok) {
                // Handle general API error - apply to all requested models for simplicity
                const errorMsg = data.error || `API Error: ${response.status}`;
                console.error("API Error:", errorMsg);
                const newErrorState = { ...initialErrorState };
                selectedModels.forEach(model => {
                    newErrorState[model] = errorMsg;
                });
                setError(newErrorState);
                setResultsByModel({}); // Ensure no stale results displayed
            } else {
                // Process successful response containing potentially partial results/errors
                setResultsByModel(data.results || {}); // Store results keyed by model name
                setError(prevErrors => ({ ...prevErrors, ...(data.errors || {}) })); // Merge any errors reported per model
            }

        } catch (err: any) {
            // Handle fetch-level errors - apply to all requested models
            console.error("Failed to fetch recommendations:", err);
            const errorMsg = err.message || "An unknown error occurred while generating recommendations.";
            const newErrorState = { ...initialErrorState };
            selectedModels.forEach(model => {
                newErrorState[model] = errorMsg;
            });
            setError(newErrorState);
            setResultsByModel({});
        } finally {
            // Update loading state for all requested models
            const finalLoadingState: ModelLoadingState = {};
            selectedModels.forEach(model => {
                finalLoadingState[model] = false;
            });
            setIsLoading(finalLoadingState);
        }
    };

    // --- Handler for Model Checkbox Change ---
    const handleModelSelectionChange = (modelName: string, checked: boolean | "indeterminate") => {
        setSelectedModels(prev => {
            if (checked) {
                return [...prev, modelName]; // Add model
            } else {
                return prev.filter(m => m !== modelName); // Remove model
            }
        });
    };

    // Handler to set the selected recommendation for the dialog
    const handleCardClick = (recommendation: Recommendation) => {
        setSelectedRecommendation(recommendation);
        // Reset image state when a new card is clicked
        setGeneratedImageUrl(null);
        setIsImageLoading(false);
        setImageError(null);
        setAspectRatio('ASPECT_16_9');
    };

    // --- Generate Image ---
    const handleGenerateImage = async () => {
        if (!selectedRecommendation) return;

        setIsImageLoading(true);
        setImageError(null);
        setGeneratedImageUrl(null); // Clear previous image

        let imagePrompt = selectedRecommendation.concept_idea || '';
        if (selectedRecommendation.copywriting?.headline) {
            imagePrompt += `. Headline: ${selectedRecommendation.copywriting.headline}`;
        }

        if (!imagePrompt.trim()) {
            setImageError("Cannot generate image: Missing concept or headline in recommendation details.");
            setIsImageLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputText: imagePrompt,
                    aspect_ratio: aspectRatio
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `API Error: ${response.status}`);
            }

            if (!data.imageUrl) {
                 throw new Error('API did not return an image URL.');
            }

            setGeneratedImageUrl(data.imageUrl);

        } catch (err: any) {
            console.error("Failed to generate image:", err);
            setImageError(err.message || "An unknown error occurred during image generation.");
        } finally {
            setIsImageLoading(false);
        }
    };

    // Calculate if any model is currently loading
    const isAnyModelLoading = Object.values(isLoading).some(status => status);
    // Determine default tab (first selected model for the last run, or first available model)
    const defaultTab = modelsRequestedInLastRun.length > 0 ? modelsRequestedInLastRun[0] : (selectedModels.length > 0 ? selectedModels[0] : AVAILABLE_MODELS[0]);


    return (
        <Dialog onOpenChange={(open) => {
            if (!open) {
                setGeneratedImageUrl(null);
                setIsImageLoading(false);
                setImageError(null);
                setAspectRatio('ASPECT_16_9');
            }
        }}>
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
                                disabled={isMetaLoading || isAnyModelLoading}
                            >
                                <SelectTrigger className="h-9 w-[200px] bg-background" id="rec-client-select">
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
                                disabled={!selectedClientName || isMetaLoading || productFocuses.length === 0 || isAnyModelLoading}
                            >
                                <SelectTrigger className="h-9 w-[200px] bg-background" id="rec-product-select">
                                    <SelectValue placeholder={!selectedClientName ? "Select client first" : "Select Product..."} />
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
                            disabled={!selectedRunId || selectedModels.length === 0 || isAnyModelLoading || isMetaLoading}
                            className="h-9"
                        >
                            <BrainCircuit className="mr-2 h-4 w-4" />
                            {isAnyModelLoading ? "Generating..." : "Generate Ideas"}
                        </Button>

                        {/* Meta Loading/Error Display */}
                        {isMetaLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground ml-2" />}
                        {metaError && !isMetaLoading && <span className="text-xs text-destructive ml-2">{metaError}</span>}
                    </div>

                    {/* --- NEW: Model Selection Checkboxes --- */}
                    <div className="grid gap-1.5 w-full">
                       <Label className="text-sm font-medium">Select Models to Run</Label>
                       <div className="flex items-center space-x-4 mt-1">
                           {AVAILABLE_MODELS.map(model => (
                               <div key={model} className="flex items-center space-x-2">
                                   <Checkbox
                                       id={`model-${model}`}
                                       checked={selectedModels.includes(model)}
                                       onCheckedChange={(checked) => handleModelSelectionChange(model, checked)}
                                       disabled={isAnyModelLoading || isMetaLoading}
                                   />
                                   <Label
                                       htmlFor={`model-${model}`}
                                       className="text-sm font-medium capitalize cursor-pointer"
                                   >
                                       {model}
                                   </Label>
                               </div>
                           ))}
                       </div>
                    </div>


                    {/* User Brief Input */}
                    <div className="grid gap-1.5 w-full">
                        <Label htmlFor="rec-user-brief" className="text-sm font-medium">Optional Brief</Label>
                        <Textarea
                            id="rec-user-brief"
                            placeholder="Provide additional context or specific instructions..."
                            value={userBrief}
                            onChange={(e) => setUserBrief(e.target.value)}
                            className="min-h-[80px] bg-background"
                            disabled={isAnyModelLoading || isMetaLoading}
                        />
                    </div>

                    {/* Editable Task Section */}
                    <div className="grid gap-1.5 w-full">
                        <Label htmlFor="editable-task-section" className="text-sm font-medium">Editable Prompt: Task Section</Label>
                        <Textarea
                            id="editable-task-section"
                            placeholder="Define the core task for the AI..."
                            value={editableTaskSection}
                            onChange={(e) => setEditableTaskSection(e.target.value)}
                            className="min-h-[150px] bg-background font-mono text-xs"
                            disabled={isAnyModelLoading || isMetaLoading}
                        />
                    </div>

                    {/* Editable Details Section */}
                    <div className="grid gap-1.5 w-full">
                        <Label htmlFor="editable-details-section" className="text-sm font-medium">Editable Prompt: Creative Execution Details Section</Label>
                        <Textarea
                            id="editable-details-section"
                            placeholder="Define the structure and requirements..."
                            value={editableDetailsSection}
                            onChange={(e) => setEditableDetailsSection(e.target.value)}
                            className="min-h-[150px] bg-background font-mono text-xs"
                            disabled={isAnyModelLoading || isMetaLoading}
                        />
                    </div>
                </div>

                {/* --- Display Area (Updated for Tabs) --- */}
                {modelsRequestedInLastRun.length > 0 ? (
                    <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3"> {/* Adjust grid-cols based on number of models */}
                            {modelsRequestedInLastRun.map(modelName => (
                                <TabsTrigger key={modelName} value={modelName} className="capitalize">{modelName}</TabsTrigger>
                            ))}
                        </TabsList>

                        {modelsRequestedInLastRun.map(modelName => (
                            <TabsContent key={modelName} value={modelName} className="mt-4">
                                {/* Loading State for this model */}
                                {isLoading[modelName] && (
                                    <div className="flex flex-col items-center justify-center gap-4 p-8 border rounded-lg text-muted-foreground min-h-[200px]">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                        <span className="capitalize">Generating recommendations with {modelName}...</span>
                                    </div>
                                )}

                                {/* Error State for this model */}
                                {error[modelName] && !isLoading[modelName] && (
                                    <div className="flex flex-col justify-center items-center p-10 border border-destructive bg-destructive/10 rounded-lg min-h-[200px] text-destructive">
                                        <AlertTriangle className="h-8 w-8 mb-2" />
                                        <p className="font-semibold mb-1 capitalize">Error Generating with {modelName}</p>
                                        <p className="text-sm text-center">{error[modelName]}</p>
                                    </div>
                                )}

                                {/* No Recommendations or Initial State for this model */}
                                {!isLoading[modelName] && !error[modelName] && (!resultsByModel[modelName] || (resultsByModel[modelName]?.length ?? 0) === 0) && (
                                    <div className="flex flex-col items-center justify-center gap-4 p-8 border rounded-lg text-muted-foreground min-h-[200px]">
                                        <AlertTriangle className="h-8 w-8" />
                                        <span className="capitalize">No recommendations generated by {modelName}.</span>
                                    </div>
                                )}

                                {/* Display Recommendations for this model */}
                                {!isLoading[modelName] && !error[modelName] && resultsByModel[modelName] && (resultsByModel[modelName]?.length ?? 0) > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(resultsByModel[modelName] ?? []).map((rec, index) => (
                                            <DialogTrigger key={`${selectedRunId}-${modelName}-${index}`} asChild>
                                                <Card
                                                    onClick={() => handleCardClick(rec)}
                                                    className={cn(
                                                        "cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col h-full",
                                                        rec.impact === 'High' ? 'border-green-500' :
                                                        rec.impact === 'Medium' ? 'border-yellow-500' :
                                                        'border-gray-300'
                                                    )}
                                                >
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-lg leading-tight">{rec.title}</CardTitle>
                                                        <CardDescription className="pt-1 text-sm">
                                                            <Badge variant="secondary" className="mr-1">{rec.category}</Badge>
                                                            <Badge variant={rec.impact === 'High' ? 'default' : rec.impact === 'Medium' ? 'outline' : 'secondary'} className={cn(
                                                                rec.impact === 'High' ? 'bg-green-600 text-white' :
                                                                rec.impact === 'Medium' ? 'border-yellow-600 text-yellow-700' :
                                                                ''
                                                            )}>{rec.impact} Impact</Badge>
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="flex-grow text-sm text-muted-foreground pb-3">
                                                        <p className="line-clamp-4">{rec.description}</p>
                                                    </CardContent>
                                                    <CardFooter className="flex justify-between items-center pt-2 pb-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(rec.tags || []).map(tag => (
                                                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                                            ))}
                                                        </div>
                                                    </CardFooter>
                                                </Card>
                                            </DialogTrigger>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                ) : (
                   // Show initial message if no models have been run yet
                   !isAnyModelLoading && <div className="flex flex-col items-center justify-center gap-4 p-8 border rounded-lg text-muted-foreground min-h-[200px]">
                       <BrainCircuit className="h-8 w-8" />
                       <span>Select models and click "Generate Ideas".</span>
                   </div>
                )}

            </div>

            {/* Dialog Content - Rendered conditionally when a recommendation is selected */}
            {selectedRecommendation && (
                <DialogContent className="max-w-3xl">
                    <ScrollArea className="max-h-[80vh] pr-6">
                        <DialogHeader>
                            <DialogTitle className="text-2xl mb-2">{selectedRecommendation.title}</DialogTitle>
                            <DialogDescription className="space-x-2">
                                <Badge variant="secondary" className="mr-1">{selectedRecommendation.category}</Badge>
                                <Badge variant={selectedRecommendation.impact === 'High' ? 'default' : selectedRecommendation.impact === 'Medium' ? 'outline' : 'secondary'} className={cn(
                                    selectedRecommendation.impact === 'High' ? 'bg-green-600 text-white' :
                                    selectedRecommendation.impact === 'Medium' ? 'border-yellow-600 text-yellow-700' :
                                    ''
                                )}>{selectedRecommendation.impact} Impact</Badge>
                                {(selectedRecommendation.tags || []).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                ))}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-6">
                            <section>
                                <h4>รายละเอียด (Description)</h4>
                                <p className="text-sm">{selectedRecommendation.description}</p>
                                {selectedRecommendation.competitiveGap && (
                                <>
                                    <h5 className="mt-3 font-semibold text-sm">ช่องว่างทางการแข่งขัน (Competitive Gap Addressed)</h5>
                                    <p className="text-sm">{selectedRecommendation.competitiveGap}</p>
                                </>
                                )}
                            </section>

                            {/* --- Marketing Execution Section --- */}
                            {(selectedRecommendation.promoted_product_th || selectedRecommendation.mood_and_tone_th || selectedRecommendation.key_message_th || selectedRecommendation.execution_example_th) && (
                                <section className="space-y-2">
                                <h4>แนวทางการสื่อสารการตลาด (Marketing Execution Concepts)</h4>
                                {selectedRecommendation.promoted_product_th && (
                                    <div>
                                    <h5 className="inline-block font-semibold text-sm mr-2">สินค้า/บริการที่จะเน้น (Promoted Product/Service):</h5>
                                    <span className="text-sm">{selectedRecommendation.promoted_product_th}</span>
                                    </div>
                                )}
                                {selectedRecommendation.mood_and_tone_th && (
                                    <div>
                                    <h5 className="inline-block font-semibold text-sm mr-2">อารมณ์และโทน (Mood & Tone):</h5>
                                    <span className="text-sm">{selectedRecommendation.mood_and_tone_th}</span>
                                    </div>
                                )}
                                {selectedRecommendation.key_message_th && (
                                    <div>
                                    <h5 className="inline-block font-semibold text-sm mr-2">ข้อความหลัก/สโลแกน (Key Message/Tagline):</h5>
                                    <span className="text-sm">{selectedRecommendation.key_message_th}</span>
                                    </div>
                                )}
                                {selectedRecommendation.execution_example_th && (
                                    <div className="mt-2">
                                    <h5 className="font-semibold text-sm mb-1">ตัวอย่างการนำไปใช้ (Execution Example):</h5>
                                    <p className="text-sm whitespace-pre-wrap">{selectedRecommendation.execution_example_th}</p>
                                    </div>
                                )}
                                </section>
                            )}

                            {/* --- Creative Execution Details Section --- */}
                            {(selectedRecommendation.content_pillar || selectedRecommendation.product_focus || selectedRecommendation.concept_idea || selectedRecommendation.copywriting) && (
                                <section className="space-y-3 pt-4 border-t mt-4">
                                <h4 className="font-semibold">Creative Execution Details</h4>
                                {selectedRecommendation.content_pillar && (
                                    <div className="text-sm">
                                    <h5 className="inline-block font-medium text-sm mr-2 text-muted-foreground">Content Pillar:</h5>
                                    <span>{selectedRecommendation.content_pillar}</span>
                                    </div>
                                )}
                                {selectedRecommendation.product_focus && (
                                    <div className="text-sm">
                                    <h5 className="inline-block font-medium text-sm mr-2 text-muted-foreground">Product Focus:</h5>
                                    <span>{selectedRecommendation.product_focus}</span>
                                    </div>
                                )}
                                {selectedRecommendation.concept_idea && (
                                    <div className="text-sm">
                                    <h5 className="inline-block font-medium text-sm mr-2 text-muted-foreground">Concept Idea:</h5>
                                    <span>{selectedRecommendation.concept_idea}</span>
                                    </div>
                                )}

                                {/* Display Copywriting Details */}
                                {selectedRecommendation.copywriting && (
                                    <div className="mt-3 space-y-2 border p-3 rounded-md bg-muted/20">
                                    <h5 className="font-medium text-sm mb-1">Draft Copywriting:</h5>
                                    {selectedRecommendation.copywriting.headline && (
                                        <p className="text-sm"><strong>Headline:</strong> {selectedRecommendation.copywriting.headline}</p>
                                    )}
                                    {selectedRecommendation.copywriting.sub_headline_1 && (
                                        <p className="text-sm text-muted-foreground"><strong>Sub-Headline 1:</strong> {selectedRecommendation.copywriting.sub_headline_1}</p>
                                    )}
                                    {selectedRecommendation.copywriting.sub_headline_2 && (
                                        <p className="text-sm text-muted-foreground"><strong>Sub-Headline 2:</strong> {selectedRecommendation.copywriting.sub_headline_2}</p>
                                    )}
                                    {selectedRecommendation.copywriting.bullets && selectedRecommendation.copywriting.bullets.length > 0 && (
                                        <div className="text-sm mt-1">
                                        <strong className="block text-xs text-muted-foreground mb-0.5">Bullets:</strong>
                                        <ul className="list-disc list-inside pl-2 space-y-0.5">
                                            {selectedRecommendation.copywriting.bullets.map((bullet, idx) => (
                                            <li key={idx}>{bullet}</li>
                                            ))}
                                        </ul>
                                        </div>
                                    )}
                                    {selectedRecommendation.copywriting.cta && (
                                        <p className="text-sm mt-2"><strong>CTA:</strong> <Badge variant="outline">{selectedRecommendation.copywriting.cta}</Badge></p>
                                    )}
                                    </div>
                                )}
                                </section>
                            )}


                            {/* --- Image Generation Section --- */}
                            <section className="space-y-3 pt-4 border-t mt-4">
                                <h4 className="font-semibold">Generate Visual Concept (Ideogram)</h4>
                                <div className="flex items-center gap-4">
                                    <Label htmlFor="aspect-ratio-select" className="text-sm whitespace-nowrap">Aspect Ratio:</Label>
                                    <Select
                                        value={aspectRatio}
                                        onValueChange={setAspectRatio}
                                        disabled={isImageLoading}
                                    >
                                        <SelectTrigger className="h-9 w-[150px] bg-background" id="aspect-ratio-select">
                                            <SelectValue placeholder="Select Ratio..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ASPECT_16_9">16:9 (Landscape)</SelectItem>
                                            <SelectItem value="ASPECT_1_1">1:1 (Square)</SelectItem>
                                            <SelectItem value="ASPECT_9_16">9:16 (Portrait)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={handleGenerateImage}
                                        disabled={isImageLoading || !selectedRecommendation}
                                        size="sm"
                                    >
                                        {isImageLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isImageLoading ? 'Generating...' : 'Generate Image'}
                                    </Button>
                                </div>

                                <div className="mt-4 min-h-[200px] border rounded-md flex items-center justify-center bg-muted/20 p-4">
                                    {isImageLoading && (
                                        <div className="flex flex-col items-center text-muted-foreground">
                                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                            <span>Generating image...</span>
                                        </div>
                                    )}
                                    {imageError && !isImageLoading && (
                                        <div className="flex flex-col items-center text-destructive text-center">
                                            <AlertTriangle className="h-8 w-8 mb-2" />
                                            <span className="font-semibold">Image Generation Failed</span>
                                            <span className="text-xs mt-1">{imageError}</span>
                                        </div>
                                    )}
                                    {!isImageLoading && !imageError && generatedImageUrl && (
                                        <Image
                                            src={generatedImageUrl}
                                            alt={selectedRecommendation?.concept_idea || 'Generated visual concept'}
                                            width={512}
                                            height={512 * (aspectRatio === 'ASPECT_9_16' ? (16 / 9) : aspectRatio === 'ASPECT_16_9' ? (9 / 16) : 1)}
                                            className="rounded-md object-contain max-h-[400px]"
                                        />
                                    )}
                                    {!isImageLoading && !imageError && !generatedImageUrl && (
                                        <span className="text-muted-foreground text-sm">Click "Generate Image" to visualize the concept.</span>
                                    )}
                                </div>
                            </section>

                        </div>
                    </ScrollArea>
                     <DialogFooter className="mt-4 pr-6"> {/* Added pr-6 to align with ScrollArea */}
                        <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            )}
           {/* Moved DialogFooter out of DialogContent to ensure visibility */}

        </Dialog>
    )
}
