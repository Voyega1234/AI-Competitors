import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bookmark, Share2, Loader2, AlertTriangle, BrainCircuit, X, Info, CheckSquare, UploadCloud, ExternalLink, Copy, Download, EyeOff, FileText, Image as LucideImage, Link, List, MoreHorizontal, Plus, Sparkles, UserPlus, ThumbsUp, ThumbsDown, MessageCircle, RefreshCw, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { CreativeConcept, TopicIdeas, SelectedRecommendationForCreative } from "@/types/creative";
import { useDropzone } from "react-dropzone";
import { Input } from "@/components/ui/input";
// --- Added for type safety for grounding chunks ---
// If the structure is known, define a type for groundingChunks


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


const DEFAULT_TASK_SECTION = `You are a senior prompt engineer and content strategist with deep expertise in digital content for the Thai market.

Task:
Analyze the {clientname} brand info below. Use it as inspiration to create 20 unique, powerful “Core Content Concepts” (ideas) for the {clientname} Thailand Facebook page.

Objectives:

Grab the attention of Thai audiences (scroll-stopping ideas).

Boost Facebook engagement (likes, comments, shares, saves).

Spark interest in {clientname} and its services—making readers curious or motivated to learn more.

Reflect {clientname} unique story, expertise, and point of view that competitors cannot copy.

How to Think:

Tap into real Thai pain points, dreams, and challenges around saving, investing, and managing money.

Draw from brand stories, behind-the-scenes insights, customer experiences, unique data, and {clientname} special strengths.

Turn technical/complex info into friendly, relatable stories or knowledge.

Surprise, educate, or inspire readers (“Oh wow!” moments).

Avoid direct selling or promotional language—focus on value, insight, or inspiration.

Constraints:

Exactly 20 ideas—no more, no less.

Each idea = 1–3 sentences in Thai, describing the core concept (no titles, no call to action).

Each idea must be distinctly different (no duplicates, no slight rewordings).`;

const DEFAULT_DETAILS_SECTION = `a.  **\`content_pillar\`:** กำหนดธีมเนื้อหาหลักหรือหมวดหมู่ **(ภาษาไทย)** ที่เน้นการนำเสนอจุดแข็งที่คู่แข่งไม่มี เช่น "ข้อมูลเชิงลึกของเราเท่านั้น", "ความแตกต่างจากคู่แข่ง", "ผลลัพธ์จริงของลูกค้า", "เทคโนโลยีเฉพาะที่ไม่มีใครใช้", "ค่าธรรมเนียมแบบใหม่", "มาตรฐานที่ยืนยันได้".

b.  **\`product_focus\`:** ระบุ {productFocus} หรือฟีเจอร์, ตัวเลข, หรือข้อเสนอที่แบรนด์คุณมีคนเดียว เช่น "ค่าธรรมเนียม 0.2%", "ไม่มีขั้นต่ำ", "พอร์ตทองคำพร้อมปรับตามเศรษฐกิจ" **(ภาษาไทย)**.

c.  **\`concept_idea\`:** สรุปแนวคิดสร้างสรรค์หลัก (1-2 ประโยค) ที่เน้น *มุมมองใหม่* หรือ *การหักล้างความเชื่อเดิม* ด้วยหลักฐาน เช่น สถิติ, ความสำเร็จของลูกค้า, หรือเทคโนโลยีที่พิสูจน์แล้ว **(ภาษาไทย)**.

d.  **\`copywriting\`:** สร้างสรรค์องค์ประกอบข้อความโฆษณา **(ภาษาไทย)** ที่จับใจ และ "เล่าเรื่องให้เห็นภาพ" โดยไม่ใช่แค่บอกข้อดี:
    *   **\`headline\`:** พาดหัวที่น่าสนใจ สร้าง curiosity หรือ shock ด้วยข้อมูลจริงหรือ insight.
    *   **\`sub_headline_1\`:** ขยายมุมมองเพิ่มเติม อาจใช้ social proof หรือ logic support.
    *   **\`sub_headline_2\`:** อิงกระแส, เทรนด์ หรือ context ปัจจุบันเพื่อความเชื่อมโยง (ใช้ \`null\` หากไม่จำเป็น).
    *   **\`bullets\`:** จุดขาย 2-4 ข้อที่เจาะจง, วัดผลได้ หรือแตกต่างจริง เช่น "ปรับพอร์ตอัตโนมัติ", "ไม่มี lock-in", "มีทีมคอยดูแล".
    *   **\`cta\`:** Call To Action ที่เชิญชวนให้ลอง, เปรียบเทียบ, หรือเห็นผล เช่น "ดูตัวอย่างจริง", "ทดลองวันนี้", "เปรียบเทียบก่อนตัดสินใจ".
`;

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
interface ModelResults {
  [modelName: string]: Recommendation[];
}

interface ModelLoadingState {
  [modelName: string]: boolean;
}

interface ModelErrorState {
  [modelName: string]: string | null;
}

// --- Types for Idea Evaluation ---
interface IdeaFeedback {
  id: string;
  vote: "good" | "bad" | null;
  comment: string;
  idea?: Recommendation; // Store the full idea for saving to database
}

interface IdeaFeedbackMap {
  [id: string]: IdeaFeedback;
};

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
// Store journey per tempId even with single selection for potential future multi-select re-enablement
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
    title?: string; // Optional, for Ad Copy Details display
}

