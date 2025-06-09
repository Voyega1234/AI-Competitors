import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Google Generative AI client
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

/**
 * API route to suggest funnel stages for audience names using Gemini AI
 */
export async function POST(request: NextRequest) {
  try {
    // Get the audience names and available funnel stages from the request body
    const { audienceNames, funnelStages } = await request.json();

    if (!audienceNames || !Array.isArray(audienceNames) || audienceNames.length === 0) {
      return NextResponse.json(
        { error: 'Audience names array is required' },
        { status: 400 }
      );
    }

    if (!funnelStages || !Array.isArray(funnelStages) || funnelStages.length === 0) {
      return NextResponse.json(
        { error: 'Funnel stages array is required' },
        { status: 400 }
      );
    }

    // Create a prompt for Gemini
    const prompt = `
      You are an expert in digital marketing and audience segmentation.
      
      Given the following Facebook audience names, suggest the most appropriate funnel stage for each.
      The available funnel stages are: ${funnelStages.join(', ')}.
      
      Audience names:
      ${audienceNames.map(name => `- ${name}`).join('\n')}
      
      For each audience name, determine the most appropriate funnel stage based on:
      - Lookalike audiences are typically for top-of-funnel (awareness/evaluation)
      - Engaged users or video viewers are typically mid-funnel (consideration)
      - App users, purchasers, or high-intent audiences are typically bottom-funnel (conversion)
      
      Return your suggestions in a structured format.
    `;

    // Create the response schema
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          audienceName: { type: Type.STRING },
          suggestedStage: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        propertyOrdering: ["audienceName", "suggestedStage", "confidence", "reasoning"]
      }
    };

    // Call Gemini API
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: prompt as string,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    // Parse the response
    let suggestions;
    try {
      const responseText = response.text || '';
      suggestions = JSON.parse(responseText);
      
      // Validate the response format
      if (!Array.isArray(suggestions)) {
        throw new Error('Invalid response format: expected an array');
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      // Return a formatted error
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json(suggestions);

  } catch (error) {
    console.error('Error suggesting funnel stages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to suggest funnel stages' },
      { status: 500 }
    );
  }
}
