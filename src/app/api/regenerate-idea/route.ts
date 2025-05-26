import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from 'crypto';
import { cleanGeminiResponse } from "@/utils/text-utils";

// Configure Gemini API
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
// Using gemini-1.5-flash for Google Search capabilities
const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";


export async function POST(request: NextRequest) {
  try {
    console.log("[regenerate-idea] Starting request");

    // Check if we have a valid API key
    if (!GEMINI_API_KEY) {
      console.error("[regenerate-idea] No Gemini API key available");
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }
    
    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
      console.log("[regenerate-idea] Request data received:", JSON.stringify(requestData));
    } catch (parseError) {
      console.error("[regenerate-idea] Failed to parse request JSON:", parseError);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    
    // Extract and validate parameters
    const { runId, model, ideaIndex, feedback } = requestData;

    if (!runId || !model || ideaIndex === undefined) {
      console.log(`[regenerate-idea] Missing parameters: runId=${runId}, model=${model}, ideaIndex=${ideaIndex}`);
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Use provided feedback or default
    const userFeedback = feedback || "This idea needs improvement.";
    console.log(`[regenerate-idea] Using feedback: "${userFeedback}"`);
    
        // Fetch competitor analysis data if runId is provided
    let competitorAnalysis = null;
    try {
      if (runId) {
        console.log(`[regenerate-idea] Fetching competitor analysis for runId: ${runId}`);
        // Use absolute URL with origin
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
        const analysisResponse = await fetch(`${apiBaseUrl}/api/competitor-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientName: requestData.clientName || 'Client',
            productFocus: requestData.productFocus || 'Product',
            runId
          }),
        });
        
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          competitorAnalysis = analysisData;
          console.log('[regenerate-idea] Successfully fetched competitor analysis');
        } else {
          console.error(`[regenerate-idea] Failed to fetch competitor analysis: ${analysisResponse.status}`);
        }
      }
    } catch (analysisError) {
      console.error('[regenerate-idea] Error fetching competitor analysis:', analysisError);
      // Continue without competitor analysis if there's an error
    }

    // Format competitor insights if available
    let competitorInsights = '';
    if (competitorAnalysis?.competitors?.length > 0) {
      competitorInsights = [
        "\n\nCompetitor Analysis Summary:\n",
        ...competitorAnalysis.competitors.map((comp: any) => {
          return `${comp.name || 'Competitor'}:\n` +
            `- Strengths: ${Array.isArray(comp.strengths) ? comp.strengths.join(', ') : 'N/A'}\n` +
            `- Weaknesses: ${Array.isArray(comp.weaknesses) ? comp.weaknesses.join(', ') : 'N/A'}\n` +
            `- USP: ${comp.usp || 'N/A'}`;
        }),
        "\n\nMarket Trends:\n",
        competitorAnalysis.market_trends || 'No market trend data available',
        "\n\nOpportunities:\n",
        competitorAnalysis.opportunities || 'No opportunity data available'
      ].join('\n');
    }
    
    // Determine if Thai language is requested
    const useThai = requestData.language === 'thai';
    
    // Create prompt for regenerating the idea
    let languageInstructions = '';
    if (useThai) {
      languageInstructions = `
**IMPORTANT LANGUAGE INSTRUCTION:**
ALL TEXTUAL OUTPUT IN THE FINAL JSON RESPONSE MUST BE IN THAI. 
Ensure all text fields contain Thai language content only.
`;
    }
    
    const regenerationPrompt = [
      "You are an expert ideation assistant with access to Google Search. I previously generated a marketing idea",
      "that needs optimization based on user feedback. DO NOT create a completely new idea - instead REFINE and ENHANCE the original concept.",
      "",
      "Here is the original idea you need to optimize:",
      `"${requestData.originalIdea ? JSON.stringify(requestData.originalIdea, null, 2) : 'Not provided'}"`,
      "",
      "The user provided this feedback about the idea:",
      `"${userFeedback}"`,
      "",
      "IMPORTANT: Use Google Search to research current market trends, competitor strategies, and real-time data",
      "to optimize this idea. Incorporate real market insights to address the specific user feedback.",
      "",
      "Please provide an OPTIMIZED VERSION of the original idea that specifically addresses the feedback points.", 
      "Keep the core concept intact while making it more effective, actionable, and data-driven.",
      
      // Add competitor insights if available
      competitorInsights,
      "",
      
      // Add language instruction if Thai is requested
      languageInstructions,
      
      "**Output Format Requirements (CRITICAL):**",
      "* YOU MUST RETURN PURE RAW JSON WITHOUT ANY MARKDOWN CODE BLOCKS. DO NOT WRAP IN CODE BLOCKS.",
      "* Output ONLY a valid JSON object. NO markdown formatting, NO triple backticks, NO explanation, NO introduction, and NO trailing text.",
      "* Return a JSON object with exactly this structure:",
      "{",
      "  \"recommendations\": [",
      "    {",
      useThai ? 
        "      \"title\": \"หัวข้อที่อธิบายว่าไอเดียนี้สื่อถึงอะไร นำเสนออะไร ใช้บริการหรือสินค้าอะไรหรือเน้นย้ำจุดแข็งอะไรของแบรนด์ อธิบายแบบละเอียด (ภาษาไทย)\"," :
        "      \"title\": \"Brief, catchy title for the idea\",",
      useThai ? 
        "      \"description\": \"รายละเอียดแนวคิดสร้างสรรค์ ที่ไม่ซ้ำใคร และมีประสิทธิภาพ (ภาษาไทย)\"," :
        "      \"description\": \"Detailed description of what the idea entails (2-3 sentences)\",",
      "      \"category\": \"Campaign\",",
      "      \"impact\": \"High\",",
      useThai ? 
        "      \"competitiveGap\": \"ระบุช่องว่างทางการแข่งขันที่ไอเดียนี้เข้าไปตอบโจทย์ (ภาษาไทย)\"," :
        "      \"competitiveGap\": \"Identify the competitive gap this idea addresses\",",
      useThai ? 
        "      \"tags\": [\"คำค้น1\", \"คำค้น2\", \"รูปแบบเนื้อหา\"]," :
        "      \"tags\": [\"tag1\", \"tag2\", \"content_type\"],",
      useThai ? 
        "      \"content_pillar\": \"ตัวอย่าง: เคล็ดลับฮาวทู\"," :
        "      \"content_pillar\": \"Example: How-to Tips\",",
      useThai ? 
        "      \"product_focus\": \"ระบุ ${requestData.productFocus || 'ผลิตภัณฑ์/บริการ'} ที่ระบุใน Input\"," :
        "      \"product_focus\": \"The product/service that is the focus of this idea\",",
      useThai ? 
        "      \"concept_idea\": \"สรุปแนวคิดสร้างสรรค์หลักสำหรับการนำเสนอไอเดียนี้ (1-2 ประโยค)\"," :
        "      \"concept_idea\": \"Summary of the main creative concept for presenting this idea (1-2 sentences)\",",
      "      \"copywriting\": {",
      useThai ? 
        "        \"headline\": \"พาดหัวหลักที่ดึงดูดความสนใจ\"," :
        "        \"headline\": \"Main headline that attracts attention\",",
      useThai ? 
        "        \"sub_headline_1\": \"พาดหัวรองที่ขยายความหรือเน้นประโยชน์\"," :
        "        \"sub_headline_1\": \"Supporting headline that expands or emphasizes benefits\",",
      useThai ? 
        "        \"sub_headline_2\": \"พาดหัวรองที่สอง (ถ้ามี) หรือ null\"," :
        "        \"sub_headline_2\": \"Second supporting headline (if needed) or null\",",
      "        \"bullets\": [",
      useThai ? 
        "          \"จุดเด่นที่ 1\"," :
        "          \"Highlight point 1\",",
      useThai ? 
        "          \"จุดเด่นที่ 2\"," :
        "          \"Highlight point 2\",",
      useThai ? 
        "          \"จุดเด่นที่ 3\"" :
        "          \"Highlight point 3\"",
      "        ],",
      useThai ? 
        "        \"cta\": \"ตัวอย่าง: ดูเพิ่มเติม\"" :
        "        \"cta\": \"Example: Learn More\"",
      "      }",
      "    }",
      "  ]",
      "}",
      "",
      "IMPORTANT: NEVER WRAP YOUR RESPONSE IN CODE BLOCKS. RETURN ONLY THE RAW JSON."
    ].join('\n');

    // Set generation parameters with Google Search enabled
    const generationParams = {
      contents: [
        {
          parts: [
            { text: regenerationPrompt }
          ]
        }
      ],
      tools: [{ "google_search": {} }], // Enable Google Search for research phase
      generationConfig: {
        temperature: 1.0,
      }
    };

    // Call Gemini API directly using fetch
    let responseData;
    try {
      console.log("[regenerate-idea] Sending request to Gemini API with Google Search...");
      
      const apiUrl = `${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generationParams),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[regenerate-idea] Gemini API error (${response.status}):`, errorText);
        return NextResponse.json({ 
          error: `Gemini API returned status ${response.status}`, 
          details: errorText 
        }, { status: 500 });
      }

      responseData = await response.json();
      console.log("[regenerate-idea] Received response from Gemini API");
    } catch (apiError) {
      console.error("[regenerate-idea] Error calling Gemini API:", apiError);
      return NextResponse.json({ 
        error: "Failed to fetch from Gemini API", 
        details: apiError instanceof Error ? apiError.message : String(apiError)
      }, { status: 500 });
    }
    
    // Extract text from the response
    if (!responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("[regenerate-idea] Invalid response structure from Gemini API:", JSON.stringify(responseData));
      return NextResponse.json({ 
        error: "Invalid response structure from Gemini API", 
        rawResponse: responseData 
      }, { status: 500 });
    }
    
    const responseText = responseData.candidates[0].content.parts[0].text;
    
    // Process the response
    if (!responseText) {
      console.error("[regenerate-idea] Received empty text from Gemini API");
      return NextResponse.json({ error: "Received empty response from Gemini API" }, { status: 500 });
    }
    
    // Clean the response to extract valid JSON
    console.log("[regenerate-idea] Raw response (first 100 chars):", responseText.substring(0, 100));
    const cleanedResponse = cleanGeminiResponse(responseText);
    console.log("[regenerate-idea] Cleaned response (first 100 chars):", cleanedResponse.substring(0, 100));
    
    // Parse JSON and return
    try {
      const parsedResponse = JSON.parse(cleanedResponse);
      
      // Make sure we have a recommendations array
      if (!parsedResponse.recommendations || !Array.isArray(parsedResponse.recommendations) || parsedResponse.recommendations.length === 0) {
        console.error('[regenerate-idea] Missing or empty recommendations array in response');
        return NextResponse.json({ 
          error: 'Response is missing recommendations array',
          rawResponse: cleanedResponse 
        }, { status: 500 });
      }
      
      // Get the first recommendation (there should only be one)
      const regeneratedIdea = parsedResponse.recommendations[0];
      
      // Validate required fields in the regenerated idea
      const requiredFields = ["title", "description", "category", "impact"];
      for (const field of requiredFields) {
        if (!regeneratedIdea[field]) {
          console.error(`[regenerate-idea] Missing required field in response: ${field}`);
          return NextResponse.json({ 
            error: `Generated idea is missing required field: ${field}`,
            rawResponse: cleanedResponse 
          }, { status: 500 });
        }
      }
      
      // Add a unique ID to the regenerated idea
      regeneratedIdea.tempId = randomUUID();
      
      console.log("[regenerate-idea] Successfully generated new idea");
      return NextResponse.json({ 
        success: true, 
        regeneratedIdea: regeneratedIdea 
      });
    } catch (parseError) {
      console.error("[regenerate-idea] Failed to parse regenerated idea JSON:", parseError);
      return NextResponse.json({ 
        error: "Failed to parse regenerated idea JSON", 
        rawResponse: cleanedResponse 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[regenerate-idea] Unexpected error:", error);
    return NextResponse.json({ 
      error: "Failed to regenerate idea", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
