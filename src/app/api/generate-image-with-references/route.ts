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

        // Get selected image size
        const imageSize = formData.get('size') as string || 'auto'; // Default to auto if not provided

        // Validate inputs
        /* // Commented out: Make product images optional (potential API issue with /edits)
        if (productImages.length === 0) {
            return NextResponse.json(
                { error: 'At least one product image is required' },
                { status: 400 }
            );
        }
        */

        if (!concept) {
            return NextResponse.json(
                { error: 'Concept data is required' },
                { status: 400 }
            );
        }

        // Prepare data for OpenAI API
        const openaiFormData = new FormData();
        openaiFormData.append('model', 'gpt-image-1'); // TODO: Change to gpt-image-1 for production

        // Add all product images
        productImages.forEach((file) => {
            openaiFormData.append('image[]', file);
        });

        // Add ad reference images if any
        adReferenceImages.forEach((file) => {
            openaiFormData.append('image[]', file);
        });

        // Construct a comprehensive prompt that includes all key elements
        let prompt = `You are an award-winning Creative Director and Senior Designer for Facebook Ads, with a deep understanding of marketing psychology, visual storytelling, and the latest design trends.
        Create a professional, photorealistic advertisement image that effectively communicates the following:

Main Ideas for Ads
Main Ideas for Ads: ${concept.title}
Main Focus: ${concept.focusTarget}
Key Message: ${concept.keyMessage}

Our Ads will be avariable on Thailand market

Ad Structure:
- Headline: ${concept.adCopy?.headline || ''}
- Sub-Headlines: 
  ${concept.adCopy?.subHeadline1 ? `• ${concept.adCopy.subHeadline1}` : ''}
  ${concept.adCopy?.subHeadline2 ? `• ${concept.adCopy.subHeadline2}` : ''}
  ${concept.adCopy?.subHeadline3 ? `• ${concept.adCopy.subHeadline3}` : ''}
- Call to Action: ${concept.adCopy?.subHeadlineCta || ''}

Key Features to Highlight:
${concept.adCopy?.bubblePoints?.map((point: string) => `• ${point}`).join('\n') || ''}

Description: ${concept.description || ''}
Competitive Advantage: ${concept.competitiveGap || ''}
`;

        // Add reference image guidance if reference images are provided
        if (adReferenceImages.length > 0) {
            prompt += `\n\nReference Image Guidelines:
- Use the provided reference images as inspiration for the visual style and mood
- Adapt the composition , background and layout while maintaining the product's focus
- Incorporate similar lighting techniques and color schemes where appropriate`;
        }

        // Add custom prompt if provided
        if (customPrompt) {
            prompt += `\n\nAdditional Requirements:\n${customPrompt}`;
        }

        // Log the final prompt
        console.log('=== Generated Prompt for OpenAI ===');
        console.log(prompt);
        console.log('=== End of Prompt ===');

        openaiFormData.append('prompt', prompt);

        // Add size parameter if provided (including 'auto')
        if (imageSize) {
             openaiFormData.append('size', imageSize);
        }

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

        // Log the raw response from OpenAI for debugging
        console.log("Raw OpenAI Response:", JSON.stringify(result, null, 2));
        
        // Revert to extracting b64_json as /edits doesn't support response_format: url
        const imageUrl = result.data[0].b64_json; 

        if (!imageUrl) {
            console.error('OpenAI response did not contain b64_json image data.', result);
            return NextResponse.json(
                { error: 'Failed to get image data from OpenAI.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ 
            imageUrl: `data:image/png;base64,${imageUrl}`, // Return data URI
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