import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bookmark, Share2, Loader2, AlertTriangle, BrainCircuit, X, Info, CheckSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import ReactMarkdown from 'react-markdown';
import { Skeleton } from "@/components/ui/skeleton";
import { CreativeConcept, TopicIdeas, SelectedRecommendationForCreative } from "@/types/creative";

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

// --- Define available models ---
const AVAILABLE_MODELS = ['gemini', 'openai', 'claude']; // Define model names

// --- Define Expected Structures ---
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
    tempId?: string; // Add temporary ID for selection
}

// --- Types for Multi-Model State ---
type ModelResults = { [modelName: string]: Recommendation[] | null };
type ModelLoadingState = { [modelName: string]: boolean };
type ModelErrorState = { [modelName: string]: string | null };

// --- Import/Define the structured journey interface (must match backend) ---
export interface CustomerJourneyStructured {
    brandingAndProductConnection?: {
        alignment?: string;
        showcase?: string;
    };
    productBenefitsHighlighted?: {
        keyBenefits?: string;
        communication?: string;
    };
    painPointAndEmotionalResonance?: {
        painPoint?: string;
        emotionalResonance?: string;
    };
    promotionAndPricingIntegration?: {
        integration?: string;
        ctaPlacement?: string;
    };
}

// Update CustomerJourneysMap type
type CustomerJourneysMap = Record<string, CustomerJourneyStructured | null>; // tempId -> structured object or null

// --- NEW: Component to Render the Visual Journey Layout ---
const VisualJourneyLayout = ({ journey }: { journey: CustomerJourneyStructured | null }) => {
    if (!journey) {
        return (
            <div className="flex items-center justify-center h-20 border rounded-md bg-muted/50 text-muted-foreground text-xs p-2">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Journey data is not available or failed to load.</span>
            </div>
        );
    }

    const sections = [
        {
            title: "1. Branding & Product",
            bgColor: "bg-blue-100 dark:bg-blue-900/30",
            borderColor: "border-blue-300 dark:border-blue-700",
            data: journey.brandingAndProductConnection,
            fields: [
                { label: "Alignment", key: "alignment" },
                { label: "Showcase", key: "showcase" },
            ]
        },
        {
            title: "2. Benefits",
            bgColor: "bg-green-100 dark:bg-green-900/30",
            borderColor: "border-green-300 dark:border-green-700",
            data: journey.productBenefitsHighlighted,
            fields: [
                { label: "Key Benefits", key: "keyBenefits" },
                { label: "Communication", key: "communication" },
            ]
        },
        {
            title: "3. Pain Point & Emotion",
            bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
            borderColor: "border-yellow-300 dark:border-yellow-700",
            data: journey.painPointAndEmotionalResonance,
            fields: [
                { label: "Pain Point", key: "painPoint" },
                { label: "Resonance", key: "emotionalResonance" },
            ]
        },
        {
            title: "4. Promotion & Pricing",
            bgColor: "bg-purple-100 dark:bg-purple-900/30",
            borderColor: "border-purple-300 dark:border-purple-700",
            data: journey.promotionAndPricingIntegration,
            fields: [
                { label: "Integration", key: "integration" },
                { label: "CTA", key: "ctaPlacement" },
            ]
        },
    ];

    // Simplified display for inline card view
    return (
        <div className="grid grid-cols-2 gap-2"> {/* Use grid for better alignment */}
            {sections.map((section, index) => (
                <div key={index} className={cn(
                    "border rounded-md p-2",
                    section.bgColor,
                    section.borderColor
                 )}>
                    <h5 className="font-semibold text-[11px] mb-1 border-b pb-0.5">{section.title}</h5>
                    {section.data ? (
                        <div className="space-y-1 text-[10px] leading-tight">
                            {section.fields.map(field => (
                                section.data && section.data[field.key as keyof typeof section.data] && (
                                    <div key={field.key}>
                                        <p className="font-medium text-gray-600 dark:text-gray-400">{field.label}:</p>
                                        <p className="text-gray-800 dark:text-gray-200">
                                            {section.data[field.key as keyof typeof section.data]}
                                        </p>
                                    </div>
                                )
                            ))}
                             {section.data && Object.values(section.data).every(v => !v) && <p className="italic text-muted-foreground">No details.</p>}
                        </div>
                    ) : (
                        <p className="italic text-[10px] text-muted-foreground">Missing.</p>
                    )}
                </div>
            ))}
        </div>
    );
};


