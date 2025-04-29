import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Assuming this or a similar setup exists
import OpenAI from 'openai';

// --- Environment Variables ---
// Ensure these are set in your .env.local or environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

// --- Type Definitions ---
interface TopicIdeas {
    productBenefits?: string[];
    painPointsEmotional?: string[];
    promotionPricing?: string[];
}

interface RequestBody {
    focusTarget: string;
    keyMessage: string;
    topicIdeas: TopicIdeas;
    clientName?: string | null;
    productFocus?: string | null;
}

// --- Helper Function: Generate Prompt with Gemini ---
async function generateImagePrompt(concept: RequestBody): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Or your preferred Gemini model

    const contextPrompt = `
        Client Name: ${concept.clientName || 'N/A'}
        Product Focus: ${concept.productFocus || 'N/A'}
        Focus Target: ${concept.focusTarget}
        Key Message: ${concept.keyMessage}
        Topic Ideas:
          - Benefits: ${concept.topicIdeas.productBenefits?.join(', ') || 'None'}
          - Pain Points/Emotional: ${concept.topicIdeas.painPointsEmotional?.join(', ') || 'None'}
          - Promotion/Pricing: ${concept.topicIdeas.promotionPricing?.join(', ') || 'None'}

        Based on the creative concept details above, act as a professional creative director and photographer. Generate a highly detailed and evocative image generation prompt suitable for an AI image generator like DALL-E or Midjourney. The prompt should capture the essence of the focus target and key message, potentially incorporating relevant topic ideas. Describe the scene, composition, lighting, mood, style, and any specific elements clearly. The prompt should be in English.
    `;

    try {
        console.log("[API /generate-concept-image] Calling Gemini to generate image prompt...");
        const result = await model.generateContent(contextPrompt);
        const response = result.response;
        const text = response.text();
        console.log("[API /generate-concept-image] Gemini prompt generation successful.");
        return text.trim();
    } catch (error) {
        console.error("[API /generate-concept-image] Error calling Gemini:", error);
        throw new Error("Failed to generate image prompt via Gemini.");
    }
}

// --- Helper Function: Generate Image with OpenAI ---
async function generateImageFromPrompt(prompt: string): Promise<string> {
    if (!OPENAI_API_KEY) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    try {
        console.log(`[API /generate-concept-image] Calling OpenAI with prompt: "${prompt}"`);
        const response = await openai.images.generate({
            // If this fails, consider changing to 'dall-e-3'.
            model: "dall-e-3", // Ensure model is dall-e-3
            prompt: prompt,
            n: 1, // Generate one image
            // size: "1024x1024", // Default size for dall-e-3 is 1024x1024
            response_format: "url", // Ensure response_format is url
            // quality: "hd", // Optional: for DALL-E 3, potentially higher quality/cost
            // style: "vivid", // Optional: for DALL-E 3 ('vivid' or 'natural')
        });

        // Add check for response.data existence and length
        // EXPECT URL HERE
        const imageUrl = response.data?.[0]?.url;

        if (!imageUrl) {
            console.error("[API /generate-concept-image] OpenAI response missing url or data:", response);
            throw new Error("OpenAI did not return valid image URL."); // Error message reflects missing URL
        }

        // // Construct data URL for the frontend - Not needed for URL
        // const imageUrl = `data:image/png;base64,${b64Json}`;

        console.log("[API /generate-concept-image] OpenAI image generation successful (using dall-e-3, url).");
        return imageUrl; // Return the direct URL

    } catch (error: any) {
        console.error("[API /generate-concept-image] Error calling OpenAI:", error);
        const errorMessage = error.response?.data?.error?.message || error.message || "Failed to generate image via OpenAI.";
        // Check if the error is related to the model name (Update model name in check)
        if (errorMessage.includes("model") && errorMessage.includes("dall-e-3")) {
             throw new Error(`Failed to generate image via OpenAI. The requested model 'dall-e-3' might be incorrect or unavailable. Original error: ${errorMessage}`);
        }
        throw new Error(`Failed to generate image via OpenAI. Error: ${errorMessage}`);
    }
}


// --- API Route Handler ---
export async function POST(request: Request) {
    console.log("[API /generate-concept-image] Received request");
    try {
        const body: RequestBody = await request.json();

        // Validate input
        if (!body.focusTarget || !body.keyMessage || !body.topicIdeas) {
            return NextResponse.json({ error: "Missing required fields: focusTarget, keyMessage, topicIdeas" }, { status: 400 });
        }

        // Step 1: Generate Prompt with Gemini
        const generatedPrompt = await generateImagePrompt(body);

        // Step 2: Generate Image with OpenAI using the generated prompt
        const imageUrl = await generateImageFromPrompt(generatedPrompt);

        // Step 3: Return successful response
        return NextResponse.json({
            prompt: generatedPrompt,
            imageUrl: imageUrl
        });

    } catch (error: any) {
        console.error("[API /generate-concept-image] Handler error:", error);
        return NextResponse.json({ error: error.message || "An internal server error occurred" }, { status: 500 });
    }
} 