// Fix for object with name/description being rendered directly
export function RecommendationCards() {
    // Add fallback JSX rendering to prevent direct object rendering
    // Remove router if no longer needed
    // const router = useRouter(); 

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

    // --- State for Data and Loading/Error (Updated for Multi-Model) ---
    const [resultsByModel, setResultsByModel] = useState<ModelResults>({});
    const [isLoading, setIsLoading] = useState<ModelLoadingState>({});
    const [error, setError] = useState<ModelErrorState>({});
    const [selectedModel, setSelectedModel] = useState<string>("gemini");
    // Track models for current results

    // --- State for Dialog (Recommendation Details Only) ---
    const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
    // --- State for Image Generation in Dialog ---
    const [aspectRatio, setAspectRatio] = useState<string>('ASPECT_16_9');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
    const [imageError, setImageError] = useState<string | null>(null);

    // Define types for competitor analysis data
interface CompetitorAnalysisData {
    analysis?: any;
    news?: Array<{title: string, summary: string}>;
    [key: string]: any;
}

// --- State for Competitor Analysis ---
    const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorAnalysisData | null>(null);
    const [isCompetitorAnalysisLoading, setIsCompetitorAnalysisLoading] = useState<boolean>(false);
    const [competitorAnalysisError, setCompetitorAnalysisError] = useState<string | null>(null);
    const [showCompetitorAnalysis, setShowCompetitorAnalysis] = useState<boolean>(false);
    const [news, setNews] = useState<Array<{title: string, summary: string, isExpanded: boolean}>>([]);
    const [isNewsLoading, setIsNewsLoading] = useState<boolean>(false);
    const [newsError, setNewsError] = useState<string | null>(null);

    // --- Function to fetch related news ---
    const fetchNews = async () => {
        console.log('🔄 Starting to fetch news...');
        if (!selectedClientName || !selectedProductFocus) {
            console.log('❌ Missing client name or product focus');
            return [];
        }
        
        console.log(`📡 Fetching news for client: ${selectedClientName}, product: ${selectedProductFocus}`);
        setIsNewsLoading(true);
        setNewsError(null);
        
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 200000); // 200 seconds
            
            console.log('🌐 Sending request to news API...');
            const startTime = Date.now();
            
            const response = await fetch('https://convertcake-cvc.app.n8n.cloud/webhook/8b48c939-f6fc-4fc1-ba64-31753732197c', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_name: selectedClientName,
                    product_focus: selectedProductFocus
                }),
                signal: controller.signal
            });
            
            // Clear the timeout since the request completed
            clearTimeout(timeoutId);
            const requestTime = Date.now() - startTime;
            console.log(`✅ Received response in ${requestTime}ms. Status: ${response.status}`);
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            let result;
            try {
                result = await response.json();
                console.log('📰 Raw news API response:', JSON.stringify(result, null, 2));
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                throw new Error('Invalid response from server');
            }
            
            // Handle both array response and nested response format
            let newsData = [];
            if (Array.isArray(result)) {
                newsData = result;
            } else if (result[0]?.response?.body?.output?.news_summaries) {
                newsData = result[0].response.body.output.news_summaries;
            } else if (result.news_summaries) {
                newsData = result.news_summaries;
            }
            
            console.log(`📊 Found ${newsData?.length || 0} news items`);
            
            const formattedNews = (newsData || []).map((item: any) => ({
                title: item.title || 'No title',
                summary: item.summary || 'No summary available',
                isExpanded: true // Expanded by default
            }));
    
            setNews(formattedNews);
            console.log('🎉 Successfully updated news state');
            return formattedNews;
            
        } catch (error) {
            console.error('❌ Error fetching news:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load news';
            console.error('Error details:', error);
            setNewsError(`News: ${errorMessage}. Will continue with available data.`);
            return [];
        } finally {
            console.log('🏁 Finished news fetch operation');
            setIsNewsLoading(false);
        }
    };

    // Helper function to toggle news item expansion
    const toggleNewsItem = (index: number) => {
        setNews(prevNews => 
            prevNews.map((item, i) => 
                i === index ? { ...item, isExpanded: !item.isExpanded } : item
            )
        );
    };

    // --- Helper function to save competitor analysis ---
    const saveCompetitorAnalysis = async (analysisData: any) => {
        if (!selectedClientName || !selectedProductFocus) {
            console.log('Cannot save: Missing client name or product focus');
            return false;
        }
    
        try {
            const response = await fetch('/api/competitor-analysis/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: selectedClientName,
                    productFocus: selectedProductFocus,
                    analysisData: analysisData
                })
            });
    
            if (!response.ok) {
                throw new Error('Failed to save analysis');
            }
    
            return true;
        } catch (error) {
            console.error('Error saving analysis:', error);
            return false;
        }
    };

    // Load saved analysis when component mounts or client/product changes
    useEffect(() => {
        const loadSavedAnalysis = async () => {
            if (!selectedClientName || !selectedProductFocus) return;
            
            try {
                const response = await fetch(
                    `/api/competitor-analysis/saved?client=${encodeURIComponent(selectedClientName)}&product=${encodeURIComponent(selectedProductFocus)}`
                );
                
                if (response.ok) {
                    const savedData = await response.json();
                    if (savedData) {
                        setCompetitorAnalysis(savedData);
                        setShowCompetitorAnalysis(true);
                    }
                }
            } catch (error) {
                console.error('Error loading saved analysis:', error);
            }
        };

        loadSavedAnalysis();
    }, [selectedClientName, selectedProductFocus]);

    // --- Helper function to fetch competitor analysis ---
    const fetchCompetitorAnalysis = async (retryCount = 0) => {
        if (!selectedClientName || !selectedProductFocus) {
            console.log('Missing client name or product focus');
            return null;
        }
    
        setIsCompetitorAnalysisLoading(true);
        setCompetitorAnalysisError(null);
    
        try {
            // 1. Prepare query parameters
            const queryParams = new URLSearchParams({
                clientName: selectedClientName,
                productFocus: selectedProductFocus,
                ...(selectedRunId && { runId: selectedRunId })
            });

            console.log('Starting parallel API requests...');
            
            // 2. Start both API calls in parallel
            const [analysisResponse, newsResponse] = await Promise.allSettled([
                fetch(`/api/competitor-analysis?${queryParams.toString()}`),
                fetchNews() // This will handle its own loading state
            ]);

            // 3. Handle analysis response
            if (analysisResponse.status === 'rejected') {
                throw new Error('Failed to fetch analysis data');
            }
            
            const response = analysisResponse.value;
            if (!response.ok) {
                throw new Error(`Error fetching competitor analysis: ${response.status}`);
            }

            const data = await response.json();

            // Handle Gemini JSON errors with retry logic
            if (data?.analysis?.error?.includes('Gemini response was not valid JSON') && retryCount < 3) {
                console.log(`Retrying competitor analysis (attempt ${retryCount + 1}/3)...`);
                return new Promise(resolve => {
                    setTimeout(async () => {
                        const result = await fetchCompetitorAnalysis(retryCount + 1);
                        resolve(result);
                    }, 3000);
                });
            }

            // 4. Process news response
            let newsData = [];
            if (newsResponse.status === 'fulfilled') {
                newsData = newsResponse.value;
                // Update news state directly to ensure UI has the latest data
                setNews(newsData);
            } else {
                console.warn('News fetch failed:', newsResponse.reason);
                setNewsError('Could not load latest news. You can try refreshing later.');
            }

            // 5. Combine analysis and news data
            const combinedData = {
                ...data,
                news: newsData
            };
    
            // 6. Save the combined data
            const saveSuccess = await saveCompetitorAnalysis(combinedData);
            if (!saveSuccess) {
                console.warn('Failed to save competitor analysis');
            }
    
            // 7. Update state with the complete data
            setCompetitorAnalysis(prev => ({
                ...prev,
                ...combinedData
            }));
            setShowCompetitorAnalysis(true);
    
            console.log('Analysis and news loaded successfully');
            return combinedData;
    
        } catch (error) {
            console.error("Error in fetchCompetitorAnalysis:", error);
            setCompetitorAnalysisError("Failed to load analysis. Please try again later.");
            return null;
        } finally {
            setIsCompetitorAnalysisLoading(false);
        }
    };
    
    // --- State for Model Selection (Multi-Model Support) ---
    const [selectedModels, setSelectedModels] = useState<string[]>(['gemini']); // Default to Gemini
    const [modelsRequestedInLastRun, setModelsRequestedInLastRun] = useState<string[]>([]); // Track which models were used in the last run
    
    // --- State for Competitor Analysis Toggle ---
    const [includeCompetitorAnalysis, setIncludeCompetitorAnalysis] = useState<boolean>(true);

    // --- UPDATED: State for Card Selection (Single Selection) ---
    const [selectedCard, setSelectedCard] = useState<Recommendation | null>(null);

    // --- NEW State for Customer Journeys ---
    const [customerJourneys, setCustomerJourneys] = useState<CustomerJourneysMap>({}); // Keep map to store by tempId
    const [isGeneratingJourneys, setIsGeneratingJourneys] = useState<boolean>(false);
    const [journeyError, setJourneyError] = useState<string | null>(null);
    // --- RE-ADD State for Journey Details Dialog ---
    const [viewingJourneyId, setViewingJourneyId] = useState<string | null>(null);

    // --- NEW State for Creative Concepts --- 
    const [creativeConcepts, setCreativeConcepts] = useState<CreativeConcept[] | null>(null);
    const [isGeneratingConcepts, setIsGeneratingConcepts] = useState<boolean>(false);
    const [conceptsError, setConceptsError] = useState<string | null>(null);

    // --- NEW State for Image Generation with References ---
    const [selectedConceptForImage, setSelectedConceptForImage] = useState<SelectedConcept | null>(null);
    const [productImages, setProductImages] = useState<File[]>([]);
    
    // --- State for Idea Evaluation ---
    const [ideaFeedback, setIdeaFeedback] = useState<IdeaFeedbackMap>({});
    const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
    const [isRegeneratingIdea, setIsRegeneratingIdea] = useState<boolean>(false);
    const [regeneratingIdeaId, setRegeneratingIdeaId] = useState<string | null>(null);
    const [adReferenceImages, setAdReferenceImages] = useState<File[]>([]);
    const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
    // Add state for image size
    const [imageSize, setImageSize] = useState<string>('auto'); // Default to auto

    // Add new state for custom prompt
    const [customPrompt, setCustomPrompt] = useState<string>('');
    
    // --- State for Optional Brief Templates ---
    const [isOptionalBriefOpen, setIsOptionalBriefOpen] = useState<boolean>(false);
    const [selectedBriefTemplate, setSelectedBriefTemplate] = useState<string | null>(null);
    
    // Define the optional brief templates
    const briefTemplates = [
        {
            id: "pain-point",
            title: "Pain Point Solution Focus",
            content: "I want you to generate ideas that directly address a key pain point of our target customers, and clearly show how our product or service uniquely solves this problem."
        },
        {
            id: "testimonial",
            title: "Emotional Testimonial Leverage",
            content: "Please create ideas that leverage real or hypothetical testimonials—showing authentic customer voices and how their lives improved after using our product or service."
        },
        {
            id: "data-driven",
            title: "Data-Driven Proof",
            content: "Develop ideas that use surprising, compelling, or quantifiable proof points (e.g., statistics, results, or proprietary data) to demonstrate the effectiveness of our product or service in a way that builds trust."
        },
        {
            id: "comparison",
            title: "Comparison/Before-After Stories",
            content: "Generate ideas that use 'before and after' scenarios, direct comparisons, or transformation stories to vividly illustrate the difference our product or service makes."
        },
        {
            id: "unexpected",
            title: "Unexpected Use Cases or Benefits",
            content: "I want you to come up with ideas that highlight unusual, overlooked, or unexpected ways our product or service can be used, providing fresh perspectives that competitors aren't talking about."
        }
    ];

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
            setSelectedCard(null); // Clear selection
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
            setSelectedCard(null); // Clear selection
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
        setSelectedCard(null); // Clear selection
        setCustomerJourneys({});
        setIsGeneratingJourneys(false);
        setJourneyError(null);
        setCreativeConcepts(null); // Clear concepts
        setIsGeneratingConcepts(false);
        setConceptsError(null);

        setCompetitorAnalysis(null);
        setCompetitorAnalysisError(null);
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
            fetchCompetitorAnalysis();

        } catch (err: any) {
            console.error("Error fetching analysis run ID:", err);
            setMetaError(err.message);
        } finally {
            setIsMetaLoading(false);
        }
    };

    // --- Trigger analysis run ID fetch when selection changes ---
    useEffect(() => {
        if (selectedClientName && selectedProductFocus) {
            // fetchAnalysisRunId will call fetchCompetitorAnalysis internally
            // so we don't need to call it again here
            fetchAnalysisRunId();
        }
    }, [selectedClientName, selectedProductFocus]);

    // --- Generate Recommendations (Updated for Multi-Model) ---
    const handleGenerateRecommendations = async () => {
        if (!selectedRunId) {
            setMetaError("Please select a valid Client and Product combination first.");
            return;
        }
        if (!competitorAnalysis) {
            setMetaError("Please wait for competitor analysis to complete before generating ideas.");
            return;
        }

        if (selectedModels.length === 0) {
            setMetaError("Please select at least one generation model.");
            return;
        }

        // Track which models are being used in this run
        setModelsRequestedInLastRun(selectedModels);
        
        // Reset state for the selected models
        const initialLoadingState: ModelLoadingState = {};
        const initialErrorState: ModelErrorState = {};
        
        // Initialize loading states for both versions
        selectedModels.forEach(model => {
            initialLoadingState[`${model}`] = true; // Standard version
            initialLoadingState[`${model}-with-competitors`] = true; // With competitors version
            initialErrorState[`${model}`] = null;
            initialErrorState[`${model}-with-competitors`] = null;
        });
        
        setIsLoading(initialLoadingState);
        setError(initialErrorState);
        setResultsByModel({});
        setSelectedRecommendation(null);
        setSelectedCard(null);
        setCustomerJourneys({});
        setIsGeneratingJourneys(false);
        setJourneyError(null);
        setCreativeConcepts(null);
        setIsGeneratingConcepts(false);
        setConceptsError(null);
        
        // Reset feedback state when generating new ideas
        setIdeaFeedback({});
        setEditingFeedbackId(null);
        setIsRegeneratingIdea(false);
        setRegeneratingIdeaId(null);

        try {
            console.log(`Fetching recommendations for runId: ${selectedRunId}, Models: ${selectedModels.join(', ')}`);
            
            // Create a function to fetch recommendations with a given includeCompetitorAnalysis flag
            const fetchRecommendations = async (withCompetitors: boolean) => {
                let apiUrl = `/api/generate-recommendations?runId=${selectedRunId}`;
                apiUrl += `&models=${encodeURIComponent(selectedModels.join(','))}`;
                if (userBrief.trim()) {
                    apiUrl += `&brief=${encodeURIComponent(userBrief.trim())}`;
                }
                apiUrl += `&taskSection=${encodeURIComponent(editableTaskSection)}`;
                apiUrl += `&includeCompetitorAnalysis=${withCompetitors}`; // This parameter is still needed for the API
                apiUrl += `&clientName=${encodeURIComponent(selectedClientName || '')}`;
                apiUrl += `&productFocus=${encodeURIComponent(selectedProductFocus || '')}`;
                apiUrl += `&market=Thailand`;

                const response = await fetch(apiUrl);
                const data = await response.json();
                return { response, data };
            };

            // Run both versions in parallel
            const [standardResults, withCompetitorsResults] = await Promise.all([
                fetchRecommendations(false),
                fetchRecommendations(true)
            ]);

            // Process standard results (without competitors)
            const processedStandardResults: ModelResults = {};
            if (standardResults.response.ok) {
                Object.entries(standardResults.data.results || {}).forEach(([modelName, recommendations]) => {
                    if (Array.isArray(recommendations)) {
                        processedStandardResults[modelName] = recommendations.map((rec, index) => ({
                            ...rec,
                            tempId: `${modelName}-${selectedRunId}-${index}`
                        }));
                    }
                });
                setResultsByModel(processedStandardResults);
            } else {
                const errorMsg = standardResults.data.error || `API Error: ${standardResults.response.status}`;
                console.error("API Error (standard):", errorMsg);
                const newErrorState = { ...initialErrorState };
                selectedModels.forEach(model => {
                    newErrorState[model] = errorMsg;
                });
                setError(newErrorState);
            }

            // Process results with competitors
            const processedCompetitorResults: ModelResults = {};
            if (withCompetitorsResults.response.ok) {
                Object.entries(withCompetitorsResults.data.results || {}).forEach(([modelName, recommendations]) => {
                    if (Array.isArray(recommendations)) {
                        const modelKey = `${modelName}-with-competitors`;
                        processedCompetitorResults[modelKey] = recommendations.map((rec, index) => ({
                            ...rec,
                            tempId: `${modelKey}-${selectedRunId}-${index}`
                        }));
                    }
                });
                setResultsByModel(prev => ({
                    ...prev,
                    ...processedCompetitorResults
                }));
            } else {
                const errorMsg = withCompetitorsResults.data.error || `API Error: ${withCompetitorsResults.response.status}`;
                console.error("API Error (with competitors):", errorMsg);
                const newErrorState = { ...initialErrorState };
                selectedModels.forEach(model => {
                    newErrorState[`${model}-with-competitors`] = errorMsg;
                });
                setError(prev => ({ ...prev, ...newErrorState }));
            }

        } catch (err: any) {
            console.error("Failed to fetch recommendations:", err);
            const errorMsg = err.message || "An unknown error occurred while generating recommendations.";
            const newErrorState = { ...initialErrorState };
            selectedModels.forEach(model => {
                newErrorState[model] = errorMsg;
                newErrorState[`${model}-with-competitors`] = errorMsg;
            });
            setError(newErrorState);
            setResultsByModel({});
        } finally {
            const finalLoadingState: ModelLoadingState = {};
            selectedModels.forEach(model => {
                finalLoadingState[model] = false;
                finalLoadingState[`${model}-with-competitors`] = false;
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

    // --- Handle brief template selection ---
    const handleBriefTemplateSelection = (templateId: string, checked: boolean) => {
        if (checked) {
            // Find the template
            const template = briefTemplates.find(t => t.id === templateId);
            if (template) {
                // Set the selected template and update the brief content
                setSelectedBriefTemplate(templateId);
                setUserBrief(template.content);
            }
        } else {
            // If unchecked, clear the selection if it matches the current selection
            if (selectedBriefTemplate === templateId) {
                setSelectedBriefTemplate(null);
                // Don't clear the user brief as they might have edited it
            }
        }
    };

    // --- UPDATED Card Click Handler (Toggle Single Selection) ---
    const handleCardSelectionToggle = (recommendation: Recommendation) => {
        if (!recommendation.tempId) return;

        // If clicking the already selected card, deselect it
        if (selectedCard?.tempId === recommendation.tempId) {
            setSelectedCard(null);
        } else {
            // Otherwise, select the new card
            setSelectedCard(recommendation);
        }
        // Reset concepts when selection changes
        setCreativeConcepts(null);
        setIsGeneratingConcepts(false);
        setConceptsError(null);
        setSelectedConceptForImage(null); // Deselect concept if changing recommendation
    };

    // --- Handler for Opening Details Dialog ---
    const handleOpenDetails = (recommendation: Recommendation, event: React.MouseEvent) => {
        event.stopPropagation();
        setSelectedRecommendation(recommendation);
        setGeneratedImageUrl(null);
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

    // --- UPDATED Handler for the first button -> Generate Journey for the single selected card ---
    const handleGenerateCustomerJourneys = async () => {
        if (!selectedCard || !selectedClientName) {
            console.log("[ui] Cannot generate journey: No card selected or client name missing.");
            setJourneyError("Please select a recommendation card first.");
            return;
        }

        const cardTempId = selectedCard.tempId;
        if (!cardTempId) {
            console.error("[ui] Selected card is missing tempId.");
            setJourneyError("Internal error: Selected card identifier missing.");
            return;
        }

        // Check if journey already exists or is being generated for this specific card
        if (customerJourneys[cardTempId] || isGeneratingJourneys) {
             console.log(`[ui] Journey already generated or generation in progress for ${cardTempId}.`);
             // Optionally, you might want to allow regeneration, but for now, we skip.
             // If allowing regeneration, ensure isGeneratingJourneys is handled correctly.
             return;
        }

        setIsGeneratingJourneys(true);
        setJourneyError(null);

        const recommendationForApi = {
            title: selectedCard.title,
            concept: selectedCard.concept_idea,
            description: selectedCard.description,
            tempId: cardTempId,
        };

        try {
            console.log(`[ui] Calling API to generate journey for idea: ${recommendationForApi.title}`);
            const response = await fetch('/api/generate-customer-journey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedRecommendations: [recommendationForApi], // Send as array even for single item
                    clientName: selectedClientName,
                    productFocus: selectedProductFocus === 'placeholder-for-empty' ? null : selectedProductFocus,
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `API Error: ${response.status}`);
            }

            // Update the journey map with the result for the specific tempId
            setCustomerJourneys(prev => ({
                ...prev,
                ...(result.customerJourneys || {}) // API should return map { tempId: journey }
            }));
            console.log(`[ui] Successfully received customer journey for ${cardTempId}.`);

        } catch (err: any) {
            console.error("[ui] Error generating customer journey:", err);
            setJourneyError(err.message || "Failed to generate customer journey.");
           
        } finally {
            setIsGeneratingJourneys(false); // Set loading false regardless of success/fail
        }
    };

    // --- UPDATED Handler for Generating Content Pillars/Creative Concepts for the single selected card ---
    const handleGenerateCreativeConcepts = async () => {
        if (!selectedCard || !selectedCard.tempId) {
            console.error("[handleGenerateCreativeConcepts] No card selected.");
            setConceptsError("Please select a recommendation card first.");
            setCreativeConcepts(null);
            return;
        }

        const journeyData = customerJourneys[selectedCard.tempId];
        if (!journeyData) {
            console.error("[handleGenerateCreativeConcepts] Customer journey has not been successfully generated for the selected card.");
            setConceptsError("Please generate the customer journey for the selected card first.");
            setCreativeConcepts(null);
            return;
        }

        if (!selectedClientName) {
             console.error("[handleGenerateCreativeConcepts] Client name missing.");
             setConceptsError("Client name is missing.");
             return;
        }

        setIsGeneratingConcepts(true);
        setConceptsError(null);
        setCreativeConcepts(null); // Clear previous concepts

        // Format data for the API using only the selected card
        const recommendationForApi: SelectedRecommendationForCreative = {
            title: selectedCard.title,
            concept: selectedCard.concept_idea,
            description: selectedCard.description,
            tempId: selectedCard.tempId,
            customerJourney: journeyData, // We already checked this exists
            content_pillar: selectedCard.content_pillar,
            product_focus: selectedCard.product_focus,
        };

        try {
            console.log(`[ui] Calling API to generate creative concepts for: ${recommendationForApi.title}`);
            const response = await fetch('/api/generate-creative-concepts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedRecommendations: [recommendationForApi], // Send as array
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
            if (!data.imageUrl && !data.b64Image) {
             throw new Error('API did not return an image.');
        }
        if (data.imageUrl) {
            setGeneratedImageUrl(data.imageUrl);
        } else if (data.b64Image) {
            setGeneratedImageUrl(`data:image/png;base64,${data.b64Image}`);
        }

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
    const hasGeneratedJourneysAttempted = selectedCard?.tempId ? (!!customerJourneys[selectedCard.tempId] || !!journeyError) : false;
    // Check if journey exists for the currently selected card
    const journeyExistsForSelected = selectedCard?.tempId ? !!customerJourneys[selectedCard.tempId] : false;

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

            // Add the selected image size
            formData.append('size', imageSize);

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

    // Add a new state for tracking tab to display
    const [activeTabForModel, setActiveTabForModel] = useState<Record<string, "recommendation" | "analysis">>({});

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
    
    // --- Idea Evaluation Functions ---
    
    // Handle voting on an idea (good or bad) with toggle functionality
    const handleVoteIdea = (id: string, vote: "good" | "bad") => {
        setIdeaFeedback(prev => {
            const existing = prev[id] || { id, vote: null, comment: '' };
            // If user clicks the same vote again, toggle it off (cancel the vote)
            const newVote = existing.vote === vote ? null : vote;
            
            // If vote is being canceled and there's no comment, remove the item completely
            if (newVote === null && (!existing.comment || existing.comment.trim() === '')) {
                const newFeedback = { ...prev };
                delete newFeedback[id];
                return newFeedback;
            }
            
            // Find the idea to save its details (same as in handleFeedbackComment)
            let idea: Recommendation | undefined = existing.idea;
            if (!idea) {
                for (const [model, recommendations] of Object.entries(resultsByModel)) {
                    if (!Array.isArray(recommendations)) continue;
                    
                    const foundIdea = recommendations.find(rec => rec.tempId === id);
                    if (foundIdea) {
                        idea = foundIdea;
                        break;
                    }
                }
                // If idea is still not found, it will remain undefined
            }
            
            // Otherwise update the vote
            return {
                ...prev,
                [id]: {
                    ...existing,
                    vote: newVote,
                    idea // Include the full idea object
                }
            };
        });
    };
    
    // Handle feedback comment for an idea
    const handleFeedbackComment = (id: string, comment: string) => {
        setIdeaFeedback(prev => {
            // Find the previous vote if any
            const prevVote = prev[id]?.vote || null;
            
            // Find the idea to save its details
            let idea: Recommendation | undefined = undefined;
            for (const [model, recommendations] of Object.entries(resultsByModel)) {
                if (!Array.isArray(recommendations)) continue;
                
                const foundIdea = recommendations.find(rec => rec.tempId === id);
                if (foundIdea) {
                    idea = foundIdea;
                    break;
                }
            }
            
            return {
                ...prev,
                [id]: {
                    id,
                    vote: prevVote,
                    comment,
                    idea // Include the full idea object
                }
            };
        });
    };
    
    // Toggle feedback editing mode for an idea
    const toggleFeedbackEditing = (id: string | null) => {
        setEditingFeedbackId(id);
    };
    
    // Save all feedback to the database
    const saveFeedbackToDatabase = async () => {
        // Only save if there's feedback to save
        if (Object.keys(ideaFeedback).length === 0) {
            alert('No feedback to save');
            return;
        }
        
        try {
            // Show loading state
            alert('Saving feedback to database...');

            // For ideas without the full idea object reference, look them up before saving
            // This ensures we have title, description, and competitiveGap for all feedback entries
            const enhancedFeedback = {...ideaFeedback};
            
            // Ensure all feedback entries have the idea data
            for (const [id, feedbackEntry] of Object.entries(enhancedFeedback) as [string, IdeaFeedback][]) {
                // If this feedback entry doesn't have an idea reference or is missing required fields, find it
                if (!feedbackEntry.idea || feedbackEntry.idea === null || !feedbackEntry.idea.title || !feedbackEntry.idea.description) {
                    // Search all models for this idea
                    for (const [model, recommendations] of Object.entries(resultsByModel)) {
                        if (!Array.isArray(recommendations)) continue;
                        
                        const foundIdea = recommendations.find(rec => rec.tempId === id);
                        if (foundIdea) {
                            enhancedFeedback[id] = {
                                ...feedbackEntry,
                                idea: foundIdea
                            };
                            break;
                        }
                    }
                }
            }
            
            // Prepare the data to save
            const feedbackData = {
                clientName: selectedClientName,
                productFocus: selectedProductFocus,
                runId: selectedRunId,
                timestamp: new Date().toISOString(),
                feedback: enhancedFeedback // Use enhanced feedback with all idea data
            };
            
            // First, save to the database via API call
            const response = await fetch('/api/save-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server responded with status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Feedback saved to database:', result);
            alert(`Successfully saved ${Object.keys(ideaFeedback).length} feedback entries to database!`);
        } catch (error) {
            console.error('Error saving feedback:', error);
            alert(`Failed to save feedback: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    
    // Regenerate a single idea
    const regenerateIdea = async (id: string) => {
        // Find which model generated this idea
        let modelName = '';
        let ideaIndex = -1;
        let idea: Recommendation | undefined = undefined;
        
        // Loop through all models to find the idea
        for (const [model, recommendations] of Object.entries(resultsByModel)) {
            if (!Array.isArray(recommendations)) continue;
            
            const index = recommendations.findIndex(rec => rec.tempId === id);
            if (index !== -1) {
                modelName = model;
                ideaIndex = index;
                idea = recommendations[index];
                break;
            }
        }
        
        // If idea not found, return
        if (!idea || !modelName || ideaIndex === -1) {
            console.error('Cannot regenerate: idea not found');
            return;
        }
        
        // Set regenerating state
        setIsRegeneratingIdea(true);
        setRegeneratingIdeaId(id);
        
        try {
            // Call API to regenerate this specific idea
            const response = await fetch(`/api/regenerate-idea`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    runId: selectedRunId,
                    model: modelName,
                    ideaIndex,
                    feedback: ideaFeedback[id]?.comment || '',
                    originalIdea: idea, // Send the original idea to optimize
                    clientName: selectedClientName,
                    productFocus: selectedProductFocus,
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to regenerate idea: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update the idea in the results
            if (data.regeneratedIdea) {
                setResultsByModel(prev => {
                    // Deep clone the current results
                    const updated = JSON.parse(JSON.stringify(prev));
                    
                    // Find and replace the regenerated idea
                    if (updated[modelName] && Array.isArray(updated[modelName])) {
                        const index = updated[modelName].findIndex((rec: Recommendation) => rec.tempId === id);
                        if (index !== -1) {
                            // Preserve the tempId but update everything else
                            updated[modelName][index] = {
                                ...data.regeneratedIdea,
                                tempId: id
                            };
                        }
                    }
                    
                    return updated;
                });
                
                // Clear feedback for this idea
                setIdeaFeedback(prev => {
                    const updated = {...prev};
                    delete updated[id];
                    return updated;
                });
            }
        } catch (error) {
            console.error('Error regenerating idea:', error);
            alert(`Failed to regenerate idea: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsRegeneratingIdea(false);
            setRegeneratingIdeaId(null);
        }
    };

    return (
        <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                    setSelectedRecommendation(null);
                    setViewingJourneyId(null);
                    setGeneratedImageUrl(null);
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

                    {/* User Brief Input with Template Selection */}
                    <div className="grid gap-1.5 w-full">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="rec-user-brief" className="text-sm font-medium">Optional Brief</Label>
                            <Collapsible open={isOptionalBriefOpen} onOpenChange={setIsOptionalBriefOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                        {isOptionalBriefOpen ? "Hide Templates" : "Show Templates"}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2 space-y-2 border rounded-md p-3 bg-muted/30">
                                    <div className="text-xs text-muted-foreground mb-2">Select a template to use as your brief:</div>
                                    {briefTemplates.map((template) => (
                                        <div key={template.id} className="flex items-start space-x-2">
                                            <Checkbox 
                                                id={`template-${template.id}`}
                                                checked={selectedBriefTemplate === template.id}
                                                onCheckedChange={(checked) => handleBriefTemplateSelection(template.id, !!checked)}
                                                disabled={isAnyModelLoading || isMetaLoading}
                                                className="mt-0.5"
                                            />
                                            <div className="grid gap-0.5">
                                                <Label 
                                                    htmlFor={`template-${template.id}`}
                                                    className="text-xs font-medium cursor-pointer"
                                                >
                                                    {template.title}
                                                </Label>
                                                <p className="text-xs text-muted-foreground">{template.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
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
                    {/* <div className="grid gap-1.5 w-full">
                        <Label htmlFor="editable-task-section" className="text-sm font-medium">Editable Prompt: Task Section</Label>
                        <Textarea
                            id="editable-task-section"
                            placeholder="Define the core task for the AI..."
                            value={editableTaskSection}
                            onChange={(e) => setEditableTaskSection(e.target.value)}
                            className="min-h-[150px] bg-background font-mono text-xs"
                            disabled={isAnyModelLoading || isMetaLoading}
                        />
                    </div> */}

                    {/* Editable Details Section */}
                    {/* <div className="grid gap-1.5 w-full">
                        <Label htmlFor="editable-details-section" className="text-sm font-medium">Editable Prompt: Creative Execution Details Section</Label>
                        <Textarea
                            id="editable-details-section"
                            placeholder="Define the structure and requirements..."
                            value={editableDetailsSection}
                            onChange={(e) => setEditableDetailsSection(e.target.value)}
                            className="min-h-[150px] bg-background font-mono text-xs"
                            disabled={isAnyModelLoading || isMetaLoading}
                        />
                    </div> */}
                                       {(competitorAnalysis || isCompetitorAnalysisLoading) && (
                        <div className="grid gap-1.5 w-full mb-6 border-2 border-primary/20 rounded-lg p-4 bg-primary/5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <Label className="text-lg font-semibold text-primary">Market Research & Competitor Analysis</Label>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setShowCompetitorAnalysis(!showCompetitorAnalysis)}
                                        className="border-primary text-primary hover:bg-primary/10"
                                    >
                                        {showCompetitorAnalysis ? "Hide Analysis" : "Show Analysis"}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => fetchCompetitorAnalysis()}
                                        disabled={isCompetitorAnalysisLoading}
                                        className="border-primary text-primary hover:bg-primary/10"
                                    >
                                        {isCompetitorAnalysisLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Regenerate
                                    </Button>
                                </div>
                            </div>
                            
                            {isCompetitorAnalysisLoading && (
                                <div className="flex items-center justify-center h-20 border rounded-md bg-white">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span className="text-sm">Loading competitor analysis...</span>
                                </div>
                            )}
                            
                            {competitorAnalysisError && !isCompetitorAnalysisLoading && (
                                <div className="flex items-center justify-center h-20 border rounded-md bg-destructive/10 text-destructive">
                                    <AlertTriangle className="h-5 w-5 mr-2" />
                                    <span className="text-sm">{competitorAnalysisError}</span>
                                </div>
                            )}
                            
                            {showCompetitorAnalysis && competitorAnalysis && !isCompetitorAnalysisLoading && (
                                <div className="border rounded-md bg-white p-4 max-h-[500px] overflow-y-auto">
                                    {/* Enhanced debug output */}
                                    {(() => {
                                        console.log('Competitor Analysis Data:', competitorAnalysis);
                                        console.log('Analysis Object:', competitorAnalysis.analysis);
                                        console.log('Strengths:', competitorAnalysis.analysis?.strengths);
                                        console.log('Is strengths array?', Array.isArray(competitorAnalysis.analysis?.strengths));
                                        return null;
                                    })()}
                                    
                                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                                        {/* Strengths Section */}
                                        <div className="p-4 border rounded-lg bg-green-50 shadow-sm">
                                            <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Key Strengths
                                            </h3>
                                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                                {competitorAnalysis?.analysis?.strengths?.length > 0 ? (
                                                    competitorAnalysis.analysis.strengths.map((item: any, i: number) => {
                                                        // Handle different possible item structures
                                                        const displayText = item?.brand && item?.description 
                                                            ? `${item.brand}: ${item.description}` 
                                                            : item?.description || item?.brand || JSON.stringify(item);
                                                        return (
                                                            <li key={i} className="text-gray-700">
                                                                {displayText}
                                                            </li>
                                                        );
                                                    })
                                                ) : (
                                                    <li className="text-gray-500">No strengths data available</li>
                                                )}
                                            </ul>
                                        </div>
                                        
                                        {/* Weaknesses Section */}
                                        <div className="p-4 border rounded-lg bg-red-50 shadow-sm">
                                            <h3 className="text-lg font-semibold text-red-700 mb-3 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Weaknesses
                                            </h3>
                                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                                {competitorAnalysis?.analysis?.weaknesses?.length > 0 ? (
                                                    competitorAnalysis.analysis.weaknesses.map((item: any, i: number) => {
                                                        const displayText = item?.brand && item?.description 
                                                            ? `${item.brand}: ${item.description}` 
                                                            : item?.description || item?.brand || JSON.stringify(item);
                                                        return (
                                                            <li key={i} className="text-gray-700">
                                                                {displayText}
                                                            </li>
                                                        );
                                                    })
                                                ) : (
                                                    <li className="text-gray-500">No weaknesses data available</li>
                                                )}
                                            </ul>
                                        </div>
                                        
                                        {/* Shared Patterns Section */}
                                        <div className="p-4 border rounded-lg bg-blue-50 shadow-sm">
                                            <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Shared Patterns
                                            </h3>
                                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                                {competitorAnalysis?.analysis?.shared_patterns?.length > 0 ? (
                                                    competitorAnalysis.analysis.shared_patterns.map((item: any, i: number) => {
                                                        const displayText = item?.brand && item?.description 
                                                            ? `${item.brand}: ${item.description}` 
                                                            : item?.description || item?.brand || JSON.stringify(item);
                                                        return (
                                                            <li key={i} className="text-gray-700">
                                                                {displayText}
                                                            </li>
                                                        );
                                                    })
                                                ) : (
                                                    <li className="text-gray-500">No shared patterns data available</li>
                                                )}
                                            </ul>
                                        </div>
                                        
                                        {/* Market Gaps Section */}
                                        <div className="p-4 border rounded-lg bg-yellow-50 shadow-sm">
                                            <h3 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Market Gaps
                                            </h3>
                                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                                {competitorAnalysis?.analysis?.market_gaps?.length > 0 ? (
                                                    competitorAnalysis.analysis.market_gaps.map((item: any, i: number) => {
                                                        const displayText = typeof item === 'string' ? item : 
                                                            (item?.description || JSON.stringify(item));
                                                        return (
                                                            <li key={i} className="text-gray-700">
                                                                {displayText}
                                                            </li>
                                                        );
                                                    })
                                                ) : (
                                                    <li className="text-gray-500">No market gaps data available</li>
                                                )}
                                            </ul>
                                        </div>
                                        
                                        {/* Differentiation Strategies Section */}
                                        <div className="p-4 border rounded-lg bg-purple-50 shadow-sm col-span-2">
                                            <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                Differentiation Strategies
                                            </h3>
                                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                                {competitorAnalysis?.analysis?.differentiation_strategies?.length > 0 ? (
                                                    competitorAnalysis.analysis.differentiation_strategies.map((item: any, i: number) => {
                                                        const displayText = typeof item === 'string' ? item : 
                                                            (item?.description || JSON.stringify(item));
                                                        return (
                                                            <li key={i} className="text-gray-700">
                                                                {displayText}
                                                            </li>
                                                        );
                                                    })
                                                ) : (
                                                    <li className="text-gray-500">No differentiation strategies data available</li>
                                                )}
                                            </ul>
                                        </div>
                                        
                                        {/* Research Section (Google Grounding Search) */}
                                        <div className="p-4 border rounded-lg bg-indigo-50 shadow-sm col-span-2">
                                            <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m9 0h-4m4 0a2 2 0 012 2v14a2 2 0 01-2 2h-4m0-18v18m0 0H9" />
                                                </svg>
                                                Research & Market Insights
                                                <span className="ml-2 text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">Google Search</span>
                                            </h3>
                                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                                {competitorAnalysis && competitorAnalysis.analysis && Array.isArray(competitorAnalysis.analysis.research) && competitorAnalysis.analysis.research.length > 0 ? 
                                                    competitorAnalysis.analysis.research.map((item: string, i: number) => (
                                                        <li key={i} className="text-gray-700">{item}</li>
                                                    )) : 
                                                    <li className="text-gray-500">No research data available</li>
                                                }
                                            </ul>
                                        </div>
                                        
                                        {/* Related News Highlights Section */}
                                        <div className="p-4 border rounded-lg bg-amber-50 shadow-sm col-span-2">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-lg font-semibold text-amber-800 flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                                    </svg>
                                                    Related News Highlights
                                                </h3>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={fetchNews}
                                                    disabled={isNewsLoading}
                                                    className="text-xs h-7"
                                                >
                                                    {isNewsLoading ? (
                                                        <>
                                                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                            Loading
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RefreshCw className="mr-1 h-3 w-3" />
                                                            Refresh
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            
                                            {isNewsLoading && !news.length ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2 className="h-5 w-5 animate-spin text-amber-500 mr-2" />
                                                    <span className="text-amber-700 text-sm">Loading news...</span>
                                                </div>
                                            ) : newsError ? (
                                                <div className="p-3 bg-red-50 text-red-600 rounded text-sm">
                                                    {newsError}
                                                </div>
                                            ) : news.length > 0 ? (
                                                <ul className="space-y-3 list-disc pl-5">
                                                    {news.map((item, index) => (
                                                        <li key={index} className="text-amber-900">
                                                            <div className="font-medium">{item.title}</div>
                                                            {item.summary && (
                                                                <div className="mt-1 text-sm text-amber-800">
                                                                    {item.summary}
                                                                </div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="text-center py-4 text-amber-700 text-sm">
                                                    No recent news found. Try refreshing to check for updates.
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Summary Section - Full Width */}
                                        {/* Reference Links from groundingChunks (web.uri or web.url) */}
{(() => {
    // Helper to extract all web URLs from groundingChunks
    function extractReferenceUrls(obj: any): { url: string, title?: string }[] {
        let chunks: any[] = [];
        // Try all possible sources for groundingChunks
        if (obj?.groundingMetadata?.groundingChunks) chunks = obj.groundingMetadata.groundingChunks;
        else if (obj?.groundingChunks) chunks = obj.groundingChunks;
        else if (obj?.geminiRaw?.candidates?.[0]?.groundingMetadata?.groundingChunks) chunks = obj.geminiRaw.candidates[0].groundingMetadata.groundingChunks;
        else if (obj?.grounding_raw?.candidates?.[0]?.groundingMetadata?.groundingChunks) chunks = obj.grounding_raw.candidates[0].groundingMetadata.groundingChunks;
        const refs: { url: string, title?: string }[] = [];
        chunks.forEach(chunk => {
            if (chunk && chunk.web && (chunk.web.uri || chunk.web.url)) {
                refs.push({ url: chunk.web.uri || chunk.web.url, title: chunk.web.title });
            }
        });
        return refs;
    }
    const referenceLinks = extractReferenceUrls(competitorAnalysis);
    if (!referenceLinks.length) return null;
    return (
        <div className="p-4 border rounded-lg bg-orange-50 shadow-sm col-span-2">
            <h3 className="text-lg font-semibold text-orange-700 mb-3 flex items-center">
                <ExternalLink className="h-5 w-5 mr-2" />
                References
            </h3>
            <ul className="list-none pl-0 space-y-2 text-sm">
                {referenceLinks.map((ref, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-orange-800 hover:underline">
                            <ExternalLink className="h-4 w-4 mr-1 inline-block opacity-70" />
                            <span>{ref.title ? ref.title : ref.url}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
})()}

{competitorAnalysis && competitorAnalysis.analysis && competitorAnalysis.analysis.summary && (
    <div className="p-4 border rounded-lg bg-gray-50 shadow-sm col-span-2">
        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Summary
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
            {competitorAnalysis.analysis.summary}
        </p>
    </div>
)}

                                    </div>
                                </div>
                            )}
                            
                            {!showCompetitorAnalysis && competitorAnalysis && !isCompetitorAnalysisLoading && (
                                <div className="flex items-center justify-center h-10 border rounded-md bg-white text-muted-foreground">
                                    <Info className="h-4 w-4 mr-2" />
                                    <span className="text-sm">Click "Show Analysis" to view detailed competitor insights</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- Display Area (Updated for Tabs) --- */}
                {selectedModels.length > 0 ? (
                    <Tabs defaultValue={selectedModels[0]} className="w-full">
                        <div className="flex justify-between items-center mb-4">
                            <TabsList className="grid w-full grid-cols-4">
                                {selectedModels.flatMap(modelName => [
                                    {
                                        key: modelName,
                                        value: modelName,
                                        label: modelName === 'gemini' ? 'Gemini (Standard)' : modelName
                                    },
                                    {
                                        key: `${modelName}-with-competitors`,
                                        value: `${modelName}-with-competitors`,
                                        label: modelName === 'gemini' ? 'Gemini (With Market Research)' : `${modelName} (With Research)`
                                    }
                                ]).map(({key, value, label}) => (
                                    <TabsTrigger key={key} value={value} className="capitalize">{label}</TabsTrigger>
                                ))}
                            </TabsList>
                            
                            {/* Save All Feedback Button - Only visible when feedback exists */}
                            {Object.keys(ideaFeedback).length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={saveFeedbackToDatabase}
                                    className="flex items-center ml-4 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    Save Feedback ({Object.keys(ideaFeedback).length})
                                </Button>
                            )}
                        </div>

                        {selectedModels.flatMap(modelName => [
                            {
                                modelName,
                                displayName: modelName === 'gemini' ? 'Gemini (Standard)' : modelName,
                                hasCompetitors: false
                            },
                            {
                                modelName: `${modelName}-with-competitors`,
                                displayName: modelName === 'gemini' ? 'Gemini (With Market Research)' : `${modelName} (With Research)`,
                                hasCompetitors: true
                            }
                        ]).map(({modelName, displayName, hasCompetitors}) => (
                            <TabsContent key={modelName} value={modelName} className="mt-4">
                                {/* Loading State for this model */}
                                {isLoading[modelName] && (
                                    <div className="flex flex-col items-center justify-center gap-4 p-8 border rounded-lg text-muted-foreground min-h-[200px]">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                        <span className="capitalize">Generating {displayName} recommendations...</span>
                                    </div>
                                )}

                                {/* Error State for this model */}
                                {error[modelName] && !isLoading[modelName] && (
                                    <div className="flex flex-col justify-center items-center p-10 border border-destructive bg-destructive/10 rounded-lg min-h-[200px] text-destructive">
                                        <AlertTriangle className="h-8 w-8 mb-2" />
                                        <p className="font-semibold mb-1">Error Generating {displayName} Recommendations</p>
                                        <p className="text-sm text-center">
                                            {modelName.includes('gemini') && error[modelName]?.includes('Failed to parse recommendations JSON from initial Gemini')
                                                ? 'Something went wrong. Please retry to generate ideas.'
                                                : error[modelName]}
                                        </p>
                                    </div>
                                )}

                                {/* No Recommendations or Initial State for this model */}
                                {!isLoading[modelName] && !error[modelName] && (!resultsByModel[modelName] || (resultsByModel[modelName]?.length ?? 0) === 0) && (
                                    <div className="flex flex-col items-center justify-center gap-4 p-8 border rounded-lg text-muted-foreground min-h-[200px]">
                                        <AlertTriangle className="h-8 w-8" />
                                        <span>No {displayName.toLowerCase()} recommendations generated yet.</span>
                                        {hasCompetitors && (
                                            <p className="text-sm text-center text-muted-foreground mt-2">
                                                These recommendations will include market research and competitor analysis data.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Display Recommendations for this model */}
                                {!isLoading[modelName] && !error[modelName] && resultsByModel[modelName] && (resultsByModel[modelName]?.length ?? 0) > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(resultsByModel[modelName] ?? []).map((rec) => {
                                            const isSelected = selectedCard?.tempId === rec.tempId;
                                            // Check journey status specifically for this card, even if it's not the currently selected one for actions
                                            const cardJourneyData = customerJourneys[rec.tempId!];
                                            const cardJourneyIsAvailable = !!cardJourneyData;
                                            // We only show loading/failed status for the *currently* selected card related to the journey buttons
                                            const journeyIsLoadingForThisCard = isSelected && isGeneratingJourneys && !cardJourneyIsAvailable;
                                            const journeyHasFailedForThisCard = isSelected && !!journeyError && !cardJourneyIsAvailable && !isGeneratingJourneys;

                                            return (
                                                <Card
                                                    key={rec.tempId}
                                                    onClick={() => handleCardSelectionToggle(rec)}
                                                    className={cn(
                                                        "cursor-pointer hover:shadow-md transition-shadow duration-200 flex flex-col h-full relative",
                                                        isSelected ? "border-2 border-primary shadow-md" : "border",
                                                        !isSelected && rec.impact === 'High' ? 'border-green-500' :
                                                        !isSelected && rec.impact === 'Medium' ? 'border-yellow-500' :
                                                        '',
                                                        hasCompetitors ? 'border-l-4 border-l-blue-500' : ''
                                                    )}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 p-1 bg-primary text-primary-foreground rounded-full z-10">
                                                            <CheckSquare size={16} />
                                                        </div>
                                                    )}
                                                    <CardHeader className="pb-2">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div>
                                                                <Badge variant="outline" className={cn(
                                                                    "text-xs mb-1",
                                                                    hasCompetitors ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-muted'
                                                                )}>
                                                                    {displayName}
                                                                </Badge>
                                                            </div>
                                                            {hasCompetitors && (
                                                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                                    Market Research
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <CardTitle className="text-base leading-tight pr-8">
                                                            {rec.concept_idea || rec.title}
                                                        </CardTitle>
                                                        <CardDescription className="pt-1 text-sm">
                                                            <span className="block font-semibold text-muted-foreground">{rec.title}</span>
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
                                                        
                                                        {/* Idea Evaluation UI */}
                                                        <div className="mt-3 pt-3 border-t border-dashed">
                                                            <p className="text-xs font-medium mb-2 text-gray-600">Rate this idea:</p>
                                                            <div className="flex space-x-2 mb-3">
                                                                <Button 
                                                                    variant={ideaFeedback[rec.tempId!]?.vote === 'good' ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    className={ideaFeedback[rec.tempId!]?.vote === 'good' ? 'bg-green-600 hover:bg-green-700' : ''}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleVoteIdea(rec.tempId!, 'good');
                                                                    }}
                                                                >
                                                                    <ThumbsUp className="h-4 w-4 mr-1" />
                                                                    Good
                                                                </Button>
                                                                <Button 
                                                                    variant={ideaFeedback[rec.tempId!]?.vote === 'bad' ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    className={ideaFeedback[rec.tempId!]?.vote === 'bad' ? 'bg-red-600 hover:bg-red-700' : ''}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleVoteIdea(rec.tempId!, 'bad');
                                                                    }}
                                                                >
                                                                    <ThumbsDown className="h-4 w-4 mr-1" />
                                                                    Bad
                                                                </Button>
                                                            </div>
                                                            
                                                            {/* Feedback textarea */}
                                                            {(editingFeedbackId === rec.tempId! || ideaFeedback[rec.tempId!]?.comment) && (
                                                                <div className="mb-3">
                                                                    {editingFeedbackId === rec.tempId! ? (
                                                                        <>
                                                                            <Textarea 
                                                                                placeholder="Why do you like/dislike this idea?"
                                                                                className="w-full text-xs"
                                                                                value={ideaFeedback[rec.tempId!]?.comment || ''}
                                                                                onChange={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleFeedbackComment(rec.tempId!, e.target.value);
                                                                                }}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {Object.keys(ideaFeedback).length > 0 && (
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={saveFeedbackToDatabase}
                                                                                        className="flex items-center bg-blue-50 hover:bg-blue-100 border-blue-200"
                                                                                    >
                                                                                        <Download className="h-4 w-4 mr-1" />
                                                                                        Save All Feedback
                                                                                    </Button>
                                                                                )}
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleFeedbackEditing(null);
                                                                                    }}
                                                                                >
                                                                                    Done
                                                                                </Button>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div 
                                                                            className="p-2 bg-muted rounded-md text-xs cursor-pointer hover:bg-muted/80"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleFeedbackEditing(rec.tempId!);
                                                                            }}
                                                                        >
                                                                            <p>{ideaFeedback[rec.tempId!]?.comment}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Add feedback or regenerate buttons */}
                                                            <div className="flex space-x-2">
                                                                {!ideaFeedback[rec.tempId!]?.comment && (
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm"
                                                                        className="text-xs"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleFeedbackEditing(rec.tempId!);
                                                                        }}
                                                                    >
                                                                        <MessageCircle className="h-3 w-3 mr-1" />
                                                                        Add Feedback
                                                                    </Button>
                                                                )}
                                                                
                                                                {/* Regenerate button - only visible if feedback exists */}
                                                                {ideaFeedback[rec.tempId!]?.comment && (
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm"
                                                                        className="text-xs"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            regenerateIdea(rec.tempId!);
                                                                        }}
                                                                        disabled={isRegeneratingIdea && regeneratingIdeaId === rec.tempId!}
                                                                    >
                                                                        {isRegeneratingIdea && regeneratingIdeaId === rec.tempId! ? (
                                                                            <>
                                                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                                Regenerating...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <RefreshCw className="h-3 w-3 mr-1" />
                                                                                Regenerate
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* RE-ADD View Journey Button - Conditional - Now shows if journey exists for *this* card */}
                                                        {cardJourneyIsAvailable && (
                                                            <div className="mt-3 pt-3 border-t">
                                                                <div className="mt-1 space-y-1">
                                                                    <h5 className="text-xs font-semibold text-foreground">Journey Breakdown:</h5>
                                                                    <VisualJourneyLayout journey={cardJourneyData} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Show loading/error status only if this card is the currently selected one */}
                                                        {isSelected && (journeyIsLoadingForThisCard || journeyHasFailedForThisCard) && (
                                                            <div className="mt-3 pt-3 border-t">
                                                                {journeyIsLoadingForThisCard && (
                                                                    <div className="flex items-center text-xs text-muted-foreground py-2">
                                                                        <Loader2 className="h-3 w-3 mr-1 animate-spin"/>
                                                                        <span>Generating journey...</span>
                                                                    </div>
                                                                )}
                                                                {journeyHasFailedForThisCard && (
                                                                    <div className="flex items-center text-xs text-destructive py-2">
                                                                        <AlertTriangle className="h-3 w-3 mr-1"/>
                                                                        <span>Journey generation failed. Retry?</span> {/* Maybe add retry? */}
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
                                                            {/* RE-ADD View Journey Button - Show if available for THIS card */}
                                                            {cardJourneyIsAvailable && (
                                                                <Button
                                                                    variant={"secondary"}
                                                                    size="sm"
                                                                    className="h-6 px-2 py-1 text-xs ml-1"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Prevent card deselection
                                                                        setViewingJourneyId(rec.tempId!);
                                                                        setIsDialogOpen(true);
                                                                    }}
                                                                >
                                                                    View Journey
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
                <div className="mt-6 flex flex-col items-center gap-4">
                    {/* Button 1: Generate Journey for the selected card */}
                     <Button
                        onClick={handleGenerateCustomerJourneys}
                        disabled={!selectedCard || isGeneratingJourneys || journeyExistsForSelected} // Disable if no card, loading, or journey already exists
                    >
                         {isGeneratingJourneys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         {isGeneratingJourneys ? 'Generating Journey...' :
                         journeyExistsForSelected ? 'Customer Journey Generated' :
                         selectedCard ? `Generate Customer Journey for Selected Idea` :
                         'Select an Idea to Generate Journey'}
                     </Button>
                     {journeyError && !isGeneratingJourneys && selectedCard && ( // Show error related to journey gen if a card is selected
                        <p className="text-center text-sm text-destructive -mt-2">Error: {journeyError}</p>
                     )}

                     {/* Button 2: Generate Content Pillars (Requires selected card AND successful journey) */}
                     <Button
                         onClick={handleGenerateCreativeConcepts}
                         disabled={isGeneratingConcepts ||
                                   !selectedCard || // Disabled if no card selected
                                   !journeyExistsForSelected // Disabled if journey doesn't exist for the selected card
                                  }
                     >
                          {isGeneratingConcepts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isGeneratingConcepts ? 'Generating Content Pillars...' :
                           !selectedCard ? 'Select Idea & Generate Journey First' :
                           !journeyExistsForSelected ? 'Generate Customer Journey First' :
                           'Generate Content Pillars for Selected Idea'}
                     </Button>
                     {conceptsError && !isGeneratingConcepts && selectedCard && ( // Show concept error if card is selected
                         <p className="text-center text-sm text-destructive -mt-2">Error: {conceptsError}</p>
                     )}
                </div>
                {/* Remove general journey error display here, handled below buttons */}
                {/* {journeyError && !isGeneratingJourneys && (
                    <p className="text-center text-sm text-destructive mt-2">Error during journey generation: {journeyError}</p>
                )} */}

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
                        {/* Find title based on viewingJourneyId from ALL results, not just selected */}
                        <DialogTitle>Customer Journey: {Object.values(resultsByModel).flat().find(r => r?.tempId === viewingJourneyId)?.title || 'Analysis'}</DialogTitle>
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
            {creativeConcepts && !isGeneratingConcepts && !conceptsError && selectedCard && ( // Only show if a card is selected and concepts generated
                <div className="mt-8 pt-6 border-t">
                    <h3 className="text-xl font-semibold mb-4 text-center">Generated Content Pillars / Focus Targets for: <span className="font-normal italic">{selectedCard.title}</span></h3>
                    
                    {/* First Step: Select a Content Pillar */}
                    {!selectedConceptForImage && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {creativeConcepts.map((concept, index) => (
                                <Card 
                                    key={index} 
                                    className={cn(
                                        "shadow-sm flex flex-col cursor-pointer hover:border-primary transition-colors",
                                        "hover:shadow-md"
                                    )}
                                    onClick={() => {
                                        setSelectedConceptForImage(concept);
                                        // --- CORRECTED: Pre-populate ad copy details from selected card ---
                                        setAdCopyDetails(prevDetails => ({
                                            ...prevDetails, // Keep existing details like headline etc.
                                            description: selectedCard?.description || '',
                                            competitiveGap: selectedCard?.competitiveGap || ''
                                            // Reset specific fields if needed, e.g.:
                                            // headline: '', 
                                            // subHeadline1: '',
                                            // subHeadline2: '',
                                            // subHeadline3: '',
                                            // subHeadlineCta: '',
                                            // bubblePoints: []
                                        }));
                                        // Reset image-specific states
                                        setGeneratedImageUrl(null);
                                        setImageError(null);
                                        setCustomPrompt(''); // Reset custom prompt when concept changes
                                    }}
                                >
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
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Second Step: Image Generation Section */}
                    {selectedConceptForImage && (
                        <div className="mt-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Generate Images for Selected Content Pillar</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedConceptForImage(null);
                                        setGeneratedImageUrl(null);
                                        setImageError(null);
                                        setProductImages([]);
                                        setAdReferenceImages([]);
                                        setUserBrief("As an expert photographer and creator, create a new ad image for the product on the right, using the mood and tone of the reference image on the left. I want it to have an outstanding ad design with high-quality details.");
                                    }}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Select Different Pillar
                                </Button>
                            </div>

                            <div className="space-y-6">
                                {/* Selected Concept Summary - Now Editable */}
                                <Card className="bg-muted/30">
                                    <CardHeader>
                                        <CardTitle className="text-base flex flex-col gap-2">
                                            <Badge className="w-fit" variant="secondary">Selected Focus Target</Badge>
                                            <Textarea
                                                value={selectedConceptForImage.focusTarget}
                                                onChange={(e) => setSelectedConceptForImage(prev => ({
                                                    ...prev!,
                                                    focusTarget: e.target.value
                                                }))}
                                                className="min-h-[60px] text-base"
                                                placeholder="Enter focus target..."
                                            />
                                        </CardTitle>
                                        <CardDescription>
                                            <span className="font-medium">Key Message:</span>
                                            <Textarea
                                                value={selectedConceptForImage.keyMessage}
                                                onChange={(e) => setSelectedConceptForImage(prev => ({
                                                    ...prev!,
                                                    keyMessage: e.target.value
                                                }))}
                                                className="mt-2 min-h-[60px]"
                                                placeholder="Enter key message..."
                                            />
                                        </CardDescription>
                                    </CardHeader>
                                </Card>

                                {/* Ad Copy Inputs */}
                                <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                                    <h4 className="font-semibold">Ad Copy Details</h4>
                                    {selectedConceptForImage?.title && (
                                        <div className="text-base font-bold text-primary mb-2">{selectedConceptForImage.title}</div>
                                    )}

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Label htmlFor="description">รายละเอียด (Description)</Label>
                                        <Textarea
    id="description"
    placeholder="นำเสนอเนื้อหาเชิงลึกที่แสดงให้เห็นถึงคุณภาพและความทนทานของบล็อกไฟฟ้า iMan โดยอาจเปรียบเทียบกับเครื่องมือราคาถูกทั่วไป หรือแสดงการทดสอบความแข็งแรง เพื่อสร้างความน่าเชื่อถือและทักษ์ใจต่ออนของผู้..."
    className="min-h-[100px]"
    value={adCopyDetails.description}
    onChange={e => setAdCopyDetails(prev => ({
        ...prev,
        description: e.target.value
    }))}
/>
                                    </div>

                                    {/* Competitive Gap */}
                                    <div className="space-y-2">
                                        <Label htmlFor="competitiveGap">ช่องว่างทางการแข่งขัน (Competitive Gap Addressed)</Label>
                                        <Textarea
    id="competitiveGap"
    placeholder="ความกังวลเรื่องความทนทานของบล็อกไฟฟ้า กลัวซื้อมาแล้วใช้งานได้ไม่นาน เสียเงินโดยเปล่าประโยชน์"
    className="min-h-[100px]"
    value={adCopyDetails.competitiveGap}
    onChange={e => setAdCopyDetails(prev => ({
        ...prev,
        competitiveGap: e.target.value
    }))}
/>
                                    </div>

                                    {/* Headline */}
                                    <div className="space-y-2">
                                        <Label htmlFor="headline">Headline</Label>
                                        <Textarea
    id="headline"
    placeholder="e.g., เปิดอู่รถชนิดนี้ ต้องใช้บล็อกรุ่นไหน?"
    className="min-h-[60px]"
    value={adCopyDetails.headline}
    onChange={e => setAdCopyDetails(prev => ({
        ...prev,
        headline: e.target.value
    }))}
/>
                                    </div>

                                    {/* Sub-Headlines */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="subheadline1">Sub-Headline 1</Label>
                                            <Input
                                                id="subheadline1"
                                                placeholder="e.g., IW-400"
                                                value={adCopyDetails.subHeadline1}
                                                onChange={(e) => setAdCopyDetails(prev => ({
                                                    ...prev,
                                                    subHeadline1: e.target.value
                                                }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subheadline2">Sub-Headline 2</Label>
                                            <Input
                                                id="subheadline2"
                                                placeholder="e.g., IW-800"
                                                value={adCopyDetails.subHeadline2}
                                                onChange={(e) => setAdCopyDetails(prev => ({
                                                    ...prev,
                                                    subHeadline2: e.target.value
                                                }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subheadline3">Sub-Headline 3</Label>
                                            <Input
                                                id="subheadline3"
                                                placeholder="e.g., IW-X6"
                                                value={adCopyDetails.subHeadline3}
                                                onChange={(e) => setAdCopyDetails(prev => ({
                                                    ...prev,
                                                    subHeadline3: e.target.value
                                                }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Sub-Headline + CTA */}
                                    <div className="space-y-2">
                                        <Label htmlFor="subheadline-cta">Sub-Headline + CTA</Label>
                                        <Textarea
    id="subheadline-cta"
    placeholder="e.g., บล็อกไฟฟ้าไร้สายจาก iMan พร้อมตอบโจทย์&#10;เลือกซื้อได้เลย!"
    className="min-h-[80px]"
    value={adCopyDetails.subHeadlineCta}
    onChange={e => setAdCopyDetails(prev => ({
        ...prev,
        subHeadlineCta: e.target.value
    }))}
/>
                                    </div>

                                    {/* Bubble Points */}
                                    <div className="space-y-2">
                                        <Label htmlFor="bubble-points">Bubble Points</Label>
                                        <Textarea
    id="bubble-points"
    placeholder="e.g.,\n2 Years Warranty\nFree & Fast Maintenance\nOnline Support 24/7"
    className="min-h-[100px]"
    value={adCopyDetails.bubblePoints.join('\n')}
    onChange={e => setAdCopyDetails(prev => ({
        ...prev,
        bubblePoints: e.target.value.split('\n').filter(point => point.trim() !== '')
    }))}
/>
                                    </div>
                                </div>

                                {/* Custom Prompt Input - Now with Default Value */}
                                {/* <div className="space-y-2">
                                    <Label htmlFor="image-prompt">Custom Prompt</Label>
                                    <Textarea
                                        id="image-prompt"
                                        placeholder="Enter additional prompt details to guide the image generation..."
                                        className="min-h-[100px]"
                                        value={userBrief || "As an expert photographer and creator, create a new ad image for the product on the right, using the mood and tone of the reference image on the left. I want it to have an outstanding ad design with high-quality details."}
                                        onChange={(e) => setUserBrief(e.target.value)}
                                    />
                                </div> */}

                                {/* Custom Prompt Input */}
                                <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold">Image Generation Instructions</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="custom-prompt">Custom Instructions (Optional)</Label>
                                        <Textarea
                                            id="custom-prompt"
                                            placeholder="Add any additional instructions for image generation..."
                                            className="min-h-[100px] font-mono text-sm"
                                            value={customPrompt}
                                            onChange={(e) => setCustomPrompt(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* --- Guidance Text --- */}
                                <div className="p-3 my-4 border rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm space-y-1">
                                    <p className="font-semibold">Tips for Best Image Results:</p>
                                    <ul className="list-disc list-inside text-xs space-y-0.5">
                                        <li>Providing a <strong>Product/Material Image (PNG)</strong> (ideally with transparency) allows the AI to edit it directly (uses `/edits` API).</li>
                                        <li>If no Product/Material Image is provided, the AI generates an image purely from the prompt (uses `/generations` API).</li>
                                        <li>Upload <strong>Ad Reference Images</strong> (e.g., existing ads, logos, style guides) to guide the visual style, mood, and composition (influence via prompt text).</li>
                                        <li>Use the <strong>Custom Instructions</strong> field for specific requirements (e.g., "place product on a wooden table", "add a beach background").</li>
                                    </ul>
                                </div>

                                {/* Image Size Selection */}      
                                <div className="space-y-2">
                                    <Label htmlFor="image-size-select">Image Size</Label>
                                    <Select value={imageSize} onValueChange={setImageSize} disabled={isGeneratingImage}>
                                        <SelectTrigger className="w-[180px]" id="image-size-select">
                                            <SelectValue placeholder="Select size..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="auto">Auto (Default)</SelectItem>
                                            <SelectItem value="1024x1024">1024x1024 (Square)</SelectItem>
                                            <SelectItem value="1536x1024">1536x1024 (Landscape)</SelectItem>
                                            <SelectItem value="1024x1536">1024x1536 (Portrait)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Product Images Upload */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">1. Product/Material Images (PNG only)</h4>
                                        <span className="text-xs text-muted-foreground">Optional • Max 3 files</span> {/* Changed from Required */}
                                    </div>
                                    <div
                                        {...getProductRootProps()}
                                        className={cn(
                                            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                                            isProductDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                                        )}
                                    >
                                        <input {...getProductInputProps()} />
                                        <div className="space-y-2">
                                            <div className="flex justify-center">
                                                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <p>Drop product images here, or click to select</p>
                                            <p className="text-sm text-muted-foreground">PNG format only</p>
                                        </div>
                                    </div>

                                    {/* Product Images Preview */}
                                    {productImages.length > 0 && (
                                        <div className="grid grid-cols-3 gap-4">
                                            {productImages.map((file, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`Product ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded-lg border"
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeProductImage(index);
                                                        }}
                                                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Ad Reference Images Upload */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">2. Ad Reference Images</h4>
                                        <span className="text-xs text-muted-foreground">Optional • Max 5 files</span>
                                    </div>
                                    <div
                                        {...getAdReferenceRootProps()}
                                        className={cn(
                                            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                                            isAdReferenceDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                                        )}
                                    >
                                        <input {...getAdReferenceInputProps()} />
                                        <div className="space-y-2">
                                            <div className="flex justify-center">
                                                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <p>Drop reference ad images here, or click to select</p>
                                            <p className="text-sm text-muted-foreground">JPG, JPEG, PNG accepted</p>
                                        </div>
                                    </div>

                                    {/* Ad Reference Images Preview */}
                                    {adReferenceImages.length > 0 && (
                                        <div className="grid grid-cols-3 gap-4">
                                            {adReferenceImages.map((file, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`Reference ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded-lg border"
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeAdReferenceImage(index);
                                                        }}
                                                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Generate Button */}
                                <Button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleGenerateImageWithReferences();
                                    }}
                                    disabled={isGeneratingImage} // Removed productImages.length === 0 check
                                    className="w-full"
                                >
                                    {isGeneratingImage ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Image'
                                    )}
                                </Button>

                                {/* Error Display */}
                                {imageError && (
                                    <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive">
                                        <p className="font-semibold">Error generating image:</p>
                                        <p className="text-sm">{imageError}</p>
                                    </div>
                                )}

                                {/* Generated Image Display */}
                                {generatedImageUrl && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">Generated Image:</h4>
                                        <div className="relative w-full border rounded-lg overflow-hidden bg-muted/20">
                                            <img
                                                src={generatedImageUrl} // Expecting data URI
                                                alt="Generated image"
                                                className="w-full object-contain mx-auto"
                                                style={{ maxHeight: '1024px' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

        </Dialog>
    )
}
