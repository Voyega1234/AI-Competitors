import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Environment Variables ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- Type Definitions (matching frontend) ---
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

// --- Helper Function: Generate Concept Idea & Brief with Gemini ---
async function generateConceptAndBrief(concept: RequestBody): Promise<{ conceptIdea: string; creativeBrief: string }> {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Using a model capable of structured JSON output might be beneficial here if the prompt gets complex,
    // but for now, we'll parse the text response.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Or your preferred Gemini model

    // Construct the prompt requesting both outputs clearly separated
    const systemPrompt = `
You are an AI assistant specializing in marketing creative generation.
Given the following 'Content Pillar / Focus Target' details for a client:
Client Name: ${concept.clientName || 'N/A'}
Product Focus: ${concept.productFocus || 'N/A'}
Focus Target: ${concept.focusTarget}
Key Message: ${concept.keyMessage}
Topic Ideas:
  - Benefits: ${concept.topicIdeas.productBenefits?.join(', ') || 'None'}
  - Pain Points/Emotional: ${concept.topicIdeas.painPointsEmotional?.join(', ') || 'None'}
  - Promotion/Pricing: ${concept.topicIdeas.promotionPricing?.join(', ') || 'None'}

Generate two distinct pieces of text based on the provided information:

1.  **Concept Idea:** Create a concise, catchy concept idea or slogan (max 1-2 sentences, ideally in Thai if the input seems Thai-oriented, otherwise English) that captures the essence of the Focus Target and Key Message. Example: "พลังแรง แม่นยำ งานเสร็จไว ด้วยบล็อกไฟฟ้า iMan Tools".
2.  **Creative Brief:** Write a short creative brief (a few sentences, can be in Thai or English based on context) providing visual direction for an ad creative. Focus on showcasing the product, potentially including accessories, mentioning price visibility if relevant, and adhering to general brand guidelines (CI). Assume the visual should look professional and align with the product's nature. Example: "อิงจาก Creative Draft และ Ref.1 เป็นการโชว์สินค้าเด่นๆ จัดเรียงให้ดูสวยงาม รวมทั้งนำอุปกรณ์เสริมต่าง ๆ มาแสดงให้เห็นด้วย ใส่เพิ่มราคาให้เห็นเด่นชัด สีเหลือ หรือสีขาวก็ได้".

Output the results clearly separated, like this:

CONCEPT IDEA:
[Generated Concept Idea Text Here]

CREATIVE BRIEF:
[Generated Creative Brief Text Here]
`;

    try {
        console.log("[API /generate-concept-brief] Calling Gemini...");
        const result = await model.generateContent(systemPrompt);
        const response = result.response;
        const text = response.text();
        console.log("[API /generate-concept-brief] Gemini response received.");

        // Parse the response to extract the two parts
        const conceptIdeaMatch = text.match(/CONCEPT IDEA:\s*([\s\S]*?)\s*CREATIVE BRIEF:/);
        const creativeBriefMatch = text.match(/CREATIVE BRIEF:\s*([\s\S]*)/);

        const conceptIdea = conceptIdeaMatch?.[1]?.trim();
        const creativeBrief = creativeBriefMatch?.[1]?.trim();

        if (!conceptIdea || !creativeBrief) {
            console.error("[API /generate-concept-brief] Failed to parse Gemini response:", text);
            throw new Error("Failed to parse Concept Idea or Creative Brief from Gemini response.");
        }

        console.log("[API /generate-concept-brief] Parsing successful.");
        return { conceptIdea, creativeBrief };

    } catch (error) {
        console.error("[API /generate-concept-brief] Error calling or parsing Gemini:", error);
        throw new Error("Failed to generate concept/brief via Gemini.");
    }
}


// --- API Route Handler ---
export async function POST(request: Request) {
    console.log("[API /generate-concept-brief] Received request");
    try {
        const body: RequestBody = await request.json();

        // Validate input
        if (!body.focusTarget || !body.keyMessage || !body.topicIdeas) {
            return NextResponse.json({ error: "Missing required fields: focusTarget, keyMessage, topicIdeas" }, { status: 400 });
        }

        // Step 1: Generate Concept Idea and Creative Brief with Gemini
        const { conceptIdea, creativeBrief } = await generateConceptAndBrief(body);

        // Step 2: Return successful response
        return NextResponse.json({
            conceptIdea: conceptIdea,
            creativeBrief: creativeBrief
        });

    } catch (error: any) {
        console.error("[API /generate-concept-brief] Handler error:", error);
        return NextResponse.json({ error: error.message || "An internal server error occurred" }, { status: 500 });
    }
} 