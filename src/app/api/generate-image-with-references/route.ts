import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        
        // Extract product images
        const productImages: File[] = [];
        for (let i = 0; ; i++) {
            const file = formData.get(`productImage${i}`);
            if (!file) break;
            if (file instanceof File) {
                productImages.push(file);
            }
        }

        // Extract ad reference images
        const adReferenceImages: File[] = [];
        for (let i = 0; ; i++) {
            const file = formData.get(`adReferenceImage${i}`);
            if (!file) break;
            if (file instanceof File) {
                adReferenceImages.push(file);
            }
        }

        // Get concept data
        const conceptStr = formData.get('concept');
        const concept = conceptStr ? JSON.parse(conceptStr as string) : null;

        // Get custom prompt if any
        const customPrompt = formData.get('customPrompt') as string;

        // Validate inputs
        if (productImages.length === 0) {
            return NextResponse.json(
                { error: 'At least one product image is required' },
                { status: 400 }
            );
        }

        if (!concept) {
            return NextResponse.json(
                { error: 'Concept data is required' },
                { status: 400 }
            );
        }

        // Prepare data for OpenAI API
        const openaiFormData = new FormData();
        openaiFormData.append('model', 'gpt-image-1');

        // Add all product images
        productImages.forEach((file) => {
            openaiFormData.append('image[]', file);
        });

        // Add ad reference images if any
        adReferenceImages.forEach((file) => {
            openaiFormData.append('image[]', file);
        });

        // Construct the prompt
        let prompt = `Generate a photorealistic advertisement image based on the concept: ${concept.focusTarget}. `;
        prompt += `Key message to convey: "${concept.keyMessage}". `;
        
        if (customPrompt) {
            prompt += customPrompt;
        }

        openaiFormData.append('prompt', prompt);

        // Call OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: openaiFormData
        });

        if (!openaiResponse.ok) {
            const error = await openaiResponse.text();
            console.error('OpenAI image generation failed:', error);
            return NextResponse.json(
                { error: 'Failed to generate image' },
                { status: openaiResponse.status }
            );
        }

        const result = await openaiResponse.json();
        
        // OpenAI returns base64 encoded image
        const imageUrl = result.data[0].b64_json;

        return NextResponse.json({
            imageUrl: `data:image/png;base64,${imageUrl}`,
            metadata: {
                generatedAt: new Date().toISOString(),
                concept: concept,
                usedImages: productImages.length + adReferenceImages.length,
            }
        });

    } catch (error) {
        console.error('Error in generate-image-with-references:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 