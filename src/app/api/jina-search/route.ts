import { NextResponse } from 'next/server';

// Mark the route as dynamic
export const dynamic = 'force-dynamic';

// Final desired JSON structure (NO TABLE)
interface CompetitorAnalysis {
  yourBrandName: string;
  yourProductName: string;
  analysis: {
    advantages: string[];
    gaps: string[]; // Where competitors have an edge
    marketingAngles: string[];
  };
  competitors: {
    name: string;
    websiteUrl?: string | null; // Allow null
    facebookPageUrl?: string | null; // Allow null
    serviceOverview?: string;
    targetMarket?: string;
    keyDifferentiators?: string; // Strengths
    potentialWeaknesses?: string; // Weaknesses/Gaps specific to them
  }[];
}

// Helper function to ensure URL is absolute
function ensureAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  // Trim whitespace
  url = url.trim();
  // Check if it already has a protocol
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Check if it starts with // (protocol-relative)
  if (url.startsWith('//')) {
    return `https:${url}`; // Assume https for protocol-relative
  }
  // Prepend https:// otherwise
  return `https://${url}`;
}

export async function POST(request: Request) {
  try {
    // Get API keys from environment variables
    const JINA_API_KEY = process.env.JINA_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!JINA_API_KEY || !GEMINI_API_KEY) {
      console.error('API keys (Jina or Gemini) are not defined');
      return NextResponse.json({ success: false, error: 'API key configuration error' }, { status: 500 });
    }
    
    // Parse request body
    const body = await request.json();
    const { brandName, productName, productDescription, competitorUrls } = body;
    
    if (!brandName || !productName) {
      return NextResponse.json({ success: false, error: 'Brand name and product name are required' }, { status: 400 });
    }
    
    const validCompetitorUrls = (competitorUrls || [])
      .map((url: string) => url?.trim())
      .filter((url: string | null | undefined) => url && url.startsWith('http'));
      
    const numberOfCompetitorsToFind = 5 - validCompetitorUrls.length;

    // --- Simplified Jina Prompt --- 
    let query = '';
    const productInfo = `Our product is "${productName}" from brand "${brandName}".${productDescription ? ` Description: ${productDescription}` : ''}`;

    if (validCompetitorUrls.length > 0) {
      const competitorList = validCompetitorUrls.join(', ');
      query = `
        ${productInfo}
        
        We know about these competitors: ${competitorList}.
        
        Perform a comprehensive competitive analysis for "${productName}" in Thailand's financial investment/wealth management market. 
        Compare our product (${brandName} - ${productName}) against these known competitors AND ${numberOfCompetitorsToFind > 0 ? `find up to ${numberOfCompetitorsToFind} other significant competitors.` : 'identify any other relevant competitors.'}
        
        Please research and provide detailed information about ALL competitors (provided and newly found), including:
        *   Company Name
        *   Website URL
        *   Facebook Page URL (if available)
        *   Their services, especially those comparable to "${productName}".
        *   Their target market/customer base.
        *   Their key strengths or differentiators.
        *   Their potential weaknesses or market gaps.

        Also, provide insights comparing our product (${brandName} - ${productName}) to the overall market and these competitors. Focus on identifying our potential advantages and areas where competitors might be stronger.
        
        Present the findings as a comprehensive text report.
      `;
    } else {
      query = `
        ${productInfo}
        
        Find the top 5 competitors for our product ("${productName}") in Thailand's financial investment or wealth management market. 
        
        Please research and provide detailed information about each competitor, including:
        *   Company Name
        *   Website URL
        *   Facebook Page URL (if available)
        *   Their services, especially those comparable to "${productName}".
        *   Their target market/customer base.
        *   Their key strengths or differentiators.
        *   Their potential weaknesses or market gaps.

        Also, provide insights comparing our product (${brandName} - ${productName}) to the overall market and these competitors. Focus on identifying our potential advantages and areas where competitors might be stronger.
        
        Present the findings as a comprehensive text report.
      `;
    }
    // --- End Query Generation ---

    console.log('[jina-search] Constructed query:', query);

    const payload = {
      model: "jina-deepsearch-v1",
      messages: [{ role: "user", content: query }],
      stream: false,
      reasoning_effort: "medium", // Keep low to potentially reduce Jina complexity
      max_attempts: 1,
      no_direct_answer: true
    };

    console.log('[jina-search] Sending request to Jina');
    const response = await fetch('https://deepsearch.jina.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${JINA_API_KEY}` },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[jina-search] Error from Jina API: ${response.status}`, errorText);
      let errorMessage = `Error from search API: ${response.status}`;
      try { errorMessage = JSON.parse(errorText).detail || errorMessage; } catch {} 
      return NextResponse.json({ success: false, error: errorMessage }, { status: response.status });
    }

    const data = await response.json();
    console.log('[jina-search] Received response from Jina');
    
    const rawContent = data.choices?.[0]?.message?.content || '';
    if (!rawContent) {
      console.error('[jina-search] No content found in Jina response');
      return NextResponse.json({ success: false, error: 'Search API returned empty content.' }, { status: 500 });
    }
    
    console.log('[jina-search] Raw content length:', rawContent.length);
    
    // ---->>> PARSE WITH GEMINI <<<----
    const parsedData = await parseWithGemini(rawContent, GEMINI_API_KEY, brandName, productName);
    
    return NextResponse.json({ 
      success: true,
      analysisData: parsedData, // Return structured data ONLY
      visitedURLs: data.visitedURLs || []
    });

  } catch (error: any) {
    console.error('[jina-search] Error in POST handler or Gemini parsing:', error);
    const errorMessage = error.message.includes('Gemini') 
                       ? `Error processing results: ${error.message}` 
                       : error.message || 'An unexpected server error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// --- Simplified parseWithGemini --- 
async function parseWithGemini(
  rawContent: string, 
  apiKey: string,
  brandName: string, // Pass these for context in the prompt
  productName: string
): Promise<CompetitorAnalysis> { 
  console.log('[jina-search] Using Gemini to analyze text and generate JSON (simple version)');
  
  const prompt = `
You are an expert marketing analyst. Analyze the following text report about ${brandName}'s product "${productName}" and its competitors in the Thai market. Generate a VALID JSON object summarizing the key findings, structured exactly as specified below.

**Input Text Report:**
\`\`\`text
${rawContent}
\`\`\`

**Analysis & Structuring Instructions:**
1.  **Identify Competitors:** Extract info for each competitor. Use \`null\` for missing optional fields (websiteUrl, facebookPageUrl). Create an object for each and collect in the \`competitors\` array.
    *   Required fields: \`name\`, \`serviceOverview\`, \`targetMarket\`, \`keyDifferentiators\`, \`potentialWeaknesses\`.
    *   Optional fields (use null if missing): \`websiteUrl\`, \`facebookPageUrl\`.
2.  **Synthesize Core Analysis:** Based *only* on the text, determine lists (arrays of strings) for:
    *   \`advantages\`: ${brandName}'s advantages.
    *   \`gaps\`: Where competitors have an edge.
    *   \`marketingAngles\`: Derived from advantages.
    *   Structure these into the \`analysis\` object.

**Output Format & JSON Validity RULES:**
*   **Return ONLY the single, valid JSON object.** No explanations.
*   **CRITICAL: Ensure valid JSON syntax.** Double quotes for keys/strings, no trailing commas, correct brackets/braces.
*   Use empty arrays \`[]\` if no items are found for a list (e.g., advantages).

\`\`\`json
{
  "yourBrandName": "${brandName}",
  "yourProductName": "${productName}",
  "analysis": {
    "advantages": [],
    "gaps": [],
    "marketingAngles": []
  },
  "competitors": [
    {
      "name": "Example Competitor",
      "websiteUrl": null,
      "facebookPageUrl": null,
      "serviceOverview": "...",
      "targetMarket": "...",
      "keyDifferentiators": "...",
      "potentialWeaknesses": "..."
    }
  ]
}
\`\`\`
`;

  try {
    console.log('[jina-search] Sending request to Gemini API (simple prompt)');
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[jina-search] Gemini API error text (simple prompt):', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('[jina-search] Received response from Gemini API (simple prompt)');

    const parsedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!parsedText) {
      throw new Error('Gemini parsing error: No text content returned');
    }
    
    try {
      let parsedJson = JSON.parse(parsedText) as CompetitorAnalysis; // Parse first
      console.log('[jina-search] Successfully parsed JSON from Gemini (simple prompt)');

      // Basic validation
      if (!parsedJson.competitors || !parsedJson.analysis) {
          throw new Error('Gemini parsing error: Missing required fields in JSON');
      }

      // ---->>> Post-process URLs <<<----
      if (parsedJson.competitors && Array.isArray(parsedJson.competitors)) {
          parsedJson.competitors = parsedJson.competitors.map(comp => ({ 
              ...comp,
              websiteUrl: ensureAbsoluteUrl(comp.websiteUrl),
              facebookPageUrl: ensureAbsoluteUrl(comp.facebookPageUrl)
          }));
      }
      // ---->>> End URL Post-processing <<<----

      return parsedJson; // Return the modified JSON

    } catch(jsonError: any) {
      console.error('[jina-search] Failed to parse JSON from Gemini (simple prompt):', parsedText, 'Error:', jsonError);
      throw new Error(`Gemini parsing error: Invalid JSON received - ${jsonError.message}`);
    }

  } catch (error) {
    console.error('[jina-search] Error in parseWithGemini (simple version):', error);
    throw error; 
  }
}

// Removed unused functions 