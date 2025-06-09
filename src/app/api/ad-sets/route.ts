import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * API route to fetch ad sets for a specific ad account
 * This connects to the MCP database to retrieve ad set data
 */
export async function GET(request: NextRequest) {
  try {
    // Get the ad account ID from the query parameters
    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get('adAccountId');

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'Ad account ID is required' },
        { status: 400 }
      );
    }
    // Query the MCP database for ad sets associated with this ad account
    const { data, error: dbError } = await supabase
      .from('ads_details')
      .select('ad_set, ad_set_id')
      .eq('ad_account', adAccountId)
      .order('ad_set', { ascending: true });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch ad sets from database' },
        { status: 500 }
      );
    }

    // Remove duplicates by creating a map with ad_set_id as key
    const uniqueAdSets = data?.reduce((acc: Record<string, any>, current) => {
      if (!acc[current.ad_set_id]) {
        acc[current.ad_set_id] = current;
      }
      return acc;
    }, {});

    // Convert the map back to an array
    const adSets = uniqueAdSets ? Object.values(uniqueAdSets) : [];
    
    // Return the ad sets from the database, or an empty array if none found
    return NextResponse.json(adSets || []);

  } catch (error) {
    console.error('Error fetching ad sets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ad sets' },
      { status: 500 }
    );
  }
}
