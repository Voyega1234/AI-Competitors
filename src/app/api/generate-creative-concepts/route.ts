'use server';

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
// Ensure the path alias '@' is correctly configured in your tsconfig.json
// If not, use a relative path like '../../types/creative'
import { SelectedRecommendationForCreative, CreativeConcept } from '@/types/creative';

// Define the expected input structure for this API route
interface CreativeConceptsRequestInput {
    selectedRecommendations: SelectedRecommendationForCreative[]; // Now expects an array
    clientName: string;
    productFocus: string | null;
    // Add any other context needed for the prompt
}

// --- Helper Function to perform grounding search via REST API ---
async function performGroundingSearch(
    input: CreativeConceptsRequestInput,
    apiKey: string
): Promise<string | null> {
    const { clientName, productFocus, selectedRecommendations } = input;

    // Construct prompt (same as before)
    const topTitles = selectedRecommendations.slice(0, 2).map(r => r.title).join(', ');
    const searchQuery = `Latest Facebook ad trends, competitor activities, and news relevant to ${clientName} focusing on ${productFocus || 'their main offerings'} and themes like '${topTitles}'. Prioritize recent (last 3-6 months) actionable insights for creative strategy.`;
    const groundingPrompt = `Perform a web search to find the most recent and relevant information for the following query: ${searchQuery}. Summarize the key findings concisely (3-5 bullet points) focusing on insights useful for developing new Facebook ad creative concepts.`;

    console.log("[creative-concepts-grounding-rest] Performing search with query hint:", searchQuery);

    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: groundingPrompt }
                ]
            }
        ],
        tools: [
            { google_search: {} }
        ]
        // Add safety settings if needed in REST API structure (refer to REST API docs)
        // safetySettings: [...]
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text(); // Read error body as text
            console.error(`[creative-concepts-grounding-rest] API request failed with status ${response.status}:`, errorBody);
            // Attempt to parse as JSON for structured error, fallback to text
            try {
                const errorJson = JSON.parse(errorBody);
                throw new Error(errorJson.error?.message || `API Error ${response.status}`);
            } catch {
                throw new Error(`API Error ${response.status}: ${errorBody}`);
            }
        }

        const responseData = await response.json();

        // Extract text from the response structure (adjust path if needed based on actual API response)
        const summaryText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (summaryText) {
            console.log("[creative-concepts-grounding-rest] Received grounded summary via REST.");
            return summaryText.trim();
        } else {
            // Log the response structure if text extraction fails
            console.warn("[creative-concepts-grounding-rest] Grounding call did not return expected text structure. Response:", JSON.stringify(responseData, null, 2));
            // Check for block reasons if available in REST response structure
            const blockReason = responseData?.promptFeedback?.blockReason;
            if (blockReason) {
                console.warn(`[creative-concepts-grounding-rest] Grounding call blocked. Reason: ${blockReason}`);
            }
            return null;
        }

    } catch (error: any) {
        console.error("[creative-concepts-grounding-rest] Error during grounding search fetch:", error);
        return null;
    }
}

