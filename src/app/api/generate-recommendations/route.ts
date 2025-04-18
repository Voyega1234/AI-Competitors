import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AnalysisRun, Competitor } from '../../../generated/prisma'; // Adjust path if needed

const prisma = new PrismaClient();

// TODO: Define the expected structure for a recommendation generated by Gemini
interface GeneratedRecommendation {
    title: string;
    description: string;
    category: string; // e.g., Campaign, Promotion, Content, Feature, Initiative
    impact: string;   // e.g., High, Medium, Low
    competitiveGap?: string;
    tags?: string[];
}

// Expected structure from the Gemini JSON response
interface GeminiRecommendationOutput {
    recommendations: GeneratedRecommendation[];
}

// Helper function to create a concise summary of competitor data
function summarizeCompetitors(competitors: Competitor[]): string {
    if (!competitors || competitors.length === 0) {
        return "No competitor data available.";
    }

    let summary = `Analysis of ${competitors.length} competitors reveals:\n`;

    // --- Basic Service Overview ---
    const allServices = new Set<string>();
    competitors.forEach(c => c.services?.forEach(s => allServices.add(s.toLowerCase())));
    if (allServices.size > 0) {
        summary += `- Common service areas include: ${Array.from(allServices).slice(0, 5).join(', ')}${allServices.size > 5 ? '...' : ''}.\n`;
    }

    // --- Pricing Insights (Example) ---
    const pricingModels = new Set<string>();
    competitors.forEach(c => { if (c.pricing) pricingModels.add(c.pricing); });
    if (pricingModels.size > 0) {
        summary += `- Pricing models observed: ${Array.from(pricingModels).slice(0, 3).join(', ')}.\n`;
    }
    
    // --- Strengths/Weaknesses (Example) ---
    const commonStrengths = new Map<string, number>();
    const commonWeaknesses = new Map<string, number>();
    competitors.forEach(c => {
        c.strengths?.forEach(s => commonStrengths.set(s.toLowerCase(), (commonStrengths.get(s.toLowerCase()) || 0) + 1));
        c.weaknesses?.forEach(w => commonWeaknesses.set(w.toLowerCase(), (commonWeaknesses.get(w.toLowerCase()) || 0) + 1));
    });
    // Helper to get top N items from a map
    const getTopItems = (map: Map<string, number>, topN: number) => Array.from(map.entries())
                                                                          .sort((a, b) => b[1] - a[1])
                                                                          .slice(0, topN)
                                                                          .map(entry => entry[0]);

    const topStrengths = getTopItems(commonStrengths, 2);
    const topWeaknesses = getTopItems(commonWeaknesses, 2);
    if (topStrengths.length > 0) summary += `- Common competitor strengths: ${topStrengths.join(', ')}.\n`;
    if (topWeaknesses.length > 0) summary += `- Common competitor weaknesses: ${topWeaknesses.join(', ')}.\n`;

    // Add more summary points as needed (e.g., target audience, market share hints)

    return summary;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const runId = searchParams.get('runId');
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY; // Use server-side key

  console.log(`Attempting to handle GET /api/generate-recommendations for runId: ${runId}`);

  if (!runId) {
    return new NextResponse(
      JSON.stringify({ error: 'runId query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set in environment variables.");
      return new NextResponse(JSON.stringify({ error: 'Server configuration error: Missing API key.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // 1. Fetch Analysis Run details and associated Competitors
    const analysisRunWithCompetitors = await prisma.analysisRun.findUnique({
      where: {
        id: runId,
      },
      include: {
        Competitor: true, // Include all competitors linked to this run
      },
    });

    if (!analysisRunWithCompetitors) {
      console.log(`AnalysisRun not found for runId: ${runId}`);
      return new NextResponse(
        JSON.stringify({ error: 'Analysis run not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const clientInfo = {
      clientName: analysisRunWithCompetitors.clientName,
      market: analysisRunWithCompetitors.market,
      productFocus: analysisRunWithCompetitors.productFocus,
      // Add other client info if needed for the prompt
    };
    const competitorsData = analysisRunWithCompetitors.Competitor;

    console.log(`Found ${competitorsData.length} competitors for runId: ${runId}. Preparing prompt for Gemini.`);

    // 2. Summarize Competitor Data
    const competitorSummary = summarizeCompetitors(competitorsData);
    console.log("Competitor Summary:", competitorSummary);

    // 3. Construct Gemini Prompt
    const prompt = `
You are an expert marketing and business strategist. Analyze the following client information and competitor summary to generate actionable recommendations.

**Client Information:**
*   Name: ${clientInfo.clientName}
*   Market: ${clientInfo.market}
*   Product Focus: ${clientInfo.productFocus}

**Competitor Landscape Summary:**
${competitorSummary}

**Task:**
Based ONLY on the information provided above, generate 5-7 diverse and actionable recommendations for ${clientInfo.clientName} to gain a competitive advantage in the ${clientInfo.market} market, specifically considering their focus on ${clientInfo.productFocus}.

**Recommendations should cover areas like:** Campaigns, Promotions, Content Strategy, New Features, Service Improvements, or Strategic Initiatives.

**Output Format Requirements:**
*   Return ONLY a single, valid JSON object. No introductory text, explanations, or markdown formatting (like \`\`\`json\`).
*   The JSON object MUST strictly follow the structure below.
*   Use "High", "Medium", or "Low" for the impact field.
*   Provide a concise "competitiveGap" string identifying the specific opportunity the recommendation addresses (optional, use null if not applicable).
*   Include 2-3 relevant keyword strings in the "tags" array.

**Required JSON Structure:**
\`\`\`json
{
  "recommendations": [
    {
      "title": "Recommendation Title",
      "description": "Detailed description of the recommendation and its rationale based on the competitor analysis.",
      "category": "Campaign", // e.g., Promotion, Feature, Content, Initiative, Service Improvement
      "impact": "High", // High, Medium, or Low
      "competitiveGap": "Specific gap addressed (e.g., Pricing Strategy, Service Offering)", // or null
      "tags": ["keyword1", "keyword2"]
    }
    // ... more recommendation objects
  ]
}
\`\`\`
`;

    // 4. Call Gemini API with Grounding
    console.log("Sending request to Gemini API...");
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiPayload = {
        contents: [{ parts: [{ text: prompt }] }],
        // Enable Grounding with Google Search [[reference]](https://ai.google.dev/gemini-api/docs/grounding?lang=rest)
        tools: [{
            "google_search": {}
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.6 // Adjust temperature for creativity vs consistency
        }
    };

    const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API request failed: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log("Received response from Gemini API.");

    // 5. Parse and Validate Gemini's JSON Output
    const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof generatedText !== 'string' || generatedText.trim() === '') {
        console.error("Gemini response missing valid text content:", geminiData);
        throw new Error('Gemini returned empty or invalid content.');
    }

    let parsedRecommendations: GeminiRecommendationOutput;
    try {
        // Attempt to parse the JSON string returned by Gemini
        parsedRecommendations = JSON.parse(generatedText);
        console.log(`Successfully parsed ${parsedRecommendations?.recommendations?.length ?? 0} recommendations from Gemini.`);

        // Basic validation
        if (!parsedRecommendations || !Array.isArray(parsedRecommendations.recommendations)) {
           throw new Error("Parsed JSON does not contain a 'recommendations' array.");
        }

    } catch(parseError: any) {
        console.error("Failed to parse JSON from Gemini:", generatedText, "Error:", parseError);
        // Fallback or throw error - maybe return an empty array or error response
        throw new Error(`Failed to parse recommendations JSON from AI: ${parseError.message}`);
    }
    
    // Return the successfully generated and parsed recommendations
    return NextResponse.json({ recommendations: parsedRecommendations.recommendations });

  } catch (error) {
    console.error(`Error in GET /api/generate-recommendations for runId ${runId}:`, error);
    let errorMessage = 'Failed to generate recommendations';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    // Optional: Disconnect Prisma
    // await prisma.$disconnect();
  }
} 