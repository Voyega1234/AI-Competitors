import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Mark the route as dynamic
export const dynamic = 'force-dynamic';

// Define the structure Gemini should extract for each competitor
interface ParsedCompetitor {
  name: string;
  website?: string | null;
  facebookUrl?: string | null;
  services?: string[] | null; // Raw services list
  serviceCategories?: string[] | null; // Added: Categorized services
  features?: string[] | null;
  pricing?: string | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  specialty?: string | null;
  targetAudience?: string | null;
  brandTone?: string | null;
  brandPerception?: {
    positive?: string | null;
    negative?: string | null;
  } | null;
  marketShare?: string | null;
  complaints?: string[] | null;
  adThemes?: string[] | null;
  seo?: {
    domainAuthority?: number | null;
    backlinks?: number | null;
    organicTraffic?: string | null;
  } | null;
  websiteQuality?: {
    uxScore?: number | null;
    loadingSpeed?: string | null;
    mobileResponsiveness?: string | null;
  } | null;
  usp?: string | null;
  socialMetrics?: {
    followers?: number | null;
  } | null;
}

// Expected output structure from the Gemini parsing function
interface GeminiOutput {
  competitors: ParsedCompetitor[];
}

// Final structure for a competitor used in the frontend/API response
interface FinalCompetitor extends Omit<ParsedCompetitor, 'website' | 'facebookUrl' | 'services' | 'serviceCategories' | 'features' | 'pricing' | 'strengths' | 'weaknesses' | 'specialty' | 'targetAudience' | 'brandTone' | 'brandPerception' | 'marketShare' | 'complaints' | 'adThemes' | 'seo' | 'websiteQuality' | 'usp' | 'socialMetrics'> {
  id: string;
  name: string;
  website: string | null;
  facebookUrl: string | null;
  services: string[]; // Keep raw services
  serviceCategories: string[]; // Added: Categorized services
  features: string[];
  pricing: string;
  strengths: string[];
  weaknesses: string[];
  specialty: string;
  targetAudience: string;
  brandTone: string;
  brandPerception: { positive: string; negative: string; };
  marketShare: string;
  complaints: string[];
  adThemes: string[];
  seo: { domainAuthority: number; backlinks: number; organicTraffic: string; };
  websiteQuality: { uxScore: number; loadingSpeed: string; mobileResponsiveness: string; };
  usp: string;
  socialMetrics: { followers: number; };
}

