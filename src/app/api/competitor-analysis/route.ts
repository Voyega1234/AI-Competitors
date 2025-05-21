import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseClient'; // Import Supabase client

// --- Environment Variables ---
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Define a basic Competitor type matching Supabase table structure
interface Competitor {
  id: string;
  analysisRunId: string;
  name?: string | null;
  services?: string[] | null;
  pricing?: string | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  targetAudience?: string | null;
  adThemes?: string[] | null;
  usp?: string | null;
  brandTone?: string | null;
  positivePerception?: string | null;
  negativePerception?: string | null;
}

// Helper function to call Gemini API via HTTP POST
async function callGeminiAPI(prompt: string, apiKey: string, model: string = "gemini-2.5-flash-preview-04-17", useGrounding: boolean = true) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    let body: any = {
        contents: [
            {   
                parts: [
                    { text: prompt }
                ]
            }
        ],
        generationConfig: { temperature: 1.0 }
    };
    
    // Add Google Search grounding if requested
    if (useGrounding) {
        body.tools = [
            {
                google_search: {}
            }
        ];
        console.log("Using Google grounding search for Gemini API call");
    }
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log("Gemini API response grounding chunks:", result.candidates?.[0]?.groundingMetadata?.groundingChunks);
    // Extract the model's response text
    // Extract text and groundingChunks
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { text, groundingChunks };
}

