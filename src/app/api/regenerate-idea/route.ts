import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from 'crypto';
import { cleanGeminiResponse } from "@/utils/text-utils";

// Configure Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const requestData = await request.json();
    const { runId, model, ideaIndex, feedback } = requestData;

    if (!runId || !model || ideaIndex === undefined) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Validate feedback
    const userFeedback = feedback || "This idea needs improvement.";
    
    // Initialize Gemini model
    const modelName = "gemini-2.5-pro-preview-05-06";
    const geminiModel = genAI.getGenerativeModel({ model: modelName });
    
    // Create a prompt for regenerating this specific idea
    const regenerationPrompt = `
You are an expert ideation assistant. I previously generated a set of marketing ideas, 
but one of them needs to be regenerated based on user feedback.

The user provided this feedback about the idea:
"${userFeedback}"

Please generate a new, improved version of this idea that addresses the feedback. 
Make it creative, specific, and actionable.

**Output Format Requirements (CRITICAL):**
* YOU MUST RETURN PURE RAW JSON WITHOUT ANY MARKDOWN CODE BLOCKS. DO NOT WRAP IN CODE BLOCKS.
* Output ONLY a valid JSON object. NO markdown formatting, NO triple backticks, NO explanation, NO introduction, and NO trailing text.
* Return ONLY a single JSON object with these exact fields:
{
  "title": "Brief, catchy title for the idea",
  "description": "Detailed description of what the idea entails (2-3 sentences)",
  "category": "Marketing Category",
  "impact": "High, Medium, or Low",
  "resources_needed": "Brief description of what's needed to implement",
  "implementation_difficulty": "Easy, Medium, or Hard",
  "estimated_timeline": "Short, Medium, or Long term"
}

IMPORTANT: NEVER WRAP YOUR RESPONSE IN CODE BLOCKS. RETURN ONLY THE RAW JSON.
`;

    // Set safety settings and model parameters
    const generationConfig = {
      temperature: 1.0,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
      response_mime_type: "application/json",
    };

    // Generate content with Gemini
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: regenerationPrompt }] }],
      generationConfig,
    });

    const response = result.response;
    const responseText = response.text();
    
    // Clean and parse the response
    const cleanedResponse = cleanGeminiResponse(responseText);
    
    try {
      const parsedIdea = JSON.parse(cleanedResponse);
      
      // Add a unique ID to the regenerated idea
      parsedIdea.tempId = randomUUID();
      
      return NextResponse.json({ 
        success: true, 
        regeneratedIdea: parsedIdea 
      });
    } catch (parseError) {
      console.error("Failed to parse regenerated idea JSON:", parseError);
      return NextResponse.json({ 
        error: "Failed to parse regenerated idea JSON", 
        rawResponse: cleanedResponse 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error regenerating idea:", error);
    return NextResponse.json({ error: "Failed to regenerate idea" }, { status: 500 });
  }
}
