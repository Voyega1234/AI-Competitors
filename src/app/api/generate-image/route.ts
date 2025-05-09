import { NextRequest, NextResponse } from 'next/server';

// Define expected request body structure
interface GenerateImageInput {
    inputText: string; // Renamed from 'prompt'
    aspect_ratio?: string; // e.g., ASPECT_16_9, ASPECT_1_1, ASPECT_9_16
}

export async function POST(request: NextRequest) {
    const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;
    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY; // Assuming Gemini key is same as recommendations
    const IDEOGRAM_API_URL = "https://api.ideogram.ai/generate";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`; // Using Flash for speed

    if (!IDEOGRAM_API_KEY) {
        console.error("IDEOGRAM_API_KEY is not set in environment variables.");
        return new NextResponse(JSON.stringify({ error: 'Server configuration error: Missing Ideogram API key.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        return new NextResponse(JSON.stringify({ error: 'Server configuration error: Missing Gemini API key.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const body: GenerateImageInput = await request.json();
        const { inputText, aspect_ratio = 'ASPECT_16_9' } = body; // Default aspect ratio

        if (!inputText || typeof inputText !== 'string' || inputText.trim().length === 0) {
            return new NextResponse(JSON.stringify({ error: 'Input text for prompt generation is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // --- Step 1: Generate Ideogram Prompt using Gemini --- 
        console.log(`Generating Ideogram prompt based on input: "${inputText.substring(0, 100)}..."`);

        const geminiPromptForPromptGeneration = `
You are an expert Ideogram prompt generator for impactful Facebook Ads.

**Your Task:** Create a concise Ideogram prompt based on the core concept

**Ideogram Prompt Requirements:**

1.  **Core Concept:** Visualize the main idea from the input text.
2.  **Visual Impact (for Facebook):** Generate a visually striking image. Choose a suitable **Style** (e.g., Photorealistic, 3D Render, Cinematic Illustration) and specify a **Mood/Tone** (e.g., Empowering, Professional, Exciting) derived from the input. Use strong composition and lighting.
3.  **Integrated English Text:** MUST include **2-4 readable English text elements** using Ideogram's typography. Suggest text for:
    *   **Main Headline** (benefit-driven)
    *   **Supporting Detail/Benefit**
    *   **(Optional) CTA**

**Instructions for You:**
*   Analyze the input text for the core message, mood, and key visuals.
*   Translate these into English for the prompt.
*   Generate the Ideogram prompt incorporating the requirements above.
---
Input Text for Analysis:
${inputText}
---

Generated Image Prompt:
        `;

        const geminiPayload = {
            contents: [{ parts: [{ text: geminiPromptForPromptGeneration }] }],
            generationConfig: {
              temperature: 0.4, // Adjust for creativity vs. directness
              // maxOutputTokens: 150, // Optional: Limit prompt length
            }
        };

        const geminiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API error during prompt generation:', errorText);
            throw new Error(`Gemini API request failed: ${geminiResponse.status} - ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        const generatedIdeogramPrompt = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!generatedIdeogramPrompt) {
            console.error("Gemini response missing valid text content for Ideogram prompt:", JSON.stringify(geminiData, null, 2));
            throw new Error('Gemini failed to generate a usable image prompt.');
        }

        console.log(`Generated Ideogram prompt: "${generatedIdeogramPrompt.substring(0, 100)}..."`);

        // --- Step 2: Generate Image using Ideogram with the Gemini-generated prompt --- 
        const ideogramPayload = {
            image_request: {
                prompt: generatedIdeogramPrompt, // Use the prompt from Gemini
                aspect_ratio: aspect_ratio,
                model: "V_2", // Using model V_2 as per Ideogram docs
                magic_prompt_option: "AUTO", // Using AUTO magic prompt
                negative_prompt : "Worst quality, low res,Ineffective, unmemorable, misleading, inaccurate, incomplete, low-quality, poorly designed, confusing, cluttered, unattractive, cliched, outdated, unprofessional,"
            }
        };

        const ideogramResponse = await fetch(IDEOGRAM_API_URL, {
            method: 'POST',
            headers: {
                'Api-Key': IDEOGRAM_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ideogramPayload)
        });

        const responseBodyText = await ideogramResponse.text(); // Read body once

        if (!ideogramResponse.ok) {
            console.error(`Ideogram API error (${ideogramResponse.status}): ${responseBodyText}`);
            let errorDetail = responseBodyText;
            try {
                const errorJson = JSON.parse(responseBodyText);
                errorDetail = errorJson.detail || errorJson.message || responseBodyText;
            } catch (e) { /* Ignore parsing error, use raw text */ }
             throw new Error(`Ideogram API request failed: ${ideogramResponse.status} - ${errorDetail}`);
        }

        let ideogramData;
        try {
             ideogramData = JSON.parse(responseBodyText);
        } catch (parseError: any) {
             console.error("Failed to parse JSON response from Ideogram:", responseBodyText);
             throw new Error(`Failed to parse successful response from Ideogram: ${parseError.message}`);
        }

        const imageUrl = ideogramData?.data?.[0]?.url;

        if (!imageUrl) {
            console.error("Ideogram response missing image URL:", ideogramData);
            throw new Error('Ideogram did not return a valid image URL.');
        }

        console.log("Successfully generated image URL:", imageUrl);
        return NextResponse.json({ imageUrl: imageUrl });

    } catch (error: any) {
        console.error('Error in POST /api/generate-image:', error);
        return new NextResponse(
            JSON.stringify({ error: error.message || 'Failed to generate image' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
} 