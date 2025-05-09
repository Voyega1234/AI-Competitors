import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
// Adjust this path if your Competitor type definition is located elsewhere
import type { Competitor } from '@/components/competitor-table';
import type { StrategicInsights } from '@/types/insights';

// Mark the route as dynamic - important for API routes using dynamic data
export const dynamic = 'force-dynamic';

// Type for grounded competitor info map
type GroundedCompetitorInfo = Record<string, string | null>;

// --- Helper Function to Format Competitor Data for Prompt ---
function formatCompetitorDataForPrompt(competitors: Competitor[]): string {
  if (!competitors || competitors.length === 0) {
    return "- No competitor data provided.\n";
  }
  let competitorString = "";
  competitors.forEach((comp, index) => {
    // Use single backslashes for newlines within the template literal
    competitorString += `\nCompetitor ${index + 1}: ${comp.name}\n`;
    competitorString += `- Website: ${comp.website || 'N/A'}\n`;
    competitorString += `- Services: ${comp.services?.join(', ') || 'N/A'}\n`;
    competitorString += `- Pricing: ${comp.pricing || 'N/A'}\n`;
    competitorString += `- Strengths: ${comp.strengths?.join('; ') || 'N/A'}\n`;
    competitorString += `- Weaknesses: ${comp.weaknesses?.join('; ') || 'N/A'}\n`;
    competitorString += `- Target Audience: ${comp.targetAudience || 'N/A'}\n`;
    // Add other relevant fields like specialty, brandTone, usp if desired
  });
  return competitorString;
}

// --- Helper: Format Grounded Competitor Info for Prompt --- 
function formatGroundedCompetitorInfo(groundedInfo: GroundedCompetitorInfo): string {
  let infoString = "\n\nLatest Competitor Information (from Search):\n";
  for (const [name, text] of Object.entries(groundedInfo)) {
    infoString += `\n--- ${name} ---\n`;
    infoString += text ? `${text}\n` : "- No specific recent info found.\n";
  }
  return infoString;
}

// --- Helper Function to Construct Main Prompt (with Grounding) --- 
function constructPrompt(
  clientName: string,
  productFocus: string | null,
  competitors: Competitor[], // Original table data
  groundedClientInfo: string | null,
  groundedCompetitorInfo: GroundedCompetitorInfo
): string {
  const competitorTableDataString = formatCompetitorDataForPrompt(competitors);
  const groundedCompetitorDataString = formatGroundedCompetitorInfo(groundedCompetitorInfo);

  const clientInfoSection = groundedClientInfo
    ? `\n\nLatest Client Information (${clientName} - from Search):\n${groundedClientInfo}\n`
    : `\n\n(No specific recent info found for ${clientName} via search)\n`;

  const promptIntro = `You are an expert business strategist and marketing analyst consulted by ${clientName}. Their primary market focus is on ${productFocus || 'their main offerings'}.`;

  const contextSection = `${clientInfoSection}${groundedCompetitorDataString}\n\nOriginal Competitor Data from Table:\n${competitorTableDataString}`;

  const promptInstructions = `\n\nBased *primarily* on the latest information obtained from the search results, but also considering the original table data for context, generate actionable strategic insights for ${clientName}. Focus on leveraging recent activities, promotions, campaigns, or policies of competitors. Provide:\n1. A brief 'analysisSummary' (2-4 sentences) highlighting the key competitive landscape based on the *latest* findings.\n2. A list of specific, actionable 'strategicIdeas' (aim for 3-5 ideas) focusing on timely responses or opportunities based on recent competitor actions (promotions, campaigns, policies, etc.). For each idea, provide:
    - 'category': Marketing, Product, Pricing, Customer Service, or Other.
    - 'title': A concise title for the idea.
    - 'description': A detailed explanation of the idea.
    - 'rationale': Why this idea is relevant based *specifically* on the latest grounded information (e.g., counters competitor X's new campaign, matches competitor Y's recent promotion).
    - 'targetCompetitors' (optional): An array of competitor names this idea directly addresses.

Output ONLY the final JSON object adhering strictly to the following structure. Do not include markdown formatting (like \`\`\`json), introductory text, or explanations outside the JSON structure:`;

  const exampleJsonStructure = JSON.stringify(
    {
      analysisSummary: "Brief overview based on latest info...",
      strategicIdeas: [
        {
          category: "Marketing",
          title: "Counter Competitor X Promotion",
          description: "Launch a counter-promotion...",
          rationale: "Competitor X recently launched [details from grounded search]...",
          targetCompetitors: ["Competitor X"]
        }
      ]
    },
    null,
    2
  );

  const fullPrompt = `${promptIntro}${contextSection}${promptInstructions}\n${exampleJsonStructure}`;
  // console.log("--- FULL PROMPT ---", fullPrompt); // Debugging
  return fullPrompt;
}