// Helper function to clean Gemini response of code blocks and other formatting
function cleanGeminiResponse(text: string): string {
    // Remove markdown code block formatting if present
    if (text.startsWith('```json') || text.startsWith('```')) {
        return text
            .replace(/^```json\n/, '')
            .replace(/^```\n/, '')
            .replace(/\n```$/, '')
            .trim();
    }
    
    // Try to extract JSON if there's text before the JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/); 
    if (jsonMatch) {
        return jsonMatch[0].trim();
    }
    
    return text.trim();
}

// Function to fetch market trends and news using Google Grounding Search
async function fetchMarketTrendsWithGrounding(clientName: string, competitors: Competitor[] = []): Promise<any> {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY environment variable");
    }
    
    // If no competitors provided, query the database directly for any competitors related to this client
    let competitorInfo = 'ไม่มีข้อมูลคู่แข่งที่ชัดเจน';
    
    if (!competitors || competitors.length === 0) {
        try {
            console.log(`No competitors provided to fetchMarketTrendsWithGrounding, querying database for ${clientName}`);
            
            // Find all analysis runs for this client
            const { data: analysisRuns } = await supabaseAdmin
                .from('AnalysisRun')
                .select('id')
                .eq('clientName', clientName);
                
            if (analysisRuns && analysisRuns.length > 0) {
                const runIds = analysisRuns.map(run => run.id);
                
                // Find all competitors across these runs
                const { data: dbCompetitors } = await supabaseAdmin
                    .from('Competitor')
                    .select('*')
                    .in('analysisRunId', runIds);
                    
                if (dbCompetitors && dbCompetitors.length > 0) {
                    competitors = dbCompetitors;
                    console.log(`Found ${dbCompetitors.length} competitors in database for ${clientName}`);
                }
            }
        } catch (error) {
            console.error("Error fetching competitors from database:", error);
            // Continue with empty competitors list
        }
    }
    
    // Extract competitor names for the prompt
    const competitorNames = competitors
        .filter(comp => comp.name) // Filter out null or undefined names
        .map(comp => comp.name)
        .join(', ');
    
    if (competitorNames) {
        competitorInfo = `คู่แข่งที่สำคัญได้แก่: ${competitorNames}`;
    }

    // Thai prompt for market trends and news search with competitor information
    const prompt = `ช่วยหาข้อมูล, ข่าว หรือเทรนกระแสที่เกี่ยวข้องกับประเภทของธุรกิจ ${clientName} ในไทย
    พยายามหาข้อมูลที่ล่าสุด ณ วันที่ ${Date.now()} ถ้าเป็นไปได้ โดย Search หาข้อมูลดังนี้โดยโฟกัสหาข้อมูลของ ${clientName} ให้ครบถ้วนก่อนหาของคู่แข่ง 
    ขออย่างน้อย 20-30 Useful bullet data
    * ข้อมูลฟีเจอร์หรือสินค้าทุกอย่างที่เกี่ยวข้องกับ ${clientName} และ ${competitorInfo} ล่าสุด
    * Social proof, ทำไมต้องใช้งาน ${clientName} ทำไมต้องซื้อ ${clientName} ทำไมเพราะอะไร มีเหตุผลอะไรรองรับ
    * ต้องการข้อมูลที่มีความเป็น Fact, News มีตัวเลขและสถิติรองรับทั้งหมดที่แสดงอยู่บนหน้าเว็บไซต์ของ ${clientName}
    * วิเคราะห์ ${clientName} และจุดแข็งที่แตกต่างจากคู่แข่งโดยเน้นไปที่ ฟีเจอร์ของสินค้าหรือบริการที่แตกต่างกับ ${competitorInfo}
    อยากได้ข้อมูลในหลายแง่มุมมากที่สุด เพื่อให้สามารถผลิตข้อมูลที่มีคุณภาพและครบถ้วน ทุกข้อมูลควรมีตัวเลขรองรับถ้าเป็นไปได้
    สำคัญมาก ไม่ต้องมีข้อความแนะนำหรือคำอธิบายใดๆ ไม่ต้องมีหัวข้อหรือ Bold text ที่ไม่ใช่ JSON
    ไม่ต้องเริ่มต้นด้วยคำว่า "แน่นอนครับ" หรือข้อความอื่นๆ ให้ส่งเฉพาะโครงสร้าง JSON นี้เท่านั้น ตอบเป็นภาษาไทย:
{
  "research": ["ข้อมูลงานวิจัย 1", "ข้อมูลงานวิจัย 2", "ข้อมูลงานวิจัย 3", ...] // ทำไมต้อง ${clientName} ?, วิเคราะห์ ${clientName} และจุดแข็งที่แตกต่างจากคู่แข่ง ผลการค้นหาที่เกี่ยวข้องกับธุรกิจและคู่แข่ง รวมทั้งข่าวล่าสุด, เทรนด์ตลาด, และโอกาสทางธุรกิจ
}`;

// * คู่แข่งที่สำคัญได้แก่: ${competitorNames} โดยอยากให้มีข้อมูลเกี่ยวกับคู่แข่งที่ชัดเจน คอนเทนต์หรือโปรโมชั่นล่าสุด ณ วันที่ ${Date.now()} หรือข้อมูลข่าวหรือฟีเจอร์หรือจุดแข็งหรือข้อได้เปรียบของคู่แข่งแต่ละเจ้า
    try {
        console.log(`[API /competitor-analysis] Calling Gemini with Google Grounding Search for ${clientName} market trends...`);
        const geminiResult = await callGeminiAPI(prompt, GEMINI_API_KEY, "gemini-2.5-flash-preview-04-17", true);
        // Use new return shape: { text, groundingChunks }
        let cleanedText = geminiResult.text ? cleanGeminiResponse(geminiResult.text) : '';
        let groundingMetadata = { groundingChunks: geminiResult.groundingChunks };
        let rawGemini = geminiResult;
        // No need to extract from candidates/content anymore
        
        // Log the cleaned text for debugging
        console.log("[API /competitor-analysis] Cleaned Grounding Search response:", cleanedText.substring(0, 100) + '...');
        // Try to parse JSON
        try {
            const parsed = JSON.parse(cleanedText);
            return {
                ...parsed,
                groundingMetadata,
                geminiRaw: rawGemini,
            };
        } catch (e) {
            console.error("[API /competitor-analysis] Failed to parse Grounding Search response as JSON:", e);
            
            // Fallback: Try to extract useful information even if not valid JSON
            // Look for patterns that might contain research points in Thai text
            const lines = cleanedText.split('\n').filter((line: string) => 
                line.trim().length > 20 && // Only substantial lines
                !line.includes('```') && // Not markdown formatting
                !line.startsWith('แน่นอนครับ') // Not starting with "Certainly"
            );
            
            const extractedResearch = lines.length > 0 
                ? lines.map((line: string) => line.trim()) 
                : ["ข้อมูลไม่พร้อมใช้งาน (ปัญหาการแปลง JSON)"];
            return {
                error: "Grounding Search response was not valid JSON",
                research: extractedResearch.slice(0, 5),
                groundingMetadata,
                geminiRaw: rawGemini,
            };
        }
    } catch (error) {
        console.error("[API /competitor-analysis] Error calling Gemini with Grounding Search:", error);
        throw new Error("Failed to fetch market trends via Google Grounding Search.");
    }
}

