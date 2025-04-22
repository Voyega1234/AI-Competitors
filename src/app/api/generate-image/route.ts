import { NextRequest, NextResponse } from 'next/server';

// Define expected request body structure
interface GenerateImageRequest {
    prompt: string;
    aspect_ratio?: string; // e.g., ASPECT_16_9, ASPECT_1_1, ASPECT_9_16
}

export async function POST(request: NextRequest) {
    const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;
    const IDEOGRAM_API_URL = "https://api.ideogram.ai/generate";

    if (!IDEOGRAM_API_KEY) {
        console.error("IDEOGRAM_API_KEY is not set in environment variables.");
        return new NextResponse(JSON.stringify({ error: 'Server configuration error: Missing Ideogram API key.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const body: GenerateImageRequest = await request.json();
        const { prompt, aspect_ratio = 'ASPECT_16_9' } = body; // Default aspect ratio

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return new NextResponse(JSON.stringify({ error: 'Prompt is required and must be a non-empty string.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        console.log(`Received request to generate image with prompt: "${prompt.substring(0, 100)}...", aspect ratio: ${aspect_ratio}`);

        const ideogramPayload = {
            image_request: {
                prompt: prompt,
                aspect_ratio: aspect_ratio,
                model: "V_2", // Using model V_2 as per Ideogram docs
                magic_prompt_option: "AUTO" // Using AUTO magic prompt
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
            // Try to parse error if possible, otherwise use text
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