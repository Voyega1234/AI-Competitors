import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bookmark, Share2, Loader2, AlertTriangle, BrainCircuit, X, Info, CheckSquare, UploadCloud } from "lucide-react"
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
import { ImageGenerationDialog } from "@/components/ImageGenerationDialog";
import { useDropzone } from "react-dropzone";
import { Input } from "@/components/ui/input";
import React from 'react';

// Define interfaces
interface AdCopyDetails {
    description: string;
    competitiveGap: string;
    headline: string;
    subHeadline1: string;
    subHeadline2: string;
    subHeadline3: string;
    subHeadlineCta: string;
    bubblePoints: string[];
}

interface GenerateImageResponse {
    imageUrl: string;
    error?: string;
}

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

interface SelectedConcept {
    focusTarget: string;
    keyMessage: string;
}

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
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | undefined>(undefined);
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

    // --- NEW State for Image Generation with References ---
    const [selectedConceptForImage, setSelectedConceptForImage] = useState<CreativeConcept | null>(null);
    const [productImages, setProductImages] = useState<File[]>([]);
    const [adReferenceImages, setAdReferenceImages] = useState<File[]>([]);
    const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

    // Add new state for custom prompt
    const [customPrompt, setCustomPrompt] = useState<string>('');

    // Add new state for full image dialog
    const [isFullImageDialogOpen, setIsFullImageDialogOpen] = useState(false);

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
        setGeneratedImageUrl(undefined);
        setIsImageLoading(false);
        setImageError(null);
        setAspectRatio('ASPECT_16_9');
        setIsDialogOpen(true);
        setCustomPrompt(''); // Reset custom prompt
        
        // Pre-populate the ad copy details with content from the recommendation
        setAdCopyDetails(prev => ({
            ...prev,
            description: recommendation.description || '',
            competitiveGap: recommendation.competitiveGap || '',
            headline: '',
            subHeadline1: '',
            subHeadline2: '',
            subHeadline3: '',
            subHeadlineCta: '',
            bubblePoints: []
        }));
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
        setGeneratedImageUrl(undefined);

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

    const handleGenerateImageWithReferences = async () => {
        if (productImages.length === 0) {
            setImageError("Please upload at least one product image");
            return;
        }
        
        setIsGeneratingImage(true);
        setImageError(null);
        
        try {
            const formData = new FormData();
            
            // Add product images
            productImages.forEach((file, index) => {
                formData.append(`productImage${index}`, file);
            });
            
            // Add ad reference images
            adReferenceImages.forEach((file, index) => {
                formData.append(`adReferenceImage${index}`, file);
            });

            // Add concept data as a string with all important elements
            formData.append('concept', JSON.stringify({
                focusTarget: selectedConceptForImage?.focusTarget,
                keyMessage: selectedConceptForImage?.keyMessage,
                description: adCopyDetails.description,
                competitiveGap: adCopyDetails.competitiveGap,
                adCopy: {
                    headline: adCopyDetails.headline,
                    subHeadline1: adCopyDetails.subHeadline1,
                    subHeadline2: adCopyDetails.subHeadline2,
                    subHeadline3: adCopyDetails.subHeadline3,
                    subHeadlineCta: adCopyDetails.subHeadlineCta,
                    bubblePoints: adCopyDetails.bubblePoints
                }
            }));

            // Add the reference image style prompt if needed
            const referenceImagePrompt = adReferenceImages.length > 0 
                ? "As an expert photographer and creator, create a new ad image for the product on the right, using the mood and tone of the reference image on the left. I want it to have an outstanding ad design with high-quality details."
                : "";

            // Construct a comprehensive prompt that includes all key elements
            const fullPrompt = `
Generate an outstanding and creative photorealistic advertisement image that captures the following key aspects:

Main Concept: ${selectedConceptForImage?.focusTarget}

Product Description:
${adCopyDetails.description}

Competitive Advantage/Gap Addressed:
${adCopyDetails.competitiveGap}

Key Message to Convey:
${selectedConceptForImage?.keyMessage}

${referenceImagePrompt}
${customPrompt ? `\nAdditional Instructions:\n${customPrompt}` : ''}
`.trim();

            // Add the full prompt
            formData.append('prompt', fullPrompt);

            const response = await fetch('/api/generate-image-with-references', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || 'Failed to generate image');
            }

            const result = await response.json();
            setGeneratedImageUrl(result.imageUrl);
            
        } catch (err: any) {
            console.error('Error generating image:', err);
            setImageError(err.message || 'Failed to generate image');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const {
        getRootProps: getProductRootProps,
        getInputProps: getProductInputProps,
        isDragActive: isProductDragActive
    } = useDropzone({
        onDrop: (acceptedFiles) => {
            setProductImages(prev => [...prev, ...acceptedFiles]);
        },
        accept: {
            'image/png': ['.png']
        },
        maxFiles: 3,
    });

    const {
        getRootProps: getAdReferenceRootProps,
        getInputProps: getAdReferenceInputProps,
        isDragActive: isAdReferenceDragActive
    } = useDropzone({
        onDrop: (acceptedFiles) => {
            setAdReferenceImages(prev => [...prev, ...acceptedFiles]);
        },
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png']
        },
        maxFiles: 5,
    });

    const removeProductImage = (index: number) => {
        setProductImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeAdReferenceImage = (index: number) => {
        setAdReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

    // Add a new state for dialog visibility
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Add a new state for ad copy details
    const [adCopyDetails, setAdCopyDetails] = useState<AdCopyDetails>({
        description: '',
        competitiveGap: '',
        headline: '',
        subHeadline1: '',
        subHeadline2: '',
        subHeadline3: '',
        subHeadlineCta: '',
        bubblePoints: []
    });

    const handleBubblePointsChange = (index: number, value: string) => {
        setAdCopyDetails((prev: AdCopyDetails) => {
            const newBubblePoints = [...prev.bubblePoints];
            newBubblePoints[index] = value;
            return {
                ...prev,
                bubblePoints: newBubblePoints
            };
        });
    };

    const handleAddBubblePoint = () => {
        setAdCopyDetails((prev: AdCopyDetails) => ({
            ...prev,
            bubblePoints: [...prev.bubblePoints, '']
        }));
    };

    const handleRemoveBubblePoint = (index: number) => {
        setAdCopyDetails((prev: AdCopyDetails) => ({
            ...prev,
            bubblePoints: prev.bubblePoints.filter((_, i) => i !== index)
        }));
    };

    return (
        <>
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        setSelectedRecommendation(null);
                        setViewingJourneyId(null);
                        setGeneratedImageUrl(undefined);
                        setIsImageLoading(false);
                        setImageError(null);
                        setAspectRatio('ASPECT_16_9');
                        setAdCopyDetails({
                            description: '',
                            competitiveGap: '',
                            headline: '',
                            subHeadline1: '',
                            subHeadline2: '',
                            subHeadline3: '',
                            subHeadlineCta: '',
                            bubblePoints: []
                        });
                    }
                }}
            >
                <DialogContent className="max-w-4xl">
                    {selectedRecommendation && !viewingJourneyId && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedRecommendation.title}</DialogTitle>
                                <DialogDescription>
                                    {selectedRecommendation.description}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-4">
                                {/* Generated Image Display */}
                                {generatedImageUrl !== undefined && (
                                    <div className="mt-4">
                                        <img
                                            src={generatedImageUrl}
                                            alt="Generated image"
                                            className="w-full h-auto rounded-lg"
                                            style={{ maxWidth: '100%' }}
                                        />
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="secondary">Close</Button>
                                </DialogClose>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Full Image Dialog */}
            <Dialog open={isFullImageDialogOpen} onOpenChange={setIsFullImageDialogOpen}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 z-10"
                            onClick={() => setIsFullImageDialogOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <img
                            src={generatedImageUrl}
                            alt="Generated image full view"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