// --- Helper Function to generate 3-5 creative concepts based on a collection AND grounded context ---
async function generateCreativeConceptsForCollection(
    input: CreativeConceptsRequestInput,
    groundedContext: string | null, // Added parameter
    apiKey: string
): Promise<CreativeConcept[] | null> {

    const { selectedRecommendations, clientName, productFocus } = input;

    // --- Format the input recommendations and journeys for the prompt ---
    let recommendationsContext = selectedRecommendations.map((rec, index) => {
        let journeyContext = "No specific customer journey analysis provided.";
        if (rec.customerJourney) {
            try {
                // Keep it concise for the prompt
                journeyContext = JSON.stringify(rec.customerJourney);
            } catch (e) {
                journeyContext = "Error processing journey data.";
            }
        }
        // Ensure we reference the correct field from the input structure
        const conceptIdea = rec.concept || 'N/A';
        return `
--- Recommendation ${index + 1} ---
Title: ${rec.title}
Concept/Idea: ${conceptIdea}
Description: ${rec.description}
Content Pillar: ${rec.content_pillar || 'N/A'}
Product Focus: ${rec.product_focus || 'N/A'}
Journey Context: ${journeyContext}
`;
    }).join("\n");

    // --- Construct the new prompt ---
    const prompt = `
Analyze the following collection of ${selectedRecommendations.length} selected marketing recommendations and their customer journey analyses for ${clientName} (focusing on ${productFocus || 'their main offerings'}).

**Recent Context & Trends (from Web Search):**
${groundedContext ? groundedContext : "No specific recent context provided."}

Synthesize ALL inputs (recommendations, journeys, AND recent context) to generate 3-5 distinct, high-level Content Pillars / Focus Targets suitable for guiding Facebook Ad creative development.

**Input Recommendations & Journeys Collection:**
${recommendationsContext}

**Instructions:**
Generate a JSON array containing exactly 3 distinct JSON objects. Each object must represent a unique Content Pillar / Focus Target concept and strictly follow this structure:

\`\`\`json
{
  "focusTarget": "<Specify the primary target audience or angle for this concept (e.g., 'กลุ่มลูกค้าใหม่', 'ผู้ที่ลังเล', 'เปรียบเทียบกับคู่แข่ง', 'เน้นจุดเด่น X', 'แก้ปัญหา Y')>",
  "keyMessage": "<Develop a compelling key message or tagline for this overall angle, summarizing the core value proposition>",
  "topicIdeas": {
    "productBenefits": [
      "<Synthesized Benefit point 1 based on inputs>",
      "<Synthesized Benefit point 2 based on inputs>"
    ],
    "painPointsEmotional": [
      "<Synthesized Pain point/emotional hook 1 based on inputs>",
      "<Synthesized Pain point/emotional hook 2 based on inputs>"
    ],
    "promotionPricing": [
      "<Synthesized Promotion/pricing angle 1 based on inputs>",
      "<Synthesized Promotion/pricing angle 2 based on inputs>"
    ]
  }
}
\`\`\`

*   Ensure all string values within the JSON objects are IN THAI.
*   The 3 concepts should represent diverse strategic angles derived from ALL provided inputs, including the recent context.
*   Provide 1-3 concise bullet points (strings) for each array inside \`topicIdeas\`, synthesizing relevant points.
*   Output ONLY the valid JSON array (starting with \`[\` and ending with \`]\`), with no surrounding text, explanations, or markdown formatting.
`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
            generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json",
             },
        });

        console.log(`[creative-concepts] Generating 3-5 concepts (with grounding) based on ${selectedRecommendations.length} inputs for client: ${clientName}`);
        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        if (!responseText || response.promptFeedback?.blockReason) {
            console.warn(`[creative-concepts] Generation blocked or empty. Reason: ${response.promptFeedback?.blockReason}`);
            return null;
        }

        // Attempt to parse the JSON response (expecting an array)
        try {
            const conceptsArray: CreativeConcept[] = JSON.parse(responseText);

            // Validation
            if (!Array.isArray(conceptsArray)) {
                 console.warn(`[creative-concepts] Parsed response is not an array.`);
                 return null;
            }
            // Check if count is within 3-5 range (relaxed check)
            if (conceptsArray.length < 1) {
                 console.warn(`[creative-concepts] Received empty or invalid array.`);
                 return null;
            }
            if (conceptsArray.length < 3 || conceptsArray.length > 5) {
                 console.warn(`[creative-concepts] Expected 3 concepts, but received ${conceptsArray.length}. Proceeding anyway.`);
                 // Allow returning if not exactly 3-5, but log
            }

            // Check if each element has the required keys
            if (conceptsArray.every(c => c.focusTarget && c.keyMessage && c.topicIdeas)) {
                 console.log(`[creative-concepts] Successfully parsed ${conceptsArray.length} concepts.`);
                 return conceptsArray;
            } else {
                 console.warn(`[creative-concepts] Parsed concepts missing required structure.`);
                 return null;
            }

        } catch (parseError) {
            console.error(`[creative-concepts] Failed to parse JSON array response:`, parseError);
            console.log("[creative-concepts] Raw response was:", responseText);
            return null;
        }

    } catch (error: any) {
        console.error(`[creative-concepts] Error generating concepts:`, error);
        return null;
    }
}

// --- POST Handler ---
export async function POST(request: Request) {
    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error('[creative-concepts] Gemini API key not found.');
        return NextResponse.json({ error: 'Server configuration error: Missing API key' }, { status: 500 });
    }

    try {
        const body: CreativeConceptsRequestInput = await request.json(); // Use updated Input Type
        const { selectedRecommendations, clientName, productFocus } = body;

        // Basic validation of input
        if (!selectedRecommendations || selectedRecommendations.length === 0 || !clientName) { // Check array
            return NextResponse.json({ error: 'Missing required fields: selectedRecommendations array, clientName' }, { status: 400 });
        }

        console.log(`[creative-concepts] Received request for ${selectedRecommendations.length} recommendations.`);

        // --- Perform Grounding Search Step ---
        console.log("[creative-concepts] Attempting grounding search via REST...");
        const groundedContext = await performGroundingSearch(body, GEMINI_API_KEY);
        if (groundedContext) {
             console.log("[creative-concepts] Grounding search successful.");
        } else {
             console.warn("[creative-concepts] Grounding search failed or returned no usable context. Proceeding without it.");
        }

        // --- Call the updated helper function with grounded context ---
        const concepts = await generateCreativeConceptsForCollection(body, groundedContext, GEMINI_API_KEY);

        if (concepts && concepts.length > 0) {
            return NextResponse.json({ concepts: concepts });
        } else {
            console.error(`[creative-concepts] Failed to generate valid concepts.`);
            return NextResponse.json({ error: 'Failed to generate valid creative concepts.' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[creative-concepts] Error in POST handler:', error);
        const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}