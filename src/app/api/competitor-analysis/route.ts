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
async function callGeminiAPI(prompt: string, apiKey: string, model: string = "gemini-2.0-flash") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
        contents: [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ]
    };
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
    // Extract the model's response text
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
    return text.trim();
}

// Function to generate detailed analysis of competitors and their marketing strategies
async function analyzeCompetitorsWithGemini(competitors: Competitor[]): Promise<any> {
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

    // Ask Gemini for JSON output with clear structure for UI rendering
    const prompt = `
As an expert marketing strategist, analyze the following competitor data:

${JSON.stringify(competitorData, null, 2)}

I need your analysis in JSON format for direct parsing by my application.
Return ONLY the following JSON structure with no markdown formatting, no code blocks, no backticks, and no explanatory text:

{
  "strengths": ["..."], // Key strengths and positioning of each competitor
  "weaknesses": ["..."], // Key weaknesses of each competitor
  "shared_patterns": ["..."], // Shared marketing patterns or themes
  "market_gaps": ["..."], // Market gaps or unmet needs
  "differentiation_strategies": ["..."], // Actionable differentiation strategies for content and brand positioning
  "summary": "..." // One-paragraph summary
}

IMPORTANT: Your response must be valid, parseable JSON. Do not include any text outside the JSON object. Do not wrap the JSON in code blocks or backticks.`;

    try {
        console.log("[API /competitor-analysis] Calling Gemini for competitor analysis via HTTP API...");
        const analysisText = await callGeminiAPI(prompt, GEMINI_API_KEY, "gemini-2.0-flash");
        console.log("[API /competitor-analysis] Gemini response received.");
        
        // Clean the response before parsing
        const cleanedText = cleanGeminiResponse(analysisText);
        
        // Try to parse JSON
        try {
            return JSON.parse(cleanedText);
        } catch (e) {
            // fallback: return as string if not valid JSON
            return { error: "Gemini response was not valid JSON", raw: analysisText };
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

        // 1. Lookup AnalysisRun by clientName and productFocus
        const { data: analysisRunRows, error: analysisRunError } = await supabaseAdmin
            .from('AnalysisRun')
            .select('id')
            .eq('clientName', clientName)
            .eq('productFocus', productFocus)
            .limit(1);

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

IMPORTANT: Your response must be valid, parseable JSON. Do not include any text outside the JSON object. Do not wrap the JSON in code blocks or backticks.`;
            try {
                console.log("[API /competitor-analysis] Calling Gemini for direct competitor analysis via HTTP API...");
                const analysisText = await callGeminiAPI(directAnalysisPrompt, GEMINI_API_KEY, "gemini-2.0-flash");
                
                // Clean the response before parsing
                const cleanedText = cleanGeminiResponse(analysisText);
                
                let analysis;
                let isJson = false;
                try {
                    analysis = JSON.parse(cleanedText);
                    isJson = true;
                    console.log("[API /competitor-analysis] Successfully parsed Gemini response as JSON:", JSON.stringify(analysis, null, 2));
                } catch (e) {
                    console.error("[API /competitor-analysis] Failed to parse Gemini response as JSON:", e);
                    analysis = { error: "Gemini response was not valid JSON", raw: analysisText };
                }
                console.log("API competitor-analysis response:", { analysis, competitors: [] });
                return NextResponse.json({ 
                    analysis,
                    competitors: [],
                    isJson
                });
            } catch (geminiError) {
                console.error("[API /competitor-analysis] Error calling Gemini for direct analysis:", geminiError);
                throw new Error("Failed to generate direct competitor analysis via Gemini.");
            }
        }

        const analysisRunId = analysisRunRows[0].id;

        // 2. Query Competitor table by analysisRunId
        console.log(`Fetching competitors from database for analysisRunId: ${analysisRunId}`);
        const { data: competitorsData, error: competitorError } = await supabaseAdmin
            .from('Competitor')
            .select('*')
            .eq('analysisRunId', analysisRunId);

        if (competitorError) {
            console.error(`Supabase error fetching Competitors for analysisRunId ${analysisRunId}:`, competitorError);
            throw new Error(competitorError.message || 'Failed to fetch competitor data');
        }

        console.log(`Retrieved ${competitorsData?.length || 0} competitors from database for analysisRunId: ${analysisRunId}`);

        // If competitors found, analyze them
        if (competitorsData && competitorsData.length > 0) {
            console.log("Competitors found in database, generating analysis");
            const analysis = await analyzeCompetitorsWithGemini(competitorsData);
            console.log("API competitor-analysis response:", { analysis, competitors: competitorsData });
            return NextResponse.json({ 
                analysis,
                competitors: competitorsData,
                isJson: !analysis.error // If no error, analysis is JSON
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
Return ONLY the following JSON structure with no markdown formatting, no code blocks, no backticks, and no explanatory text:

{
  "strengths": ["..."], // Key strengths of competitors in this market
  "weaknesses": ["..."], // Key weaknesses of competitors in this market
  "shared_patterns": ["..."], // Shared marketing patterns or themes
  "market_gaps": ["..."], // Market gaps or unmet needs
  "differentiation_strategies": ["..."], // Actionable differentiation strategies for content and brand positioning
  "summary": "..." // One-paragraph summary of the competitive landscape
}

IMPORTANT: Your response must be valid, parseable JSON. Do not include any text outside the JSON object. Do not wrap the JSON in code blocks or backticks.`;
            try {
                console.log("[API /competitor-analysis] Calling Gemini for direct competitor analysis via HTTP API...");
                const analysisText = await callGeminiAPI(directAnalysisPrompt, GEMINI_API_KEY, "gemini-2.0-flash");
                
                // Clean the response before parsing
                const cleanedText = cleanGeminiResponse(analysisText);
                
                let analysis;
                let isJson = false;
                try {
                    analysis = JSON.parse(cleanedText);
                    isJson = true;
                    console.log("[API /competitor-analysis] Successfully parsed Gemini response as JSON:", JSON.stringify(analysis, null, 2));
                } catch (e) {
                    console.error("[API /competitor-analysis] Failed to parse Gemini response as JSON:", e);
                    analysis = { error: "Gemini response was not valid JSON", raw: analysisText };
                }
                console.log("API competitor-analysis response:", { analysis, competitors: [] });
                return NextResponse.json({ 
                    analysis,
                    competitors: [],
                    isJson
                });
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
                const analysis = await analyzeCompetitorsWithGemini(competitorsData);
                return NextResponse.json({ 
                    ...analysis,
                    isJson: !analysis.error // If no error, analysis is JSON
                });
            }
        }
        
        // If no runId provided or no competitors found with the runId, look up by clientName and productFocus
        const { data: analysisRunRows, error: analysisRunError } = await supabaseAdmin
            .from('AnalysisRun')
            .select('id')
            .eq('clientName', clientName)
            .eq('productFocus', productFocus)
            .limit(1);

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

IMPORTANT: Your response must be valid, parseable JSON. Do not include any text outside the JSON object. Do not wrap the JSON in code blocks or backticks.`;
            try {
                console.log("[API /competitor-analysis] Calling Gemini for direct competitor analysis via HTTP API...");
                const analysisText = await callGeminiAPI(directAnalysisPrompt, GEMINI_API_KEY, "gemini-2.0-flash");
                
                // Clean the response before parsing
                const cleanedText = cleanGeminiResponse(analysisText);
                
                try {
                    const analysis = JSON.parse(cleanedText);
                    console.log("[API /competitor-analysis] Successfully parsed Gemini response as JSON");
                    return NextResponse.json(analysis);
                } catch (e) {
                    console.error("[API /competitor-analysis] Failed to parse Gemini response as JSON:", e);
                    return NextResponse.json({ 
                        error: "Gemini response was not valid JSON", 
                        strengths: ["No data available"],
                        weaknesses: ["No data available"],
                        shared_patterns: ["No data available"],
                        market_gaps: ["No data available"],
                        differentiation_strategies: ["No data available"],
                        summary: "No data available"
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
        const { data: competitorsData, error: competitorError } = await supabaseAdmin
            .from('Competitor')
            .select('*')
            .eq('analysisRunId', analysisRunId);

        if (competitorError) {
            console.error(`Supabase error fetching Competitors for analysisRunId ${analysisRunId}:`, competitorError);
            throw new Error(competitorError.message || 'Failed to fetch competitor data');
        }

        console.log(`Retrieved ${competitorsData?.length || 0} competitors from database for analysisRunId: ${analysisRunId}`);

        // If competitors found, analyze them
        if (competitorsData && competitorsData.length > 0) {
            console.log("Competitors found in database, generating analysis");
            const analysis = await analyzeCompetitorsWithGemini(competitorsData);
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

IMPORTANT: Your response must be valid, parseable JSON. Do not include any text outside the JSON object. Do not wrap the JSON in code blocks or backticks.`;
            try {
                console.log("[API /competitor-analysis] Calling Gemini for direct competitor analysis via HTTP API...");
                const analysisText = await callGeminiAPI(directAnalysisPrompt, GEMINI_API_KEY, "gemini-2.0-flash");
                
                // Clean the response before parsing
                const cleanedText = cleanGeminiResponse(analysisText);
                
                try {
                    const analysis = JSON.parse(cleanedText);
                    console.log("[API /competitor-analysis] Successfully parsed Gemini response as JSON");
                    return NextResponse.json(analysis);
                } catch (e) {
                    console.error("[API /competitor-analysis] Failed to parse Gemini response as JSON:", e);
                    return NextResponse.json({ 
                        error: "Gemini response was not valid JSON", 
                        strengths: ["No data available"],
                        weaknesses: ["No data available"],
                        shared_patterns: ["No data available"],
                        market_gaps: ["No data available"],
                        differentiation_strategies: ["No data available"],
                        summary: "No data available"
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
                summary: "No competitor data available due to server error."
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