// Structure for the final JSON saved to file, including user input
interface AnalysisResult {
  analysisInput: {
    clientName: string;
    clientWebsiteUrl?: string | null;
    clientFacebookUrl?: string | null;
    market: string;
    productFocus?: string | null;
    additionalInfo?: string | null;
    timestamp: string;
  };
  competitors: FinalCompetitor[];
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
    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!JINA_API_KEY || !GEMINI_API_KEY) {
      console.error('API keys (Jina or Gemini) are not defined');
      return NextResponse.json({ success: false, error: 'API key configuration error' }, { status: 500 });
    }
    
    // Parse request body
    const body = await request.json();
    // Destructure productFocus and keep additionalInfo separate
    const { clientName, facebookUrl: clientFacebookUrl, websiteUrl: clientWebsiteUrl, market, productFocus, additionalInfo } = body;
    
    // Store input for later saving
    const analysisInput = {
      clientName,
      clientWebsiteUrl,
      clientFacebookUrl,
      market,
      productFocus,
      additionalInfo,
      timestamp: new Date().toISOString(),
    };
    
    if (!clientName || !market) {
      console.error('Client name and market are required from form data');
      return NextResponse.json({ success: false, error: 'Client name and target market are required' }, { status: 400 });
    }
    
    // --- Jina Prompt Construction ---
    let query = '';
    // Use productFocus for the specific product/service, additionalInfo for general context
    const clientProductInfo = productFocus ? ` focusing on products/services like: ${productFocus}` : '';
    const clientAdditionalContext = additionalInfo ? ` Additional context: ${additionalInfo}` : '';
    // Construct base client info, escaping quotes for the final query string
    const clientBaseInfo = `Our client is \"${clientName}\"${clientWebsiteUrl ? ` with website ${clientWebsiteUrl}` : ''}${clientFacebookUrl ? ` and Facebook page ${clientFacebookUrl}` : ''}`;
    // Determine market phrasing, handling "Global"
    const marketInfo = market.toLowerCase() === 'global' ? 'globally' : `in the ${market} market`;
    // Determine phrasing for product focus in the prompt, using the dedicated field
    const productFocusPhrase = productFocus || "the client\'s main offerings";
    const competitorFocusPhrase = productFocus || 'general offerings similar to the client';

    // Assemble the Jina query using the constructed parts
    query = `
${clientBaseInfo}${clientProductInfo}. The client operates ${marketInfo}.${clientAdditionalContext}

Find the top 5-7 main competitors for our client ${marketInfo}, specifically focusing on businesses offering similar products/services (${competitorFocusPhrase}).

Please research and provide detailed information about each competitor, including:
*   Company Name
*   Website URL
*   Facebook Page URL (if available)
*   Their specific services and key features (especially those related to ${productFocusPhrase}).
*   Their target market/customer base.
*   Their pricing model/overview.
*   Their key strengths or differentiators.
*   Their potential weaknesses or market gaps.
*   Their brand specialty and unique selling proposition (USP).
*   Their brand tone and public perception (positive and negative).
*   Estimated market share (if found).
*   Common customer complaints.
*   Common advertising themes.
*   SEO details (Domain Authority, Backlinks, Organic Traffic Estimate).
*   Website Quality metrics (UX Score, Loading Speed, Mobile Responsiveness).
*   Social Media details (Follower count).

Present the findings as a comprehensive text report.
    `; // End of template literal
    // --- End Query Generation ---

    console.log('[jina-search] Constructed query:', query);

    const payload = {
      model: "jina-deepsearch-v1",
      messages: [{ role: "user", content: query }],
      stream: false,
      reasoning_effort: "low", // Keep low to potentially reduce Jina complexity
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
    // Pass productFocus to Gemini for context
    const parsedData: GeminiOutput = await parseWithGemini(rawContent, GEMINI_API_KEY, clientName, productFocus);
    
    // --- Process Gemini's Output --- 
    const processedCompetitors: FinalCompetitor[] = (parsedData.competitors || []).map((comp): FinalCompetitor => {
      // Ensure nested objects exist and provide defaults
      const perception = comp.brandPerception || { positive: null, negative: null };
      const seo = comp.seo || { domainAuthority: null, backlinks: null, organicTraffic: null };
      const websiteQuality = comp.websiteQuality || { uxScore: null, loadingSpeed: null, mobileResponsiveness: null };
      const socialMetrics = comp.socialMetrics || { followers: null };

      return {
        id: uuidv4(), // Generate unique ID
        name: comp.name || 'Unknown Competitor',
        website: ensureAbsoluteUrl(comp.website),
        facebookUrl: ensureAbsoluteUrl(comp.facebookUrl),
        services: comp.services || [],
        serviceCategories: comp.serviceCategories || [],
        features: comp.features || [],
        pricing: comp.pricing || 'N/A',
        strengths: comp.strengths || [],
        weaknesses: comp.weaknesses || [],
        specialty: comp.specialty || 'N/A',
        targetAudience: comp.targetAudience || 'N/A',
        brandTone: comp.brandTone || 'N/A',
        brandPerception: { // Ensure structure and non-null strings
          positive: perception.positive || 'N/A',
          negative: perception.negative || 'N/A'
        },
        marketShare: comp.marketShare || 'N/A',
        complaints: comp.complaints || [],
        adThemes: comp.adThemes || [],
        seo: { 
          domainAuthority: seo.domainAuthority ?? 0, 
          backlinks: seo.backlinks ?? 0, 
          organicTraffic: seo.organicTraffic || 'N/A' 
        },
        websiteQuality: { 
          uxScore: websiteQuality.uxScore ?? 0, 
          loadingSpeed: websiteQuality.loadingSpeed || 'N/A', 
          mobileResponsiveness: websiteQuality.mobileResponsiveness || 'N/A' 
        },
        usp: comp.usp || 'N/A',
        socialMetrics: { 
          followers: socialMetrics.followers ?? 0, 
        }
      };
    }).filter(comp => comp.name !== 'Unknown Competitor'); // Filter out fundamentally broken entries

    console.log(`[jina-search] Processed ${processedCompetitors.length} competitors via Gemini.`);

    // --- Create the final result object including input ---
    const finalResult: AnalysisResult = {
      analysisInput,
      competitors: processedCompetitors
    };

    // --- Save the combined result to a JSON file ---
    try {
      const filePath = path.join(process.cwd(), 'public', 'jina-analysis-result.json');
      // Save the finalResult object (input + competitors)
      fs.writeFileSync(filePath, JSON.stringify(finalResult, null, 2));
      console.log(`[jina-search] Successfully saved analysis results (including input) to ${filePath}`);
    } catch (writeError: any) {
      console.error('[jina-search] Failed to save analysis result to file:', writeError);
    }
    // --- End file saving ---

    return NextResponse.json({ 
      success: true,
      competitors: processedCompetitors // Return the final list needed by the frontend
    });

  } catch (error: any) {
    console.error('[jina-search] Error in POST handler or Gemini parsing:', error);
    const errorMessage = error.message?.includes('Gemini') 
                       ? `Error processing results: ${error.message}` 
                       : error.message || 'An unexpected server error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// --- Simplified parseWithGemini --- 
async function parseWithGemini(
  rawContent: string, 
  apiKey: string,
  clientName: string, // Pass client name for context
  productFocus?: string // Pass product focus directly
): Promise<GeminiOutput> { 
  console.log('[jina-search] Using Gemini to analyze text and generate JSON (with categorization)');
  
  // Define potential service categories
  const serviceCategoryExamples = [
    "Gold Trading", "Gold Investment", "Gold Savings Program", "Physical Gold Sales",
    "Jewelry", "Commodity Trading", "Futures Trading", "Stock Trading", "ETF Trading",
    "Investment Platform", "Robo-advisor", "Financial Planning", "Portfolio Management",
    "Digital Assets", "Cryptocurrency", "General Finance", "Other"
  ].join(", ");

  const prompt = `
You are an expert marketing analyst. Analyze the following text report about ${clientName} and its competitors, focusing on products/services like: ${productFocus || 'general offerings'}. Generate a VALID JSON object summarizing the key findings for the competitors found, structured exactly as specified below.

**Input Text Report:**
\`\`\`text
${rawContent}
\`\`\`

**Analysis & Structuring Instructions:**
1.  **Identify Competitors:** For each competitor, extract all available information for the fields in the JSON structure.
2.  **Extract Services:** List the specific services mentioned for each competitor in the \`services\` array.
3.  **Categorize Services:** Based *only* on the extracted \`services\` list for a competitor, assign one or more relevant categories from the suggested list below (or generate a similar, appropriate category if none fit perfectly) and put them in the \`serviceCategories\` array. Aim for 1-3 concise categories per competitor. Suggested Categories: [${serviceCategoryExamples}].
4.  **Prioritize Focus:** When extracting services and assigning categories, give priority to those related to the client's focus: ${productFocus || 'general offerings'}.
5.  **Handle Facebook URL:** Extract the Facebook Page URL (\`facebookUrl\`) only if it is clearly present and appears to be a valid URL format in the text report. Otherwise, use \`null\`.
6.  **Handle Missing Data:** For other fields, use \`null\` if the information is not found. For array fields (\`services\`, \`serviceCategories\`, \`features\`, etc.), use an empty array \`[]\` if no items are found. For nested objects (\`brandPerception\`, etc.), use \`null\` if the entire object's data is missing, otherwise include the object with \`null\` for its missing inner fields.
7.  **Collect Competitors:** Create a JSON object for each competitor and collect them in the main \`competitors\` array.

**Output Format & JSON Validity RULES:**
*   **Return ONLY the single, valid JSON object.** No explanations, intro text, or markdown formatting (like \`\`\`json\`).
*   **CRITICAL: Ensure valid JSON syntax.** Double quotes for keys/strings, no trailing commas, correct brackets/braces.
*   The output MUST start with \`{\` and end with \`}\`.

**Required JSON Structure:**
\`\`\`json
{
  "competitors": [
    {
      "name": "Example Competitor",
      "website": null,
      "facebookUrl": null, // Extract only if clearly present
      "services": [], // Raw list of services mentioned
      "serviceCategories": [], // Assigned categories based on services
      "features": [],
      "pricing": null,
      "strengths": [],
      "weaknesses": [],
      "specialty": null,
      "targetAudience": null,
      "brandTone": null,
      "brandPerception": {
        "positive": null,
        "negative": null
      },
      "marketShare": null,
      "complaints": [],
      "adThemes": [],
      "seo": {
        "domainAuthority": null,
        "backlinks": null,
        "organicTraffic": null
      },
      "websiteQuality": {
        "uxScore": null,
        "loadingSpeed": null,
        "mobileResponsiveness": null
      },
      "usp": null,
      "socialMetrics": {
        "followers": null
      }
    }
    // ... more competitors
  ]
}
\`\`\`
`; // Correctly terminated template literal

  try {
    console.log('[jina-search] Sending request to Gemini API (with categorization)');
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
      console.error('[jina-search] Gemini API error text (with categorization):', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('[jina-search] Received response from Gemini API (with categorization)');

    const parsedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof parsedText !== 'string' || parsedText.trim() === '') {
        throw new Error('Gemini parsing error: No valid text content returned');
    }

    try {
      const cleanedText = parsedText.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
      let parsedJson = JSON.parse(cleanedText) as GeminiOutput;
      console.log('[jina-search] Successfully parsed JSON from Gemini (with categorization)');

      // Basic validation (check competitors array exists)
      if (!parsedJson || typeof parsedJson !== 'object' || !Array.isArray(parsedJson.competitors)) {
          throw new Error('Gemini parsing error: Invalid JSON structure received (missing competitors array)');
      }

      return parsedJson;

    } catch(jsonError: any) {
      console.error('[jina-search] Failed to parse JSON from Gemini (with categorization):', parsedText, 'Error:', jsonError);
      throw new Error(`Gemini parsing error: Invalid JSON received - ${jsonError.message}`);
    }

  } catch (error) {
    console.error('[jina-search] Error in parseWithGemini (with categorization):', error);
    throw error; 
  }
}

// Removed unused functions