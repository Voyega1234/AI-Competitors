'use server';

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Define expected input structure
interface RecommendationInput {
    title: string;
    concept: string;
    description: string;
    tempId?: string; // Include the temporary ID if available
    // Include other relevant fields from Recommendation if needed by the prompt
}

interface JourneyRequestInput {
    selectedRecommendations: RecommendationInput[];
    clientName: string;
    productFocus: string | null;
    // Optionally add more client context if available/needed (e.g., brand guidelines)
}

// Define the output structure
type JourneyResults = Record<string, CustomerJourneyStructured | null>; // Map tempId to structured object or null

// Expected structured output for EACH journey
interface CustomerJourneyStructured {
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

// Helper to generate a single structured journey
async function generateSingleStructuredJourney(recommendation: RecommendationInput, clientName: string, productFocus: string | null, apiKey: string): Promise<CustomerJourneyStructured | null> {
    const prompt = `
Analyze the customer journey for the following creative idea for ${clientName}, focusing on their product/service: ${productFocus || 'main offerings'}.

**Creative Idea:**
*   Title: ${recommendation.title}
*   Concept: ${recommendation.concept}
*   Description: ${recommendation.description}

**Instructions:**
Generate a JSON object analyzing the customer journey based on the creative idea. 
The JSON object MUST strictly follow this structure:
\`\`\`json
{
  "brandingAndProductConnection": {
    "alignment": "<How does this idea align with the client's brand identity?>",
    "showcase": "<How does it specifically showcase the product/service?>"
  },
  "productBenefitsHighlighted": {
    "keyBenefits": "<What key customer benefits (functional or emotional) are emphasized?>",
    "communication": "<How are these benefits communicated through the journey?>"
  },
  "painPointAndEmotionalResonance": {
    "painPoint": "<What customer pain point is primarily addressed?>",
    "emotionalResonance": "<What emotions are aimed to be evoked at different stages (Awareness, Consideration, Decision)?>"
  },
  "promotionAndPricingIntegration": {
    "integration": "<How could specific promotions or pricing be integrated?>",
    "ctaPlacement": "<Where would calls-to-action related to offers/pricing be most effective?>"
  }
}
\`\`\`
Provide concise analysis strings IN THAI for each field value.
Ensure the output is ONLY the valid JSON object, with no surrounding text or markdown formatting.
    `;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
            generationConfig: { 
                temperature: 2, // Slightly lower temp for more structured output
                responseMimeType: "application/json", // Request JSON directly
             }
        });

        console.log(`[journey-gen] Generating structured journey for: "${recommendation.title}"`);
        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text(); // Get the raw text which should be JSON

        if (!responseText || response.promptFeedback?.blockReason) {
            console.warn(`[journey-gen] Journey generation blocked or empty for "${recommendation.title}". Reason: ${response.promptFeedback?.blockReason}`);
            return null;
        }

        // Attempt to parse the JSON response
        try {
            const structuredJourney: CustomerJourneyStructured = JSON.parse(responseText);
            // Basic validation (check if top-level keys exist)
            if (structuredJourney.brandingAndProductConnection && structuredJourney.productBenefitsHighlighted) {
                 console.log(`[journey-gen] Successfully parsed structured journey for: "${recommendation.title}"`);
                 return structuredJourney;
            } else {
                 console.warn(`[journey-gen] Parsed JSON is missing expected structure for: "${recommendation.title}"`);
                 return null; // Return null if structure is invalid
            }
        } catch (parseError) {
            console.error(`[journey-gen] Failed to parse JSON response for "${recommendation.title}":`, parseError);
            console.log("[journey-gen] Raw response was:", responseText); // Log raw response on parse failure
            return null; // Return null if JSON parsing fails
        }

    } catch (error: any) {
        console.error(`[journey-gen] Error generating journey for "${recommendation.title}":`, error);
        return null; // Return null on error for this specific journey
    }
}

export async function POST(request: Request) {
    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error('[journey-gen] Gemini API key not found.');
        return NextResponse.json({ error: 'Server configuration error: Missing API key' }, { status: 500 });
    }

    try {
        const body: JourneyRequestInput = await request.json();
        const { selectedRecommendations, clientName, productFocus } = body;

        if (!selectedRecommendations || selectedRecommendations.length === 0 || !clientName) {
            return NextResponse.json({ error: 'Missing required fields: selectedRecommendations, clientName' }, { status: 400 });
        }

        console.log(`[journey-gen] Received request to generate structured journeys for ${selectedRecommendations.length} ideas.`);

        // Generate journeys concurrently
        const journeyPromises = selectedRecommendations.map(rec => 
            generateSingleStructuredJourney(rec, clientName, productFocus, GEMINI_API_KEY)
                .then(structuredJourney => ({ 
                    tempId: rec.tempId || `fallback-${rec.title.replace(/\s+/g, '-')}`,
                    journey: structuredJourney 
                }))
        );

        const settledResults = await Promise.allSettled(journeyPromises);

        const journeyResults: JourneyResults = {};
        settledResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value?.tempId) {
                 journeyResults[result.value.tempId] = result.value.journey;
            } else if (result.status === 'rejected') {
                 console.error("[journey-gen] Error processing journey promise:", result.reason);
            }
            // If fulfilled but journey is null, it's handled correctly by assigning null
        });

        console.log(`[journey-gen] Finished generating structured journeys. Results count: ${Object.keys(journeyResults).length}`);

        return NextResponse.json({ customerJourneys: journeyResults });

    } catch (error: any) {
        console.error('[journey-gen] Error in POST handler:', error);
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
} 