// Function to generate detailed analysis of competitors and their marketing strategies
async function analyzeCompetitorsWithGemini(competitors: Competitor[], clientName: string): Promise<any> {
    if (!competitors || competitors.length === 0) {
        return { error: "No competitor data available." };
    }

    if (!GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    // Format competitor data for Gemini
    const competitorData = competitors.map(comp => {
        return {
            name: comp.name || 'Unnamed Competitor',
            services: comp.services || [],
            pricing: comp.pricing || 'N/A',
            strengths: comp.strengths || [],
            weaknesses: comp.weaknesses || [],
            targetAudience: comp.targetAudience || 'N/A',
            adThemes: comp.adThemes || [],
            usp: comp.usp || 'N/A',
            brandTone: comp.brandTone || 'N/A',
            positivePerception: comp.positivePerception || 'N/A',
            negativePerception: comp.negativePerception || 'N/A'
        };
    });

    // Ask Gemini for JSON output with clear structure for UI rendering (in Thai)
    const prompt = `
คุณเป็นผู้เชี่ยวชาญด้านกลยุทธ์การตลาด โปรดวิเคราะห์ข้อมูลคู่แข่งต่อไปนี้:

${JSON.stringify(competitorData, null, 2)}

I need your analysis in JSON format for direct parsing by my application.
Return ONLY the following JSON structure with no markdown formatting, no code blocks, no backticks, and no explanatory text:

{
  "strengths": [...], // จุดแข็งและตำแหน่งที่โดดเด่นของคู่แข่งแต่ละราย (เป็นภาษาไทย)
  "weaknesses": [...], // จุดอ่อนของคู่แข่งแต่ละราย (เป็นภาษาไทย)
  "shared_patterns": [...], // รูปแบบหรือธีมทางการตลาดที่มีร่วมกัน (เป็นภาษาไทย)
  "market_gaps": [...], // ช่องว่างในตลาดหรือความต้องการที่ยังไม่ได้รับการตอบสนอง (เป็นภาษาไทย)
  "differentiation_strategies": [...], // กลยุทธ์การสร้างความแตกต่างที่นำไปปฏิบัติได้สำหรับเนื้อหาและการวางตำแหน่งแบรนด์ (เป็นภาษาไทย)
  "summary": "..." // บทสรุปหนึ่งย่อหน้า (เป็นภาษาไทย)
}

สำคัญ: คำตอบของคุณต้องเป็น JSON ที่ถูกต้องและสามารถแยกวิเคราะห์ได้ ห้ามรวมข้อความใดๆ นอกเหนือจากวัตถุ JSON อย่าห่อ JSON ในบล็อกโค้ดหรือเครื่องหมาย backtick ได้โปรดทำให้ถูกต้องตาม syntax ที่กำหนดไว้ ผมขอร้อง

โปรดตอบเป็นภาษาไทยทั้งหมดในทุกส่วนของการวิเคราะห์`;

    try {
        console.log("[API /competitor-analysis] Calling Gemini for competitor analysis via HTTP API...");
        const geminiResult = await callGeminiAPI(prompt, GEMINI_API_KEY, "gemini-2.5-flash-preview-04-17");
        // Use new return shape: { text, groundingChunks }
        let cleanedText = geminiResult.text ? cleanGeminiResponse(geminiResult.text) : '';
        let groundingMetadata = { groundingChunks: geminiResult.groundingChunks };
        let rawGemini = geminiResult;
        // No need to extract from candidates/content anymore
        
        // Try to parse JSON
        try {
            // Get market trends with grounding search in parallel
            const marketTrends = await fetchMarketTrendsWithGrounding(clientName, competitors);
            // Combine the results
            const combinedResults = {
                ...JSON.parse(cleanedText),
                research: marketTrends.research || [],
                // Forward grounding metadata from marketTrends if present
                groundingMetadata: marketTrends.groundingMetadata || marketTrends.geminiRaw?.candidates?.[0]?.groundingMetadata,
                geminiRaw: marketTrends.geminiRaw,
            };
            return combinedResults;
        } catch (e) {
            // fallback: return as string if not valid JSON
            return { error: "Gemini response was not valid JSON", raw: geminiResult, groundingMetadata, geminiRaw: rawGemini };
        }
    } catch (error) {
        console.error("[API /competitor-analysis] Error calling Gemini:", error);
        throw new Error("Failed to generate competitor analysis via Gemini.");
    }
}

export async function GET(request: NextRequest) {
    console.log("[API /competitor-analysis] GET request received");
    const searchParams = request.nextUrl.searchParams;
    const clientName = searchParams.get('clientName');
    const productFocus = searchParams.get('productFocus');

    console.log(`[API /competitor-analysis] Parameters: clientName=${clientName}, productFocus=${productFocus}`);

    try {
        // --- Validation ---
        if (!clientName || !productFocus) {
            return new NextResponse(JSON.stringify({ error: 'Both clientName and productFocus query parameters are required' }), { status: 400 });
        }

        console.log(`Handling GET /api/competitor-analysis for clientName: ${clientName}, productFocus: ${productFocus}`);

        // 1. Lookup AnalysisRun by clientName and productFocus (handle trailing comma case)
        // First try exact match
        let { data: analysisRunRows, error: analysisRunError } = await supabaseAdmin
            .from('AnalysisRun')
            .select('id')
            .eq('clientName', clientName)
            .eq('productFocus', productFocus)
            .limit(1);
            
        // If no results, try with added trailing comma
        if (!analysisRunRows || analysisRunRows.length === 0) {
            console.log(`No results found for exact match, trying with trailing comma for: ${productFocus}`);
            ({ data: analysisRunRows, error: analysisRunError } = await supabaseAdmin
                .from('AnalysisRun')
                .select('id')
                .eq('clientName', clientName)
                .eq('productFocus', `${productFocus},`)
                .limit(1));
        }

        if (analysisRunError) {
            console.error(`Supabase error fetching AnalysisRun for clientName ${clientName}, productFocus ${productFocus}:`, analysisRunError);
            throw new Error(analysisRunError.message || 'Failed to fetch analysis run');
        }

        if (!analysisRunRows || analysisRunRows.length === 0) {
            console.log('No AnalysisRun found for this clientName/productFocus, using Gemini direct analysis');
            // Fallback to Gemini direct analysis
            if (!GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY environment variable");
            }
            const directAnalysisPrompt = `
As an expert marketing analyst, I need a detailed analysis of competitors for ${clientName} in the ${productFocus} space.

I need your analysis in JSON format for direct parsing by my application.
Return ONLY the following JSON structure with no markdown formatting, no code blocks, no backticks, and no explanatory text Please give me the right json syntax am begging you:

{
  "strengths": ["..."], // Key strengths of competitors in this market
  "weaknesses": ["..."], // Key weaknesses of competitors in this market
  "shared_patterns": ["..."], // Shared marketing patterns or themes
  "market_gaps": ["..."], // Market gaps or unmet needs
  "differentiation_strategies": ["..."], // Actionable differentiation strategies for content and brand positioning
  "summary": "..." // One-paragraph summary of the competitive landscape
}

IMPORTANT: Your response must be valid, parseable JSON. Do not include any text outside the JSON object. Do not wrap the JSON in code blocks or backticks. Please give me the right json syntax am begging you`;
            try {
                console.log("[API /competitor-analysis] Calling Gemini for direct competitor analysis via HTTP API...");
                const analysisText = await callGeminiAPI(directAnalysisPrompt, GEMINI_API_KEY, "gemini-2.5-flash-preview-04-17");
                
                // Clean the response before parsing
                const cleanedText = cleanGeminiResponse(typeof analysisText === 'object' && analysisText !== null && 'text' in analysisText ? analysisText.text : analysisText);
                
                try {
                    const analysis = JSON.parse(cleanedText);
                    console.log("[API /competitor-analysis] Successfully parsed Gemini response as JSON");
                    
                    // Get market trends with grounding search
                    const marketTrends = await fetchMarketTrendsWithGrounding(clientName);
                    
                    // Combine the results
                    const combinedResults = {
                        ...analysis,
                        research: marketTrends.research || []
                    };
                    
                    return NextResponse.json(combinedResults);
                } catch (e) {
                    console.error("[API /competitor-analysis] Failed to parse Gemini response as JSON:", e);
                    return NextResponse.json({ 
                        error: "Gemini response was not valid JSON", 
                        strengths: ["No data available"],
                        weaknesses: ["No data available"],
                        shared_patterns: ["No data available"],
                        market_gaps: ["No data available"],
                        differentiation_strategies: ["No data available"],
                        summary: "No data available",
                        research: ["No data available"]
                    });
                }
            } catch (geminiError) {
                console.error("[API /competitor-analysis] Error calling Gemini for direct analysis:", geminiError);
                throw new Error("Failed to generate direct competitor analysis via Gemini.");
            }
        }

        const analysisRunId = analysisRunRows[0].id;

        // 2. Query Competitor table by analysisRunId
        console.log(`Fetching competitors from database for analysisRunId: ${analysisRunId}`);
        let { data: competitorsData, error: competitorError } = await supabaseAdmin
            .from('Competitor')
            .select('*')
            .eq('analysisRunId', analysisRunId);

        if (competitorError) {
            console.error(`Supabase error fetching Competitors for analysisRunId ${analysisRunId}:`, competitorError);
            throw new Error(competitorError.message || 'Failed to fetch competitor data');
        }
        
        // If no competitors found for this specific analysisRunId, try to find competitors for the same client across all runs
        if (!competitorsData || competitorsData.length === 0) {
            console.log(`No competitors found for analysisRunId ${analysisRunId}, looking for competitors across all runs for ${clientName}`);
            
            // Get all analysis runs for this client
            const { data: allClientRuns, error: clientRunsError } = await supabaseAdmin
                .from('AnalysisRun')
                .select('id')
                .eq('clientName', clientName);
                
            if (!clientRunsError && allClientRuns && allClientRuns.length > 0) {
                const allRunIds = allClientRuns.map(run => run.id);
                console.log(`Found ${allRunIds.length} analysis runs for ${clientName}, checking for competitors`);
                
                // Try to find competitors across all runs for this client
                ({ data: competitorsData, error: competitorError } = await supabaseAdmin
                    .from('Competitor')
                    .select('*')
                    .in('analysisRunId', allRunIds));
                    
                if (competitorError) {
                    console.error(`Supabase error fetching Competitors across all runs for ${clientName}:`, competitorError);
                    // Continue with empty competitors - will fallback to direct analysis
                }
            }
        }

        console.log(`Retrieved ${competitorsData?.length || 0} competitors from database for ${clientName}`);

        // If competitors found, analyze them
        if (competitorsData && competitorsData.length > 0) {
            console.log("Competitors found in database, generating analysis");
            const analysis = await analyzeCompetitorsWithGemini(competitorsData, clientName);
            // Always extract groundingMetadata if possible
            let groundingMetadata = analysis.groundingMetadata || analysis.geminiRaw?.candidates?.[0]?.groundingMetadata;
            return NextResponse.json({ 
                analysis,
                competitors: competitorsData,
                isJson: !analysis.error, // If no error, analysis is JSON
                groundingMetadata,
                geminiRaw: analysis.geminiRaw,
            });
        } else {
            // If no competitors found, do direct Gemini analysis
            console.log("No competitors found in database, using Gemini direct analysis");
            if (!GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY environment variable");
            }
            const directAnalysisPrompt = `
As an expert marketing analyst, I need a detailed analysis of competitors for ${clientName} in the ${productFocus} space.

I need your analysis in JSON format for direct parsing by my application.
Return ONLY the following JSON structure with no markdown formatting, no code blocks, no backticks, and no explanatory text no '\n':

{
  "strengths": ["..."], // Key strengths of competitors in this market
  "weaknesses": ["..."], // Key weaknesses of competitors in this market
  "shared_patterns": ["..."], // Shared marketing patterns or themes
  "market_gaps": ["..."], // Market gaps or unmet needs
  "differentiation_strategies": ["..."], // Actionable differentiation strategies for content and brand positioning
  "summary": "..." // One-paragraph summary of the competitive landscape
}

IMPORTANT: Your response must be valid, parseable JSON. Do not include any text outside the JSON object. Do not wrap the JSON in code blocks or backticks. Please give me the right json syntax am begging you`;
            try {
                console.log("[API /competitor-analysis] Calling Gemini for direct competitor analysis via HTTP API...");
                const analysisText = await callGeminiAPI(directAnalysisPrompt, GEMINI_API_KEY, "gemini-2.0-flash");
                
                // Clean the response before parsing
                const cleanedText = cleanGeminiResponse(typeof analysisText === 'object' && analysisText !== null && 'text' in analysisText ? analysisText.text : analysisText);
                
                try {
                    const analysis = JSON.parse(cleanedText);
                    console.log("[API /competitor-analysis] Successfully parsed Gemini response as JSON");
                    
                    // Get market trends with grounding search
                    const marketTrends = await fetchMarketTrendsWithGrounding(clientName);
                    
                    // Combine the results
                    const combinedResults = {
                        ...analysis,
                        research: marketTrends.research || []
                    };
                    
                    return NextResponse.json(combinedResults);
                } catch (e) {
                    console.error("[API /competitor-analysis] Failed to parse Gemini response as JSON:", e);
                    return NextResponse.json({ 
                        error: "Gemini response was not valid JSON", 
                        strengths: ["No data available"],
                        weaknesses: ["No data available"],
                        shared_patterns: ["No data available"],
                        market_gaps: ["No data available"],
                        differentiation_strategies: ["No data available"],
                        summary: "No data available",
                        research: ["No data available"]
                    });
                }
            } catch (geminiError) {
                console.error("[API /competitor-analysis] Error calling Gemini for direct analysis:", geminiError);
                throw new Error("Failed to generate direct competitor analysis via Gemini.");
            }
        }
    } catch (error) {
        console.error("Error in GET /api/competitor-analysis:", error);
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return new NextResponse(
            JSON.stringify({ analysis: "No competitor data available due to server error.", competitors: [], error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Add a POST handler to support requests from generate-recommendations route
export async function POST(request: NextRequest) {
    console.log("[API /competitor-analysis] POST request received");
    
    try {
        // Parse request body
        const body = await request.json();
        const { clientName, productFocus, runId } = body;
        
        console.log(`[API /competitor-analysis] POST Parameters: clientName=${clientName}, productFocus=${productFocus}, runId=${runId}`);

        // --- Validation ---
        if (!clientName || !productFocus) {
            return new NextResponse(JSON.stringify({ error: 'Both clientName and productFocus are required in the request body' }), { status: 400 });
        }

        console.log(`Handling POST /api/competitor-analysis for clientName: ${clientName}, productFocus: ${productFocus}`);

        // If runId is provided, use it directly
        if (runId) {
            console.log(`Using provided runId: ${runId}`);
            
            // Query Competitor table by analysisRunId
            console.log(`Fetching competitors from database for analysisRunId: ${runId}`);
            const { data: competitorsData, error: competitorError } = await supabaseAdmin
                .from('Competitor')
                .select('*')
                .eq('analysisRunId', runId);

            if (competitorError) {
                console.error(`Supabase error fetching Competitors for analysisRunId ${runId}:`, competitorError);
                throw new Error(competitorError.message || 'Failed to fetch competitor data');
            }

            console.log(`Retrieved ${competitorsData?.length || 0} competitors from database for analysisRunId: ${runId}`);

            // If competitors found, analyze them
            if (competitorsData && competitorsData.length > 0) {
                console.log("Competitors found in database, generating analysis");
                const analysis = await analyzeCompetitorsWithGemini(competitorsData, clientName);
                return NextResponse.json({ 
                    ...analysis,
                    isJson: !analysis.error // If no error, analysis is JSON
                });
            }
        }
        
        // If no runId provided or no competitors found with the runId, look up by clientName and productFocus
        // First try exact match
        let { data: analysisRunRows, error: analysisRunError } = await supabaseAdmin
            .from('AnalysisRun')
            .select('id')
            .eq('clientName', clientName)
            .eq('productFocus', productFocus)
            .limit(1);
            
        // If no results, try with added trailing comma
        if (!analysisRunRows || analysisRunRows.length === 0) {
            console.log(`No results found for exact match, trying with trailing comma for: ${productFocus}`);
            ({ data: analysisRunRows, error: analysisRunError } = await supabaseAdmin
                .from('AnalysisRun')
                .select('id')
                .eq('clientName', clientName)
                .eq('productFocus', `${productFocus},`)
                .limit(1));
        }

        if (analysisRunError) {
            console.error(`Supabase error fetching AnalysisRun for clientName ${clientName}, productFocus ${productFocus}:`, analysisRunError);
            throw new Error(analysisRunError.message || 'Failed to fetch analysis run');
        }

        if (!analysisRunRows || analysisRunRows.length === 0) {
            console.log('No AnalysisRun found for this clientName/productFocus, using Gemini direct analysis');
            // Fallback to Gemini direct analysis
            if (!GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY environment variable");
            }
            const directAnalysisPrompt = `
As an expert marketing analyst, I need a detailed analysis of competitors for ${clientName} in the ${productFocus} space.

I need your analysis in JSON format for direct parsing by my application.
Return ONLY the following JSON structure with no markdown formatting, no code blocks, no backticks, and no explanatory text:

{
  "strengths": ["..."], // Key strengths of competitors in this market
  "weaknesses": ["..."], // Key weaknesses of competitors in this market
  "shared_patterns": ["..."], // Shared marketing patterns or themes
  "market_gaps": ["..."], // Market gaps or unmet needs
  "differentiation_strategies": ["..."], // Actionable differentiation strategies for content and brand positioning
  "summary": "..." // One-paragraph summary of the competitive landscape
}

IMPORTANT: Your response must be valid, parseable JSON. Do not include any text outside the JSON object. Do not wrap the JSON in code blocks or backticks. Please give me the right json syntax am begging you`;
            try {
                console.log("[API /competitor-analysis] Calling Gemini for direct competitor analysis via HTTP API...");
                const analysisText = await callGeminiAPI(directAnalysisPrompt, GEMINI_API_KEY, "gemini-2.0-flash");
                
                // Clean the response before parsing
                const cleanedText = cleanGeminiResponse(typeof analysisText === 'object' && analysisText !== null && 'text' in analysisText ? analysisText.text : analysisText);
                
                try {
                    const analysis = JSON.parse(cleanedText);
                    console.log("[API /competitor-analysis] Successfully parsed Gemini response as JSON");
                    
                    // Get market trends with grounding search
                    const marketTrends = await fetchMarketTrendsWithGrounding(clientName);
                    
                    // Combine the results
                    const combinedResults = {
                        ...analysis,
                        research: marketTrends.research || []
                    };
                    
                    return NextResponse.json(combinedResults);
                } catch (e) {
                    console.error("[API /competitor-analysis] Failed to parse Gemini response as JSON:", e);
                    return NextResponse.json({ 
                        error: "Gemini response was not valid JSON", 
                        strengths: ["No data available"],
                        weaknesses: ["No data available"],
                        shared_patterns: ["No data available"],
                        market_gaps: ["No data available"],
                        differentiation_strategies: ["No data available"],
                        summary: "No data available",
                        research: ["No data available"]
                    });
                }
            } catch (geminiError) {
                console.error("[API /competitor-analysis] Error calling Gemini for direct analysis:", geminiError);
                throw new Error("Failed to generate direct competitor analysis via Gemini.");
            }
        }

        const analysisRunId = analysisRunRows[0].id;

        // Query Competitor table by analysisRunId
        console.log(`Fetching competitors from database for analysisRunId: ${analysisRunId}`);
        let { data: competitorsData, error: competitorError } = await supabaseAdmin
            .from('Competitor')
            .select('*')
            .eq('analysisRunId', analysisRunId);

        if (competitorError) {
            console.error(`Supabase error fetching Competitors for analysisRunId ${analysisRunId}:`, competitorError);
            throw new Error(competitorError.message || 'Failed to fetch competitor data');
        }
        
        // If no competitors found for this specific analysisRunId, try to find competitors for the same client across all runs
        if (!competitorsData || competitorsData.length === 0) {
            console.log(`No competitors found for analysisRunId ${analysisRunId}, looking for competitors across all runs for ${clientName}`);
            
            // Get all analysis runs for this client
            const { data: allClientRuns, error: clientRunsError } = await supabaseAdmin
                .from('AnalysisRun')
                .select('id')
                .eq('clientName', clientName);
                
            if (!clientRunsError && allClientRuns && allClientRuns.length > 0) {
                const allRunIds = allClientRuns.map(run => run.id);
                console.log(`Found ${allRunIds.length} analysis runs for ${clientName}, checking for competitors`);
                
                // Try to find competitors across all runs for this client
                ({ data: competitorsData, error: competitorError } = await supabaseAdmin
                    .from('Competitor')
                    .select('*')
                    .in('analysisRunId', allRunIds));
                    
                if (competitorError) {
                    console.error(`Supabase error fetching Competitors across all runs for ${clientName}:`, competitorError);
                    // Continue with empty competitors - will fallback to direct analysis
                }
            }
        }

        console.log(`Retrieved ${competitorsData?.length || 0} competitors from database for ${clientName}`);

        // If competitors found, analyze them
        if (competitorsData && competitorsData.length > 0) {
            console.log("Competitors found in database, generating analysis");
            const analysis = await analyzeCompetitorsWithGemini(competitorsData, clientName);
            return NextResponse.json(analysis);
        } else {
            // If no competitors found, do direct Gemini analysis
            console.log("No competitors found in database, using Gemini direct analysis");
            if (!GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY environment variable");
            }
            const directAnalysisPrompt = `
As an expert marketing analyst, I need a detailed analysis of competitors for ${clientName} in the ${productFocus} space.

I need your analysis in JSON format for direct parsing by my application.
Return ONLY the following JSON structure with no markdown formatting, no code blocks, no backticks, and no explanatory text:

{
  "strengths": ["..."], // Key strengths of competitors in this market
  "weaknesses": ["..."], // Key weaknesses of competitors in this market
  "shared_patterns": ["..."], // Shared marketing patterns or themes
  "market_gaps": ["..."], // Market gaps or unmet needs
  "differentiation_strategies": ["..."], // Actionable differentiation strategies for content and brand positioning
  "summary": "..." // One-paragraph summary of the competitive landscape
}

IMPORTANT: Your response must be valid, parseable JSON. Do not include any text outside the JSON object. Do not wrap the JSON in code blocks or backticks. and Thai language. Please give me the right json syntax am begging you`;
            try {
                console.log("[API /competitor-analysis] Calling Gemini for direct competitor analysis via HTTP API...");
                const analysisText = await callGeminiAPI(directAnalysisPrompt, GEMINI_API_KEY, "gemini-2.5-flash-preview-04-17");
                
                // Clean the response before parsing
                const cleanedText = cleanGeminiResponse(typeof analysisText === 'object' && analysisText !== null && 'text' in analysisText ? analysisText.text : analysisText);
                
                try {
                    const analysis = JSON.parse(cleanedText);
                    console.log("[API /competitor-analysis] Successfully parsed Gemini response as JSON");
                    
                    // Get market trends with grounding search
                    const marketTrends = await fetchMarketTrendsWithGrounding(clientName);
                    
                    // Combine the results
                    const combinedResults = {
                        ...analysis,
                        research: marketTrends.research || []
                    };
                    
                    return NextResponse.json(combinedResults);
                } catch (e) {
                    console.error("[API /competitor-analysis] Failed to parse Gemini response as JSON:", e);
                    return NextResponse.json({ 
                        error: "Gemini response was not valid JSON", 
                        strengths: ["No data available"],
                        weaknesses: ["No data available"],
                        shared_patterns: ["No data available"],
                        market_gaps: ["No data available"],
                        differentiation_strategies: ["No data available"],
                        summary: "No data available",
                        research: ["No data available"]
                    });
                }
            } catch (geminiError) {
                console.error("[API /competitor-analysis] Error calling Gemini for direct analysis:", geminiError);
                throw new Error("Failed to generate direct competitor analysis via Gemini.");
            }
        }
    } catch (error) {
        console.error("Error in POST /api/competitor-analysis:", error);
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return new NextResponse(
            JSON.stringify({ 
                error: errorMessage,
                strengths: ["No data available due to server error"],
                weaknesses: ["No data available due to server error"],
                shared_patterns: ["No data available due to server error"],
                market_gaps: ["No data available due to server error"],
                differentiation_strategies: ["No data available due to server error"],
                summary: "No competitor data available due to server error.",
                research: ["No data available due to server error"]
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
