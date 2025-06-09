import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Google Generative AI client
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

/**
 * API route to suggest funnel stages for ad sets using Gemini AI
 */
export async function POST(request: NextRequest) {
  try {
    // Get the ad sets and available funnel stages from the request body
    const { adSets, adSetIds, adAccountId, funnelStages } = await request.json();

    if (!adSets || !Array.isArray(adSets) || adSets.length === 0) {
      return NextResponse.json(
        { error: 'Ad sets array is required' },
        { status: 400 }
      );
    }

    if (!funnelStages || !Array.isArray(funnelStages) || funnelStages.length === 0) {
      return NextResponse.json(
        { error: 'Funnel stages array is required' },
        { status: 400 }
      );
    }
    
    // Fetch additional context from the database
    let adSetsWithContext = [];
    let audienceData = [];
    
    try {
      // Fetch audience data for this ad account
      const { data: audiences, error: audienceError } = await supabase
        .from('facebook_custom_audiences')
        .select('*')
        .eq('ad_account_id', adAccountId);
      
      if (audienceError) {
        console.error('Error fetching audiences:', audienceError);
      } else if (audiences) {
        audienceData = audiences;
      }
      
      // Fetch ad details that include audience associations
      for (const adSetId of adSetIds) {
        const { data: adDetails, error: adError } = await supabase
          .from('ads_details')
          .select('*')
          .eq('ad_set_id', adSetId)
          .limit(1);
          
        if (!adError && adDetails && adDetails.length > 0) {
          adSetsWithContext.push(adDetails[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching additional context:', error);
    }
    
    // Define types for our data structures
    interface AudienceItem {
      id: string;
      name: string;
    }
    
    interface AdDetail {
      ad_set: string;
      ad_set_id: string;
      audience_custom_audiences?: string;
    }
    
    interface Audience {
      id: string;
      name: string;
    }
    
    // Create a mapping of ad set names to their associated audiences
    const adSetToAudiences: Record<string, string[]> = {};
    adSetsWithContext.forEach((adDetail: AdDetail) => {
      try {
        if (adDetail.audience_custom_audiences) {
          // The audience_custom_audiences field might be in different formats
          // Let's handle it more carefully
          let audienceIds: string[] = [];
          
          try {
            // First, try to parse it directly if it's already a valid JSON array
            if (adDetail.audience_custom_audiences.startsWith('[') && adDetail.audience_custom_audiences.endsWith(']')) {
              const parsed = JSON.parse(adDetail.audience_custom_audiences);
              audienceIds = parsed.map((item: any) => item.id || item);
            } else {
              // If it's not a valid JSON array, try to extract IDs using regex
              const idMatches = adDetail.audience_custom_audiences.match(/"id"\s*:\s*"([^"]+)"/g);
              if (idMatches) {
                audienceIds = idMatches.map(match => {
                  const idMatch = match.match(/"id"\s*:\s*"([^"]+)"/);
                  return idMatch ? idMatch[1] : '';
                }).filter(id => id !== '');
              }
            }
          } catch (parseError) {
            console.error('Error parsing audience IDs:', parseError);
          }
          
          if (audienceIds.length > 0) {
            const associatedAudiences = audienceData
              .filter((audience: Audience) => audienceIds.includes(audience.id))
              .map((audience: Audience) => audience.name);
              
            adSetToAudiences[adDetail.ad_set] = associatedAudiences;
          }
        }
      } catch (e) {
        console.error('Error processing audience data for ad set:', adDetail.ad_set, e);
      }
    });
    
    // Create a prompt for Gemini with enhanced context
    const prompt = `
      You are an expert in digital marketing and ad campaign segmentation.
      
      Given the following Facebook ad set names, suggest the most appropriate funnel stage for each.
      The available funnel stages are: ${funnelStages.join(', ')}.
      
      Ad set information:
      ${adSets.map((name, index) => {
        const audiences = adSetToAudiences[name] || [];
        return `- Ad Set Name: ${name}
  ${audiences.length > 0 ? `  Associated Audiences: ${audiences.join(', ')}` : ''}`;
      }).join('\n\n')}
      
      For each ad set, determine the most appropriate funnel stage based on:
      - Ad sets with terms like "Lookalike", "LAL", "Interest", "Broad" are typically for top-of-funnel (awareness/evaluation)
      - Ad sets with terms like "Engaged", "Video", "Viewers", "Retargeting" are typically mid-funnel (consideration)
      - Ad sets with terms like "App", "Purchase", "Conversion", "Leads" are typically bottom-funnel (conversion)
      - Consider the associated audiences when available - audiences with "Lookalike" are typically top-funnel, audiences with "Engaged" or "Video" are mid-funnel, and audiences with "App", "Purchase", or "Active" are bottom-funnel
      
      Return your suggestions in a structured format.
    `;

    // Create the response schema
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          adSetName: { type: Type.STRING },
          suggestedStage: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        propertyOrdering: ["adSetName", "suggestedStage", "confidence", "reasoning"]
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

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Error suggesting funnel stages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to suggest funnel stages' },
      { status: 500 }
    );
  }
}