export function RecommendationCards() {
    // Remove router if no longer needed
    // const router = useRouter(); 

    // --- State for Data and Loading/Error (Updated for Multi-Model) ---
    const [resultsByModel, setResultsByModel] = useState<ModelResults>({});
    const [isLoading, setIsLoading] = useState<ModelLoadingState>({});
    const [error, setError] = useState<ModelErrorState>({});
    const [modelsRequestedInLastRun, setModelsRequestedInLastRun] = useState<string[]>([]); // Track models for current results

    // --- State for Dialog (Recommendation Details Only) ---
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

    // --- NEW: State for Card Selection ---
    const [selectedCards, setSelectedCards] = useState<Record<string, Recommendation>>({});
    // --- NEW State for Customer Journeys ---
    const [customerJourneys, setCustomerJourneys] = useState<CustomerJourneysMap>({});
    const [isGeneratingJourneys, setIsGeneratingJourneys] = useState<boolean>(false);
    const [journeyError, setJourneyError] = useState<string | null>(null);
    // --- RE-ADD State for Journey Details Dialog ---
    const [viewingJourneyId, setViewingJourneyId] = useState<string | null>(null);

    // --- NEW State for Creative Concepts --- 
    const [creativeConcepts, setCreativeConcepts] = useState<CreativeConcept[] | null>(null);
    const [isGeneratingConcepts, setIsGeneratingConcepts] = useState<boolean>(false);
    const [conceptsError, setConceptsError] = useState<string | null>(null);


    // --- Force re-render check ---
    useEffect(() => {
        if (selectedRecommendation) {
            // console.log('Dialog should be showing data for:', selectedRecommendation.title);
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
            setSelectedCards({});
            setCustomerJourneys({});
            setIsGeneratingJourneys(false);
            setJourneyError(null);
            setCreativeConcepts(null); // Clear concepts
            setIsGeneratingConcepts(false);
            setConceptsError(null);
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
            setSelectedCards({});
            setCustomerJourneys({});
            setIsGeneratingJourneys(false);
            setJourneyError(null);
            setCreativeConcepts(null); // Clear concepts
            setIsGeneratingConcepts(false);
            setConceptsError(null);
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
        setSelectedCards({});
        setCustomerJourneys({});
        setIsGeneratingJourneys(false);
        setJourneyError(null);
        setCreativeConcepts(null); // Clear concepts
        setIsGeneratingConcepts(false);
        setConceptsError(null);

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
        setResultsByModel({});
        setSelectedRecommendation(null);
        setModelsRequestedInLastRun(selectedModels);
        setSelectedCards({});
        setCustomerJourneys({});
        setIsGeneratingJourneys(false);
        setJourneyError(null);
        setCreativeConcepts(null); // Clear concepts
        setIsGeneratingConcepts(false);
        setConceptsError(null);

        try {
            console.log(`Fetching recommendations for runId: ${selectedRunId}, Models: ${selectedModels.join(', ')}`);
            let apiUrl = `/api/generate-recommendations?runId=${selectedRunId}`;
            apiUrl += `&models=${encodeURIComponent(selectedModels.join(','))}`;
            if (userBrief.trim()) {
                apiUrl += `&brief=${encodeURIComponent(userBrief.trim())}`;
            }
            apiUrl += `&taskSection=${encodeURIComponent(editableTaskSection)}`;
            apiUrl += `&detailsSection=${encodeURIComponent(editableDetailsSection)}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error || `API Error: ${response.status}`;
                console.error("API Error:", errorMsg);
                const newErrorState = { ...initialErrorState };
                selectedModels.forEach(model => {
                    newErrorState[model] = errorMsg;
                });
                setError(newErrorState);
                setResultsByModel({});
            } else {
                const processedResults: ModelResults = {};
                Object.entries(data.results || {}).forEach(([modelName, recommendations]) => {
                    if (Array.isArray(recommendations)) {
                        processedResults[modelName] = recommendations.map((rec, index) => ({
                            ...rec,
                            tempId: `${modelName}-${selectedRunId}-${index}`
                        }));
                    }
                });
                setResultsByModel(processedResults);
                setError(prevErrors => ({ ...prevErrors, ...(data.errors || {}) }));
            }

        } catch (err: any) {
            console.error("Failed to fetch recommendations:", err);
            const errorMsg = err.message || "An unknown error occurred while generating recommendations.";
            const newErrorState = { ...initialErrorState };
            selectedModels.forEach(model => {
                newErrorState[model] = errorMsg;
            });
            setError(newErrorState);
            setResultsByModel({});
        } finally {
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
                return [...prev, modelName];
            } else {
                return prev.filter(m => m !== modelName);
            }
        });
    };

    // --- UPDATED Card Click Handler (Toggle Selection) ---
    const handleCardSelectionToggle = (recommendation: Recommendation) => {
        if (!recommendation.tempId) return;

        setSelectedCards(prevSelected => {
            const newSelected = { ...prevSelected };
            if (newSelected[recommendation.tempId!]) {
                delete newSelected[recommendation.tempId!];
            } else {
                newSelected[recommendation.tempId!] = recommendation;
            }
            return newSelected;
        });
    };

    // --- Handler for Opening Details Dialog ---
    const handleOpenDetails = (recommendation: Recommendation, event: React.MouseEvent) => {
        event.stopPropagation();
        setSelectedRecommendation(recommendation);
        setGeneratedImageUrl(null);
        setIsImageLoading(false);
        setImageError(null);
        setAspectRatio('ASPECT_16_9');
    };

    // --- Handler for the first button -> Generate Journeys ---
    const handleGenerateCustomerJourneys = async () => {
        const selectedData = Object.values(selectedCards);
        if (selectedData.length === 0 || !selectedClientName) return;

        setIsGeneratingJourneys(true);
        setJourneyError(null);
        // Don't clear customerJourneys state here - allow adding journeys for newly selected cards later
        // setCustomerJourneys({});

        const recommendationsForApi = selectedData
            .filter(rec => !customerJourneys[rec.tempId!]) // Only generate for selected cards without existing journey data
            .map(rec => ({
            title: rec.title,
            concept: rec.concept_idea,
            description: rec.description,
            tempId: rec.tempId,
        }));

        if (recommendationsForApi.length === 0) {
             console.log("[ui] No new journeys to generate for selected cards.");
             setIsGeneratingJourneys(false); // Already generated for all selected
             return;
        }

        try {
            console.log(`[ui] Calling API to generate journeys for ${recommendationsForApi.length} new ideas...`);
            const response = await fetch('/api/generate-customer-journey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedRecommendations: recommendationsForApi,
                    clientName: selectedClientName,
                    productFocus: selectedProductFocus === 'placeholder-for-empty' ? null : selectedProductFocus,
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `API Error: ${response.status}`);
            }

            // Merge new journeys with existing ones
            setCustomerJourneys(prev => ({ ...prev, ...(result.customerJourneys || {}) }));
            console.log("[ui] Successfully received and merged customer journeys.");

        } catch (err: any) {
            console.error("[ui] Error generating customer journeys:", err);
            setJourneyError(err.message || "Failed to generate customer journeys.");
        } finally {
            setIsGeneratingJourneys(false);
        }
    };

    // --- NEW Handler for Generating Content Pillars/Creative Concepts --- 
    const handleGenerateCreativeConcepts = async () => {
        const selectedData = Object.values(selectedCards);
        // Filter selected cards to include only those with a generated journey
        const dataWithJourneys = selectedData.filter(rec => rec.tempId && customerJourneys[rec.tempId!]);

        if (dataWithJourneys.length === 0) {
            console.error("[handleGenerateCreativeConcepts] No selected cards have a generated customer journey.");
            // Optionally set an error state here to inform the user
            setConceptsError("Please generate customer journeys for selected cards first, or select cards with existing journeys.");
            setCreativeConcepts(null); // Clear any previous results
            return;
        }

        if (!selectedClientName) { // Keep client name check
             console.error("[handleGenerateCreativeConcepts] Client name missing.");
             setConceptsError("Client name is missing.");
             return;
        }

        setIsGeneratingConcepts(true);
        setConceptsError(null);
        setCreativeConcepts(null); // Clear previous concepts

        // Format data for the API using only cards with journeys
        const recommendationsForApi: SelectedRecommendationForCreative[] = dataWithJourneys.map(rec => ({
            title: rec.title,
            concept: rec.concept_idea, 
            description: rec.description,
            tempId: rec.tempId,
            customerJourney: customerJourneys[rec.tempId!] || null,
            content_pillar: rec.content_pillar,
            product_focus: rec.product_focus,
        }));

        try {
            console.log(`[ui] Calling API to generate creative concepts for ${recommendationsForApi.length} selected items...`);
            const response = await fetch('/api/generate-creative-concepts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedRecommendations: recommendationsForApi,
                    clientName: selectedClientName,
                    productFocus: selectedProductFocus === 'placeholder-for-empty' ? null : selectedProductFocus,
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `API Error: ${response.status}`);
            }

            if (!result.concepts || !Array.isArray(result.concepts)) {
                 throw new Error('Invalid response structure from concepts API.');
            }

            setCreativeConcepts(result.concepts);
            console.log("[ui] Successfully received creative concepts:", result.concepts);

        } catch (err: any) {
            console.error("[ui] Error generating creative concepts:", err);
            setConceptsError(err.message || "Failed to generate creative concepts.");
        } finally {
            setIsGeneratingConcepts(false);
        }
    };

    // --- Generate Image ---
    const handleGenerateImage = async () => {
        if (!selectedRecommendation) return;

        setIsImageLoading(true);
        setImageError(null);
        setGeneratedImageUrl(null);

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
                headers: { 'Content-Type': 'application/json' },
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
    // Determine default tab
    const defaultTab = modelsRequestedInLastRun.length > 0 ? modelsRequestedInLastRun[0] : (selectedModels.length > 0 ? selectedModels[0] : AVAILABLE_MODELS[0]);

    // Check if journey generation has been attempted (success or fail) for *any* card since last selection/param change
    const hasGeneratedJourneysAttempted = Object.keys(customerJourneys).length > 0 || !!journeyError;


    return (
        <Dialog
            open={!!selectedRecommendation || !!viewingJourneyId} // Depend on both states
            onOpenChange={(open) => {
                if (!open) {
                    setSelectedRecommendation(null);
                    setViewingJourneyId(null); // Reset journey view on close
                    setGeneratedImageUrl(null);
                    setIsImageLoading(false);
                    setImageError(null);
                    setAspectRatio('ASPECT_16_9');
                }
            }}
        >
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

                    {/* --- Model Selection Checkboxes --- */}
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
                                        {(resultsByModel[modelName] ?? []).map((rec) => {
                                            const isSelected = !!selectedCards[rec.tempId!];
                                            const journeyData = customerJourneys[rec.tempId!];
                                            const journeyIsAvailable = isSelected && hasGeneratedJourneysAttempted && !isGeneratingJourneys && !!journeyData;
                                            const journeyHasFailed = isSelected && hasGeneratedJourneysAttempted && !isGeneratingJourneys && !journeyData;
                                            const journeyIsLoading = isSelected && isGeneratingJourneys && !customerJourneys[rec.tempId!]; // Loading specifically for this card

                                            return (
                                                <Card
                                                    key={rec.tempId}
                                                    onClick={() => handleCardSelectionToggle(rec)}
                                                    className={cn(
                                                        "cursor-pointer hover:shadow-md transition-shadow duration-200 flex flex-col h-full relative",
                                                        isSelected ? "border-2 border-primary shadow-md" : "border",
                                                        !isSelected && rec.impact === 'High' ? 'border-green-500' :
                                                        !isSelected && rec.impact === 'Medium' ? 'border-yellow-500' :
                                                        ''
                                                    )}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 p-1 bg-primary text-primary-foreground rounded-full z-10">
                                                            <CheckSquare size={16} />
                                                        </div>
                                                    )}
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base leading-tight pr-8">{rec.title}</CardTitle>
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
                                                        <p className="line-clamp-4 mb-2">{rec.description}</p>

                                                        {/* RE-ADD View Journey Button - Conditional */}
                                                        {isSelected && hasGeneratedJourneysAttempted && (
                                                            <div className="mt-3 pt-3 border-t">
                                                                {journeyIsLoading && (
                                                                    <div className="flex items-center text-xs text-muted-foreground py-2">
                                                                        <Loader2 className="h-3 w-3 mr-1 animate-spin"/>
                                                                        <span>Generating journey...</span>
                                                                    </div>
                                                                )}
                                                                {journeyHasFailed && (
                                                                    <div className="flex items-center text-xs text-destructive py-2">
                                                                        <AlertTriangle className="h-3 w-3 mr-1"/>
                                                                        <span>Journey generation failed.</span>
                                                                    </div>
                                                                )}
                                                                {journeyIsAvailable && (
                                                                     <div className="mt-1 space-y-1">
                                                                        <h5 className="text-xs font-semibold text-foreground">Journey Breakdown:</h5>
                                                                        <VisualJourneyLayout journey={journeyData} />
                                                                     </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                    <CardFooter className="flex justify-between items-center pt-2 pb-3">
                                                        <div className="flex flex-wrap gap-1 items-center">
                                                            {(rec.tags || []).map(tag => (
                                                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                                            ))}
                                                            {/* RE-ADD View Journey Button - Conditional */}
                                                            {isSelected && hasGeneratedJourneysAttempted && (
                                                                <Button
                                                                    variant={journeyHasFailed ? "destructive" : "secondary"}
                                                                    size="sm"
                                                                    className="h-6 px-2 py-1 text-xs ml-1" // Added margin
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Prevent card deselection
                                                                        if (journeyIsAvailable) setViewingJourneyId(rec.tempId!); // Open dialog
                                                                    }}
                                                                    disabled={isGeneratingJourneys || journeyHasFailed}
                                                                >
                                                                    {isGeneratingJourneys && journeyIsLoading ? <Loader2 className="h-3 w-3 animate-spin"/> :
                                                                     journeyIsAvailable ? "View Journey" :
                                                                     journeyHasFailed ? "Journey Failed" :
                                                                     "Journey" /* Fallback text */}
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleOpenDetails(rec, e)}>
                                                                <Info size={16} />
                                                                <span className="sr-only">View Details / Generate Image</span>
                                                            </Button>
                                                        </DialogTrigger>
                                                    </CardFooter>
                                                </Card>
                                            );
                                        })}
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

                {/* --- Action Buttons --- */}
                <div className="mt-6 flex justify-center gap-4">
                    {/* Button 1: Generate Journeys */}
                     <Button
                        onClick={handleGenerateCustomerJourneys}
                        disabled={Object.keys(selectedCards).length === 0 || isGeneratingJourneys } // Allow re-clicking if some failed previously or more are selected
                    >
                         {isGeneratingJourneys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         {isGeneratingJourneys ? 'Generating Journeys...' : `Generate Customer Journeys for Selected (${Object.keys(selectedCards).length})`}
                     </Button>

                     {/* Button 2: Generate Content Pillars (Now strictly sequential & requires success) */}
                     <Button 
                         onClick={handleGenerateCreativeConcepts} 
                         // Disabled if: generating, nothing selected, OR no selected cards have a SUCCESSFUL journey.
                         disabled={isGeneratingConcepts || 
                                   Object.keys(selectedCards).length === 0 || 
                                   // Explicitly check if the count of selected cards with SUCCESSFUL journeys is 0
                                   Object.values(selectedCards).filter(rec => rec.tempId && !!customerJourneys[rec.tempId!]).length === 0
                                  }
                     >
                          {isGeneratingConcepts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Generate Content Pillars (from {
                             // Calculate count of selected cards with successful journeys
                             Object.values(selectedCards).filter(rec => rec.tempId && !!customerJourneys[rec.tempId!]).length
                          } selected)
                     </Button>
                </div>
                {journeyError && !isGeneratingJourneys && (
                    <p className="text-center text-sm text-destructive mt-2">Error during journey generation: {journeyError}</p>
                )}

            </div>

            {/* Dialog Content - Recommendation Details */}
            {selectedRecommendation && !viewingJourneyId && ( // Show only if NOT viewing journey
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

            {/* RE-ADD Journey Details Dialog Content */}
            {viewingJourneyId && (
                <DialogContent className="max-w-5xl"> {/* Use wider dialog for journey */} 
                    <DialogHeader>
                        <DialogTitle>Customer Journey: {Object.values(selectedCards).find(r => r.tempId === viewingJourneyId)?.title || 'Analysis'}</DialogTitle>
                        <DialogDescription>
                          Visual breakdown of the structured journey analysis.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[70vh] overflow-y-auto pr-2"> 
                        {/* Use the VisualJourneyLayout component */}
                        <VisualJourneyLayout journey={customerJourneys[viewingJourneyId] || null} />
                    </div>
                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                         <Button type="button" variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            )}

            {/* --- NEW Section: Generated Creative Concepts --- */}
            {isGeneratingConcepts && (
                <div className="mt-8 pt-6 border-t flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-muted-foreground">Generating Content Pillars / Focus Targets...</p>
                </div>
            )}
            {conceptsError && !isGeneratingConcepts && (
                 <div className="mt-8 pt-6 border-t flex flex-col items-center text-destructive">
                     <AlertTriangle className="h-8 w-8 mb-2" />
                     <p className="font-semibold">Error Generating Concepts</p>
                     <p className="text-sm mt-1 text-center">{conceptsError}</p>
                 </div>
            )}
            {creativeConcepts && !isGeneratingConcepts && !conceptsError && (
                <div className="mt-8 pt-6 border-t">
                    <h3 className="text-xl font-semibold mb-4 text-center">Generated Content Pillars / Focus Targets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {creativeConcepts.map((concept, index) => (
                            <Card key={index} className="shadow-sm flex flex-col">
                                <CardHeader className="pb-3 bg-muted/30 rounded-t-lg">
                                    <CardTitle className="text-base">
                                        <Badge className="mr-2 mb-1 text-xs" variant="secondary">Focus Target</Badge>
                                        {concept.focusTarget}
                                    </CardTitle>
                                    <CardDescription className="text-sm pt-1">
                                        <span className="font-medium text-foreground">Key Message:</span> {concept.keyMessage}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 flex-grow">
                                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Topic Ideas:</h4>
                                    <div className="space-y-3 text-xs">
                                        {concept.topicIdeas.productBenefits && concept.topicIdeas.productBenefits.length > 0 && (
                                            <div>
                                                <h5 className="font-medium mb-1 text-primary/80">Product Benefits</h5>
                                                <ul className="list-disc list-inside space-y-0.5 pl-1">
                                                    {concept.topicIdeas.productBenefits.map((idea, i) => <li key={`ben-${i}`}>{idea}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {concept.topicIdeas.painPointsEmotional && concept.topicIdeas.painPointsEmotional.length > 0 && (
                                            <div>
                                                <h5 className="font-medium mb-1 text-amber-700/80 dark:text-amber-500/80">Pain Points & Emotional</h5>
                                                <ul className="list-disc list-inside space-y-0.5 pl-1">
                                                    {concept.topicIdeas.painPointsEmotional.map((idea, i) => <li key={`pain-${i}`}>{idea}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {concept.topicIdeas.promotionPricing && concept.topicIdeas.promotionPricing.length > 0 && (
                                            <div>
                                                <h5 className="font-medium mb-1 text-purple-700/80 dark:text-purple-500/80">Promotion & Pricing</h5>
                                                <ul className="list-disc list-inside space-y-0.5 pl-1">
                                                    {concept.topicIdeas.promotionPricing.map((idea, i) => <li key={`promo-${i}`}>{idea}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                {/* Optional CardFooter if actions per concept are needed */}
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            {/* --- End Generated Concepts Section --- */}

        </Dialog>
    )
}
