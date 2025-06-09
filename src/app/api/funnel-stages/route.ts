import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  // Extract adAccountId from query parameters
  const searchParams = request.nextUrl.searchParams;
  const adAccountId = searchParams.get('adAccountId');

  console.log(`Fetching funnel stages for ad account: ${adAccountId}`);

  if (!adAccountId) {
    return new NextResponse(
      JSON.stringify({ error: 'adAccountId query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Query the database for funnel stages associated with this ad account
    const { data, error } = await supabase
      .from('funnel_stages')
      .select('*')
      .eq('ad_account_id', adAccountId);

    if (error) {
      console.error('Error fetching funnel stages:', error);
      throw new Error('Failed to fetch funnel stages');
    }

    // If no funnel stages found for this ad account, return default stages
    if (!data || data.length === 0) {
      console.log(`No funnel stages found for ad account: ${adAccountId}, returning defaults`);
      return NextResponse.json({
        stages: ["Evaluation", "Consideration", "Conversion"],
        isDefault: true
      });
    }

    // Return the funnel stages
    console.log(`Found ${data.length} funnel stages for ad account: ${adAccountId}`);
    return NextResponse.json({
      stages: data.map(stage => stage.name),
      isDefault: false
    });

  } catch (error: any) {
    console.error('Error in /api/funnel-stages:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
