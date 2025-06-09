import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // Get the ad account ID from the query parameters
    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get('adAccountId');

    console.log(`Fetching ad sets with ads for ad account: ${adAccountId}`);

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'adAccountId query parameter is required' },
        { status: 400 }
      );
    }

    // First, get the ad set mappings
    let adSetMappings: Record<string, string[]> = {};
    try {
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('ad_set_funnel_mappings')
        .select('*')
        .eq('ad_account', adAccountId);

      if (!mappingsError && mappingsData) {
        // Group mappings by ad_set_id
        mappingsData.forEach(mapping => {
          if (!adSetMappings[mapping.ad_set_id]) {
            adSetMappings[mapping.ad_set_id] = [];
          }
          adSetMappings[mapping.ad_set_id].push(mapping.funnel_stage);
        });
      }
    } catch (error) {
      console.log('No ad set mappings found or table does not exist, continuing with empty mappings');
    }

    // Define default funnel stages - we'll use these as our standard categories
    const defaultFunnelStages = ["Evaluation", "Consideration", "Conversion"];

    // Query the MCP database for ad sets and their ads with extended information
    const { data: adSets, error: adSetsError } = await supabase
      .from('ads_details')
      .select('ad_set_id, ad_set, id, name, thumbnail_url, message, funnel_segment, ctr, cpc, impressions, reach, spend, frequency, roas, clicks, audience_custom_audiences, audience_age_min, audience_age_max, audience_countries, audience_interests, launch_date, objective')
      .eq('ad_account', adAccountId);

    if (adSetsError) {
      console.error('Error fetching ad sets with ads:', adSetsError);
      return NextResponse.json(
        { error: 'Failed to fetch ad sets with ads' },
        { status: 500 }
      );
    }

    // Group ads by ad set and track funnel segments
    const adSetMap: Record<string, any> = {};
    const adSetFunnelSegments: Record<string, Record<string, number>> = {};
    
    adSets.forEach(ad => {
      const adSetId = ad.ad_set_id;
      
      // Initialize ad set if not exists
      if (!adSetMap[adSetId]) {
        // Parse audience custom audiences if available
        let audiences = [];
        try {
          if (ad.audience_custom_audiences) {
            const audienceData = JSON.parse(ad.audience_custom_audiences);
            audiences = Object.values(audienceData).map((audience: any) => {
              try {
                const audienceObj = JSON.parse(audience);
                return audienceObj.name;
              } catch {
                return audience;
              }
            });
          }
        } catch (e) {
          console.log('Error parsing audience data:', e);
        }
        
        adSetMap[adSetId] = {
          id: adSetId,
          name: ad.ad_set,
          ads: [],
          stages: adSetMappings[adSetId] || [],
          metrics: {
            ctr: null,
            cpc: null,
            impressions: 0,
            reach: 0,
            spend: 0,
            clicks: 0,
            frequency: 0,
            roas: null,
            totalAds: 0
          },
          audiences: audiences
        };
        adSetFunnelSegments[adSetId] = {};
      }
      
      // Increment total ads count for this ad set
      adSetMap[adSetId].metrics.totalAds++;
      
      // Update metrics by aggregating values from all ads
      // For numeric values, we'll sum them up
      if (ad.impressions) {
        const impressions = parseFloat(ad.impressions) || 0;
        adSetMap[adSetId].metrics.impressions += impressions;
      }
      
      if (ad.reach) {
        const reach = parseFloat(ad.reach) || 0;
        adSetMap[adSetId].metrics.reach += reach;
      }
      
      if (ad.spend) {
        const spend = parseFloat(ad.spend) || 0;
        adSetMap[adSetId].metrics.spend += spend;
      }
      
      if (ad.clicks) {
        const clicks = parseFloat(ad.clicks) || 0;
        adSetMap[adSetId].metrics.clicks += clicks;
      }
      
      // For frequency, we'll take the highest value
      if (ad.frequency) {
        const frequency = parseFloat(ad.frequency) || 0;
        if (frequency > parseFloat(adSetMap[adSetId].metrics.frequency) || adSetMap[adSetId].metrics.frequency === 0) {
          adSetMap[adSetId].metrics.frequency = ad.frequency;
        }
      }
      
      // For ROAS, we'll take the highest value
      if (ad.roas) {
        const roas = parseFloat(ad.roas) || 0;
        if (!adSetMap[adSetId].metrics.roas || roas > parseFloat(adSetMap[adSetId].metrics.roas)) {
          adSetMap[adSetId].metrics.roas = ad.roas;
        }
      }
      
      // Track funnel segments for this ad set
      if (ad.funnel_segment) {
        if (!adSetFunnelSegments[adSetId][ad.funnel_segment]) {
          adSetFunnelSegments[adSetId][ad.funnel_segment] = 0;
        }
        adSetFunnelSegments[adSetId][ad.funnel_segment]++;
      }
      
      // Only add the ad if it has an image URL and isn't already in the list
      if (ad.thumbnail_url && !adSetMap[adSetId].ads.some((existingAd: any) => existingAd.id === ad.id)) {
        // Handle custom audiences - don't try to parse as JSON if it's a string
        let customAudiences = [];
        if (ad.audience_custom_audiences) {
          // Check if it's already an array
          if (Array.isArray(ad.audience_custom_audiences)) {
            customAudiences = ad.audience_custom_audiences;
          } else if (typeof ad.audience_custom_audiences === 'string') {
            // If it's a comma-separated string
            if (ad.audience_custom_audiences.includes(',')) {
              customAudiences = ad.audience_custom_audiences.split(',').map(a => a.trim());
            } else {
              // Just a single value
              customAudiences = [ad.audience_custom_audiences];
            }
            
            // Try to parse as JSON only if it looks like JSON
            if (ad.audience_custom_audiences.startsWith('{') || ad.audience_custom_audiences.startsWith('[')) {
              try {
                const audienceData = JSON.parse(ad.audience_custom_audiences);
                if (typeof audienceData === 'object') {
                  customAudiences = Object.values(audienceData).map((audience: any) => {
                    if (typeof audience === 'string' && (audience.startsWith('{') || audience.startsWith('['))) {
                      try {
                        const audienceObj = JSON.parse(audience);
                        return audienceObj.name || audience;
                      } catch {
                        return audience;
                      }
                    }
                    return audience;
                  });
                }
              } catch (e) {
                console.log('Could not parse audience_custom_audiences as JSON, using as string');
              }
            }
          }
        }
        
        // Handle audience countries - don't try to parse as JSON if it's a string
        let countries = [];
        if (ad.audience_countries) {
          // Check if it's already an array
          if (Array.isArray(ad.audience_countries)) {
            countries = ad.audience_countries;
          } else if (typeof ad.audience_countries === 'string') {
            // If it's a comma-separated string
            if (ad.audience_countries.includes(',')) {
              countries = ad.audience_countries.split(',').map(c => c.trim());
            } else {
              // Just a single value
              countries = [ad.audience_countries];
            }
            
            // Try to parse as JSON only if it looks like JSON
            if (ad.audience_countries.startsWith('{') || ad.audience_countries.startsWith('[')) {
              try {
                countries = JSON.parse(ad.audience_countries);
              } catch (e) {
                console.log('Could not parse audience_countries as JSON, using as string');
              }
            }
          }
        }
        
        adSetMap[adSetId].ads.push({
          id: ad.id,
          name: ad.name,
          imageUrl: ad.thumbnail_url,
          body: ad.message,
          funnel_segment: ad.funnel_segment,
          customAudiences: customAudiences,
          demographics: {
            age_min: ad.audience_age_min,
            age_max: ad.audience_age_max,
            countries: countries
          },
          metrics: {
            ctr: ad.ctr,
            cpc: ad.cpc,
            impressions: ad.impressions,
            reach: ad.reach,
            spend: ad.spend,
            frequency: ad.frequency,
            roas: ad.roas
          },
          launch_date: ad.launch_date,
          objective: ad.objective
        });
      }
    });
    
    // For ad sets without explicit mappings, mark them as uncategorized
    Object.keys(adSetMap).forEach(adSetId => {
      // Skip if already has explicit mappings
      if (adSetMap[adSetId].stages.length > 0) {
        return;
      }
      
      // Mark as uncategorized
      adSetMap[adSetId].stages = ["Uncategorized"];
    });

    // Convert to array and include all ads per ad set
    // Also calculate derived metrics like CTR and CPC from aggregated values
    const result = Object.values(adSetMap).map((adSet: any) => {
      // Calculate CTR from clicks and impressions if available
      if (adSet.metrics.clicks > 0 && adSet.metrics.impressions > 0) {
        const ctr = (adSet.metrics.clicks / adSet.metrics.impressions) * 100;
        adSet.metrics.ctr = ctr.toFixed(2);
      }
      
      // Calculate CPC from spend and clicks if available
      if (adSet.metrics.spend > 0 && adSet.metrics.clicks > 0) {
        const cpc = adSet.metrics.spend / adSet.metrics.clicks;
        adSet.metrics.cpc = cpc.toFixed(2);
      }
      
      // Format spend as currency
      if (adSet.metrics.spend > 0) {
        adSet.metrics.spend = adSet.metrics.spend.toFixed(2);
      }
      
      // Format other metrics for display
      if (adSet.metrics.impressions > 0) {
        adSet.metrics.impressions = adSet.metrics.impressions.toLocaleString();
      }
      
      if (adSet.metrics.reach > 0) {
        adSet.metrics.reach = adSet.metrics.reach.toLocaleString();
      }
      
      return {
        ...adSet,
        ads: adSet.ads // Return all ads for each ad set
      };
    });

    // Group ad sets by funnel stage
    const funnelData = defaultFunnelStages.map(stage => {
      const adSetsInStage = result.filter((adSet: any) => 
        adSet.stages.includes(stage)
      );
      
      return {
        stage,
        adSets: adSetsInStage
      };
    });

    // Add "Uncategorized" stage for ad sets with Uncategorized mapping
    const uncategorizedAdSets = result.filter((adSet: any) => 
      adSet.stages.includes('Uncategorized')
    );
    
    if (uncategorizedAdSets.length > 0) {
      funnelData.push({
        stage: 'Uncategorized',
        adSets: uncategorizedAdSets
      });
    }

    return NextResponse.json({
      funnelData,
      totalAdSets: result.length
    });

  } catch (error) {
    console.error('Error in GET /api/ad-sets-with-ads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ad sets with ads' },
      { status: 500 }
    );
  }
}