// --- Helper: Perform single grounding search --- 
async function performGroundingSearch(name: string, promptText: string, apiKey: string): Promise<string | null> {
   const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        tools: [{ "google_search": {} }],
        generationConfig: { temperature: 0.1 } // Very low temp for factual retrieval
      };
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; // Use flash for speed

      try {
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[grounding] Search failed for ${name} (${response.status}): ${errorText.substring(0, 200)}`);
            return null;
        } else {
            const data = await response.json();
            // Extract text - adjust path if needed based on actual API response structure for search
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
            console.log(`[grounding] Search successful for ${name}. Text length: ${text?.length ?? 0}`);
            return text;
        }
      } catch (error: any) {
        console.error(`[grounding] Error during fetch for ${name}:`, error.message);
        return null;
      }
}

// --- API Route Handler ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Type assertion for clarity, consider Zod for robust validation
    const { clientName, productFocus, competitors } = body as { clientName: string; productFocus: string | null; competitors: Competitor[] };

    // Basic validation
    if (!clientName || !competitors) {
      return NextResponse.json({ error: 'Missing required fields: clientName and competitors' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not found in environment variables.');
      return NextResponse.json({ error: 'Server configuration error: Missing API key' }, { status: 500 });
    }

    // --- Perform Grounding Searches Concurrently --- 
    console.log(`[generate-insights] Starting grounding searches for client and ${competitors.length} competitors...`);

    // Client Grounding
    const clientGroundingPrompt = `Give me The Latest information about ${clientName}, focusing on pricing, product/service, promotions, events, policy, or campaigns. Please format the response using Markdown bullet points (e.g., starting lines with * or -).`;
    const clientGroundingPromise = performGroundingSearch(clientName, clientGroundingPrompt, GEMINI_API_KEY);

    // Competitor Grounding
    const competitorGroundingPromises = competitors.map(comp => {
      const prompt = `Provide *only* the latest information about ${comp.name}, formatted strictly as Markdown bullet points under the following categories (if information is available). Do not include introductory/concluding remarks:
                         *   **Pricing Updates:** [Details]
                         *   **Product/Service Changes or Launches:** [Details]
                         *   **Current Promotions:** [Details]
                         *   **Upcoming or Recent Events:** [Details]
                         *   **New Policies or Campaigns:** [Details]`;
      return performGroundingSearch(comp.name, prompt, GEMINI_API_KEY)
             .then(result => ({ name: comp.name, result })); // Keep track of name
    });

    // Wait for all grounding searches
    const [clientResult, ...competitorResultsSettled] = await Promise.all([
        clientGroundingPromise,
        ...competitorGroundingPromises // Spread promises here
    ]);

    const groundedClientInfo: string | null = clientResult;
    const groundedCompetitorInfo: GroundedCompetitorInfo = {};
    competitorResultsSettled.forEach(item => {
        // Type guard to ensure item has name and result properties
         if (typeof item === 'object' && item !== null && 'name' in item && 'result' in item) {
             groundedCompetitorInfo[item.name] = item.result as string | null;
         }
    });

    console.log("[generate-insights] Grounding searches completed.");
    // --- End Grounding --- 

    // --- Analysis Step (Using SDK) ---
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const analysisModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Use a more capable model for complex analysis
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 }, // Allow more creativity
      safetySettings: [ 
         { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
         { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
         { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
         { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    const prompt = constructPrompt(
        clientName,
        productFocus,
        competitors, // Pass original table data
        groundedClientInfo,
        groundedCompetitorInfo
    );
    console.log('[generate-insights] Sending main analysis prompt to Gemini...');

    const analysisResult = await analysisModel.generateContent(prompt);
    const analysisResponse = analysisResult.response;

    if (!analysisResponse || analysisResponse.promptFeedback?.blockReason) {
      console.error('[generate-insights] Gemini analysis response blocked or missing:', analysisResponse?.promptFeedback);
      const reason = analysisResponse?.promptFeedback?.blockReason;
      const safetyRatings = analysisResponse?.promptFeedback?.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ');
      throw new Error(`Failed to generate insights: ${reason || 'Blocked/empty response'}${safetyRatings ? ` (Safety: ${safetyRatings})` : ''}`);
    }

    const responseText = analysisResponse.text();
    console.log('[generate-insights] Received analysis response text from Gemini.');

    if (!responseText) {
      console.error('[generate-insights] Gemini returned empty text response.');
      throw new Error('Failed to generate insights: Empty text response from AI model.');
    }

    let insights: StrategicInsights;
    try {
      insights = JSON.parse(responseText);
      if (!insights || typeof insights.analysisSummary !== 'string' || !Array.isArray(insights.strategicIdeas)) {
          console.error('[generate-insights] Parsed JSON has invalid structure:', insights);
          throw new Error('Invalid JSON structure received from AI model.');
      }
    } catch (parseError) {
      console.error('[generate-insights] Failed to parse Gemini response as JSON:', responseText, parseError);
      throw new Error('Failed to process insights: Invalid format received from AI model.');
    }

    console.log('[generate-insights] Successfully generated and parsed insights.');
    // --- Return enriched response --- 
    return NextResponse.json({
      insights: insights,
      groundedClientInfo: groundedClientInfo,
      groundedCompetitorInfo: groundedCompetitorInfo
    });

  } catch (error: any) {
    console.error('[generate-insights] Error in POST handler:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}