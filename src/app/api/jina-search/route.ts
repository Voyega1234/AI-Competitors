import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import supabaseAdmin from '@/lib/supabaseClient'; // Import Supabase client

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
    userCompetitors?: string | null;
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
  // Decode URI components like %20
  try {
    url = decodeURI(url);
  } catch (e) {
    // Log decoding error but proceed with the original URL if decoding fails
    console.warn(`[ensureAbsoluteUrl] Failed to decode URL: ${url}`, e);
  }
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
    const PARENT_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const DEEP_RESEARCH_API_URL = process.env.DEEP_RESEARCH_API_URL; // URL of the deployed node-DeepResearch server
    const DEEP_RESEARCH_API_KEY = process.env.DEEP_RESEARCH_API_KEY; // Optional API key for the server

    if (!PARENT_GEMINI_API_KEY) {
      console.error('NEXT_PUBLIC_GEMINI_API_KEY is not defined in the environment');
      return NextResponse.json({ success: false, error: 'Gemini API key configuration error' }, { status: 500 });
    }
    if (!DEEP_RESEARCH_API_URL) {
      console.error('DEEP_RESEARCH_API_URL is not defined in the environment');
      return NextResponse.json({ success: false, error: 'DeepResearch API URL configuration error' }, { status: 500 });
    }

    // Parse request body
    const body = await request.json();
    const { clientName, facebookUrl: clientFacebookUrl, websiteUrl: clientWebsiteUrl, market, productFocus, additionalInfo, userCompetitors } = body;
    
    const analysisInput = {
      clientName,
      clientWebsiteUrl,
      clientFacebookUrl,
      market,
      productFocus,
      additionalInfo,
      userCompetitors,
      timestamp: new Date().toISOString(),
    };
    
    if (!clientName || !market) {
      console.error('Client name and market are required from form data');
      return NextResponse.json({ success: false, error: 'Client name and target market are required' }, { status: 400 });
    }
    
    // --- Construct Query for node-DeepResearch --- 
    const clientProductInfo = productFocus ? ` focusing on products/services like: ${productFocus}` : '';
    const clientAdditionalContext = additionalInfo ? ` Additional context: ${additionalInfo}` : '';
    const clientBaseInfo = `Our client is \"${clientName}\" ${clientWebsiteUrl ? ` with website ${clientWebsiteUrl}` : ''}${clientFacebookUrl ? ` and Facebook page ${clientFacebookUrl}` : ''}`;
    const marketInfo = market.toLowerCase() === 'global' ? 'globally' : `in the ${market} market`;
    const productFocusPhrase = productFocus || "the client's main offerings";
    const competitorFocusPhrase = productFocus || 'general offerings similar to the client';
    const userCompetitorsSection = userCompetitors && userCompetitors.trim() 
        ? `Please pay special attention to the following user-specified competitors if found: ${userCompetitors.trim()}.`
        : '';

    // Use the detailed query provided by the user for the script
    const detailedResearchPrompt = `
Please conduct thorough research and provide detailed information about each competitor with the following details:

Company Name

Website URL

Their main services and features (especially those related to ${productFocusPhrase}) (Important)

Target audience / customer base (Important)

Their pricing model / general pricing overview (Important) – Actual price figures from reliable sources are required. If possible, they must be accurate and not fabricated.

Key strengths or differentiators (Important) – If possible, include specific figures or statistics.

Potential weaknesses or market gaps (Important) – If possible, include specific figures or statistics.

Brand expertise and unique selling propositions (USP)

Brand tone and public perception (both positive and negative)

Estimated market share (if available)

Common customer complaints

General advertising themes or key concepts used in their campaigns

Thank you for helping us research our competitors further.
PLEASE GIVE ME THE COMPLETELY DETIALS AS MUCH AS POSSIBLE DO YOUR BEST
`;

    // Combine the initial context with the detailed research points for the script query
    const queryForScript = `Analyze competitors for ${clientBaseInfo}, operating ${marketInfo}${clientProductInfo}. Focus on ${competitorFocusPhrase}. ${userCompetitorsSection} ${clientAdditionalContext}
${detailedResearchPrompt}`;

    console.log('[jina-search] Query constructed for DeepResearch API:', queryForScript.substring(0, 100) + '...');

    // --- Call node-DeepResearch Server API ---
    let rawContent = '';
    try {
      const deepResearchApiEndpoint = `${DEEP_RESEARCH_API_URL.replace(/\/$/, '')}/v1/chat/completions`; // Ensure correct endpoint path
      console.log(`[jina-search] Calling DeepResearch API: ${deepResearchApiEndpoint}`);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      // Add Authorization header if API key is provided
      if (DEEP_RESEARCH_API_KEY) {
        headers['Authorization'] = `Bearer ${DEEP_RESEARCH_API_KEY}`;
      }

      const apiResponse = await fetch(deepResearchApiEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: "jina-deepsearch-v1", // Required by the API
          messages: [
            {
              role: "user",
              content: queryForScript // Send the constructed query
            }
          ],
          // stream: false // Assuming we want the full response, not streaming
        }),
        // Add a reasonable timeout
        // signal: AbortSignal.timeout(300000) // 5 minutes (adjust as needed)
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`[jina-search] DeepResearch API error response: ${apiResponse.status} - ${errorText}`);
        throw new Error(`DeepResearch API error: ${apiResponse.status} - ${errorText.substring(0, 200)}`);
      }

      const responseData = await apiResponse.json();

      // Extract content from the OpenAI-compatible response structure
      rawContent = responseData?.choices?.[0]?.message?.content?.trim() || '';

      // The DeepSearch API might include <think>...</think> tags. We usually want the text *after* the last </think> tag.
      const thinkTagEndMarker = '</think>';
      const lastThinkTagIndex = rawContent.lastIndexOf(thinkTagEndMarker);
      if (lastThinkTagIndex !== -1) {
          rawContent = rawContent.substring(lastThinkTagIndex + thinkTagEndMarker.length).trim();
          console.log('[jina-search] Extracted content after </think> tag.');
      } else {
          console.log('[jina-search] No </think> tag found, using full response content.');
      }

      if (!rawContent) {
        console.warn('[jina-search] DeepResearch API returned successfully but content was empty or missing in the expected structure.');
        // Decide if this is an error or just no result
        // For now, treat as no result, but might need adjustment
        rawContent = ''; // Ensure it's an empty string
      } else {
          console.log('[jina-search] Received content from DeepResearch API. Length:', rawContent.length);
      }

    } catch (apiError: any) {
      console.error('[jina-search] Error calling DeepResearch API:', apiError);
      // Re-throw the error to be caught by the main try-catch block
      throw new Error(`Failed to get analysis from DeepResearch service: ${apiError.message}`);
    }
    // --- End API Call ---

    // ---->>> PARSE WITH GEMINI <<<---- (Using the extracted rawContent)
    if (!rawContent) {
        // If DeepResearch returned nothing, maybe we skip Gemini? Or return an error?
        // For now, let's return an empty competitor list gracefully.
        console.warn('[jina-search] No content received from DeepResearch API, skipping Gemini parsing and database save.');
        return NextResponse.json({
          success: true,
          competitors: [] // Return empty list
        });
        // Alternative: throw new Error('Failed to get analysis content from DeepResearch service.');
    }

    console.log('[jina-search] Sending extracted content to Gemini for parsing...');
    const parsedData: GeminiOutput = await parseWithGemini(rawContent, PARENT_GEMINI_API_KEY, clientName, productFocus);
    
    // --- Process Gemini's Output --- 
    const processedCompetitors: FinalCompetitor[] = (parsedData.competitors || []).map((comp): FinalCompetitor => {
      // Ensure nested objects exist and provide defaults
      const perception = comp.brandPerception || { positive: null, negative: null };
      const seo = comp.seo || { domainAuthority: null, backlinks: null, organicTraffic: null };
      const websiteQuality = comp.websiteQuality || { uxScore: null, loadingSpeed: null, mobileResponsiveness: null };
      const socialMetrics = comp.socialMetrics || { followers: null };

      // Process targetAudience specifically to ensure it's a string
      let finalTargetAudience: string;
      if (typeof comp.targetAudience === 'string' && comp.targetAudience) {
        finalTargetAudience = comp.targetAudience;
      } else if (Array.isArray(comp.targetAudience)) {
        // Join array elements, filtering out any empty/null values first
        finalTargetAudience = (comp.targetAudience as string[]).filter(Boolean).join(', ') || 'N/A';
      } else {
        finalTargetAudience = 'N/A'; // Fallback for null, undefined, or other unexpected types
      }

      // Helper function to process potentially array string fields
      const processStringOrArrayField = (fieldValue: string | string[] | null | undefined): string => {
        if (typeof fieldValue === 'string' && fieldValue) {
          return fieldValue;
        } else if (Array.isArray(fieldValue)) {
          return (fieldValue as string[]).filter(Boolean).join(', ') || 'N/A';
        } else {
          return 'N/A';
        }
      };

      // --- Post-process Service Categories ---
      let cleanedServiceCategories: string[] = [];
      if (comp.serviceCategories && Array.isArray(comp.serviceCategories)) {
        const normalizedCategories = comp.serviceCategories
          .map(category => typeof category === 'string' ? category.trim().toLowerCase() : null) // Trim, lowercase, handle non-strings
          .filter((category): category is string => category !== null && category !== ''); // Filter out nulls/empty strings
        
        // Remove duplicates using a Set
        cleanedServiceCategories = Array.from(new Set(normalizedCategories));
      }
      // --- End Post-processing ---

      return {
        id: uuidv4(),
        name: comp.name || 'Unknown Competitor',
        website: ensureAbsoluteUrl(comp.website),
        facebookUrl: ensureAbsoluteUrl(comp.facebookUrl),
        services: comp.services || [],
        serviceCategories: cleanedServiceCategories,
        features: comp.features || [],
        pricing: processStringOrArrayField(comp.pricing),
        strengths: comp.strengths || [],
        weaknesses: comp.weaknesses || [],
        specialty: processStringOrArrayField(comp.specialty),
        targetAudience: finalTargetAudience,
        brandTone: processStringOrArrayField(comp.brandTone),
        brandPerception: {
          positive: processStringOrArrayField(perception.positive),
          negative: processStringOrArrayField(perception.negative)
        },
        marketShare: processStringOrArrayField(comp.marketShare),
        complaints: comp.complaints || [],
        adThemes: comp.adThemes || [],
        seo: {
          domainAuthority: parseInt(String(seo.domainAuthority ?? '0'), 10) || 0,
          backlinks: parseInt(String(seo.backlinks ?? '0'), 10) || 0,
          organicTraffic: String(seo.organicTraffic ?? 'N/A')
        },
        websiteQuality: {
          uxScore: parseInt(String(websiteQuality.uxScore ?? '0'), 10) || 0,
          loadingSpeed: processStringOrArrayField(websiteQuality.loadingSpeed),
          mobileResponsiveness: processStringOrArrayField(websiteQuality.mobileResponsiveness)
        },
        usp: processStringOrArrayField(comp.usp),
        socialMetrics: {
          followers: parseInt(String(socialMetrics.followers ?? '0'), 10) || 0,
        }
      };
    }).filter(comp => comp.name !== 'Unknown Competitor'); // Filter out fundamentally broken entries

    console.log(`[jina-search] Processed ${processedCompetitors.length} competitors via Gemini.`);

    // --- Save the combined result to the Database using Supabase --- 
    try {
        // 1. Insert AnalysisRun
        const { data: savedAnalysisRun, error: runInsertError } = await supabaseAdmin
            .from('AnalysisRun')
            .insert({
                id: uuidv4(),
                // Map fields from analysisInput
                clientName: analysisInput.clientName,
                clientWebsiteUrl: analysisInput.clientWebsiteUrl,
                clientFacebookUrl: analysisInput.clientFacebookUrl,
                market: analysisInput.market,
                productFocus: analysisInput.productFocus,
                additionalInfo: analysisInput.additionalInfo,
                timestamp: analysisInput.timestamp,
                updatedAt: analysisInput.timestamp
            })
            .select()
            .single();

        if (runInsertError) {
            console.error('[jina-search] Supabase error inserting AnalysisRun:', runInsertError);
            throw new Error(runInsertError.message || 'Failed to save analysis run data.');
        }

        if (!savedAnalysisRun || !savedAnalysisRun.id) {
            throw new Error('Failed to retrieve ID after inserting AnalysisRun.');
        }

        const newRunId = savedAnalysisRun.id;
        console.log(`[jina-search] Successfully saved AnalysisRun (ID: ${newRunId}) to database.`);

        // 2. Prepare and Insert Competitors
        if (processedCompetitors.length > 0) {
            const competitorsToInsert = processedCompetitors.map(comp => ({
                // Map fields from FinalCompetitor to the Competitor table schema
                id: comp.id, 
                analysisRunId: newRunId, 
                name: comp.name,
                website: comp.website,
                facebookUrl: comp.facebookUrl,
                services: comp.services,
                serviceCategories: comp.serviceCategories,
                features: comp.features,
                pricing: comp.pricing,
                strengths: comp.strengths,
                weaknesses: comp.weaknesses,
                specialty: comp.specialty,
                targetAudience: comp.targetAudience,
                brandTone: comp.brandTone,
                positivePerception: comp.brandPerception.positive, 
                negativePerception: comp.brandPerception.negative, 
                marketShare: comp.marketShare,
                complaints: comp.complaints,
                adThemes: comp.adThemes,
                // Explicitly handle defaults for NOT NULL integer fields here
                domainAuthority: comp.seo?.domainAuthority ?? 0, 
                backlinks: comp.seo?.backlinks ?? 0,             
                organicTraffic: comp.seo?.organicTraffic ?? 'N/A', // Keep as string, assuming table expects text    
                uxScore: comp.websiteQuality?.uxScore ?? 0,         
                loadingSpeed: comp.websiteQuality?.loadingSpeed ?? 'N/A', // Keep as string
                mobileResponsiveness: comp.websiteQuality?.mobileResponsiveness ?? 'N/A', // Keep as string
                usp: comp.usp,
                followers: comp.socialMetrics?.followers ?? 0      
            }));

            const { error: competitorInsertError } = await supabaseAdmin
                .from('Competitor')
                .insert(competitorsToInsert);

            if (competitorInsertError) {
                console.error('[jina-search] Supabase error inserting Competitors:', competitorInsertError);
                // Decide how to handle partial failure: Maybe log and continue, or throw?
                // Throwing for now, assuming atomicity is preferred.
                // Consider deleting the AnalysisRun if competitors fail? (More complex)
                throw new Error(competitorInsertError.message || 'Failed to save competitor data.');
            }
            console.log(`[jina-search] Successfully saved ${competitorsToInsert.length} competitors linked to AnalysisRun ID: ${newRunId}.`);
        } else {
            console.log(`[jina-search] No competitors processed, skipping competitor insert for AnalysisRun ID: ${newRunId}.`);
        }

    } catch (dbError: any) {
      console.error('[jina-search] Failed to save analysis result to database:', dbError);
      // Re-throw the error to be caught by the outer try-catch
      throw dbError; 
    }
    // --- End database saving ---

    // Return success only if everything including DB save worked
    return NextResponse.json({ 
      success: true,
      competitors: processedCompetitors // Return the final list needed by the frontend
    });

  } catch (error: any) {
    console.error('[jina-search] Error in POST handler:', error);
    const errorMessage = error.message || 'An unexpected server error occurred'; // Simplified
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

  // Modified prompt to handle markdown table input
  const prompt = `
You are an expert marketing analyst. The following text report about ${clientName} and its competitors contains a **MARKDOWN TABLE**. Analyze the table and surrounding text, focusing on products/services like: ${productFocus || 'general offerings'}. PRIORITIZE the most recent information available. Generate a VALID JSON object summarizing the key findings for **ALL** competitors found in the table, structured exactly as specified below.

**Input Text Report (contains a Markdown Table):**
\`\`\`text
${rawContent}
\`\`\`

**Analysis & Structuring Instructions:**
1.  **Identify Competitors:** The competitors are listed as columns in the markdown table. Extract data for EACH competitor column.
2.  **Extract Data from Rows:** For each competitor column, go through the rows of the table (e.g., 'URL เว็บไซต์', 'บริการและฟีเจอร์หลัก', 'กลุ่มเป้าหมาย', 'รูปแบบ/ภาพรวมราคา', 'จุดแข็งหลัก', 'จุดอ่อนที่เป็นไปได้', etc.) and extract the corresponding information from the cell for that competitor.
3.  **Extract Services:** From the 'บริการและฟีเจอร์หลัก' row for each competitor, carefully identify ONLY their specific product or service offerings. Include:
    * Specific named products or services (e.g., "Gold Savings Account", "Robo-advisor Platform", "สินเชื่อส่วนบุคคลดิจิทัล")
    * Concrete service types (e.g., "Investment Advisory", "Commodity Trading")
    * Distinct product categories (e.g., "Physical Gold", "ETFs", "Nano-finance")
    DO NOT include general descriptions, marketing claims, or features. Each service should be 1-4 words maximum and represent something a customer could specifically purchase or sign up for. Put these in the \`services\` array.
4.  **Categorize Services:** Based *only* on the extracted \`services\` list for a competitor, assign one or more relevant categories from the suggested list below (or generate a similar, appropriate category if none fit perfectly) and put them in the \`serviceCategories\` array. Aim for 1-3 concise categories per competitor. Suggested Categories: [${serviceCategoryExamples}].
5.  **Prioritize Focus:** When extracting services and assigning categories, give priority to those related to the client's focus: ${productFocus || 'general offerings'}.
6.  **Handle Missing/N/A Data:** If a cell in the table is empty, contains "N/A", or the information is otherwise not found, use \`null\` for the corresponding field in the JSON. For array fields (\`services\`, \`serviceCategories\`, \`features\`, etc.), use an empty array \`[]\` if no items are found. For nested objects (\`brandPerception\`, etc.), use \`null\` if the entire object's data is missing, otherwise include the object with \`null\` for its missing inner fields.
7.  **Collect Competitors:** Create a JSON object for EACH competitor found in the table columns and collect them in the main \`competitors\` array.

**Output Format & JSON Validity RULES:**
*   **Return ONLY the single, valid JSON object.** No explanations, intro text, or markdown formatting (like \`\`\`json\`\`\`).
*   **CRITICAL: Ensure valid JSON syntax.** Double quotes for keys/strings, no trailing commas, correct brackets/braces.
*   The output MUST start with \`{\` and end with \`}\`.

**Required JSON Structure:**
\`\`\`json
{
  "competitors": [
    {
      "name": "Example Competitor", // Extracted from table column header
      "website": null,
      "facebookUrl": null, // Extract only if clearly present (might not be in table)
      "services": [], // Extracted from 'บริการและฟีเจอร์หลัก' row
      "serviceCategories": [], // Assigned categories based on services
      "features": [], // May need extraction from services/strengths row if applicable
      "pricing": null, // Extracted from 'รูปแบบ/ภาพรวมราคา' row
      "strengths": [], // Extracted from 'จุดแข็งหลัก' row (parse list if needed)
      "weaknesses": [], // Extracted from 'จุดอ่อนที่เป็นไปได้' row (parse list if needed)
      "specialty": null, // Extracted from 'ความเชี่ยวชาญของแบรนด์/USP' row
      "targetAudience": null, // Extracted from 'กลุ่มเป้าหมาย/ฐานลูกค้า' row
      "brandTone": null, // Extracted from 'น้ำเสียงของแบรนด์' row
      "brandPerception": { // Extracted from 'การรับรู้ของสาธารณชน' row
        "positive": null,
        "negative": null
      },
      "marketShare": null, // Extracted from 'ส่วนแบ่งการตลาดโดยประมาณ' row
      "complaints": [], // Extracted from 'ข้อร้องเรียนทั่วไปจากลูกค้า' row
      "adThemes": [], // Extracted from 'แนวคิดหลัก/ธีมที่ใช้ในการโฆษณา' row
      "seo": { // These might not be in the table, use null if not found
        "domainAuthority": null,
        "backlinks": null,
        "organicTraffic": null
      },
      "websiteQuality": { // These might not be in the table, use null if not found
        "uxScore": null,
        "loadingSpeed": null,
        "mobileResponsiveness": null
      },
      "usp": null, // Often combined with specialty, extract if separate
      "socialMetrics": { // These might not be in the table, use null if not found
        "followers": null
      }
    }
    // ... include ALL competitors from the table columns
  ]
}
\`\`\`
`;

  try {
    console.log('[jina-search] Sending request to Gemini API (with categorization)');
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Enable Grounding with Google Search [[reference]](https://ai.google.dev/gemini-api/docs/grounding?lang=rest)
        tools: [{
            "google_search": {}
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.3 // Slightly increased for better discovery with grounding
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