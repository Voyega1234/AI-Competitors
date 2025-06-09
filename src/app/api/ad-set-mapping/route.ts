import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ad_account_id, mappings } = body;
    // We'll use ad_account_id from the request but store it as ad_account in the database
    const adAccount = ad_account_id;

    if (!adAccount) {
      return NextResponse.json(
        { error: 'ad_account_id is required' },
        { status: 400 }
      );
    }

    if (!mappings || !Array.isArray(mappings)) {
      return new NextResponse(
        JSON.stringify({ error: 'mappings must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Saving ad set mappings for ad account: ${adAccount}`);

    // First delete existing mappings for this ad account
    const { error: deleteError } = await supabase
      .from('ad_set_funnel_mappings')
      .delete()
      .eq('ad_account', adAccount);

    if (deleteError) {
      console.error('Error deleting existing ad set mappings:', deleteError);
      // If the table doesn't exist, create it
      if (deleteError.code === '42P01') { // PostgreSQL code for 'relation does not exist'
        console.log(`Table 'ad_set_funnel_mappings' does not exist, creating it`);
        
        // Create the table
        const { error: createError } = await supabase.rpc('create_ad_set_funnel_mappings_table');
        
        if (createError) {
          console.error('Error creating ad_set_funnel_mappings table:', createError);
          // Continue anyway, as the insert might create the table
        }
      } else {
        throw new Error('Failed to delete existing ad set mappings');
      }
    }

    // Insert new mappings
    const mappingsToInsert = mappings.flatMap(mapping => {
      if (!mapping.stages || mapping.stages.length === 0) {
        return [];
      }
      
      return mapping.stages.map((stage: string) => ({
        ad_account: adAccount,
        ad_set_id: mapping.ad_set_id,
        ad_set_name: mapping.ad_set,
        funnel_stage: stage
      }));
    });

    if (mappingsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('ad_set_funnel_mappings')
        .insert(mappingsToInsert);

      if (insertError) {
        console.error('Error inserting ad set mappings:', insertError);
        throw new Error('Failed to insert ad set mappings');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/ad-set-mapping:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the ad account ID from the query parameters
    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get('adAccountId');

    console.log(`Fetching ad set mappings for ad account: ${adAccountId}`);

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'adAccountId query parameter is required' },
        { status: 400 }
      );
    }

    // Query the database for ad set mappings associated with this ad account
    const { data, error: dbError } = await supabase
      .from('ad_set_funnel_mappings')
      .select('*')
      .eq('ad_account', adAccountId);

    if (dbError) {
      console.error('Error fetching ad set mappings:', dbError);
      
      // If the table doesn't exist, return empty mappings instead of an error
      if (dbError.code === '42P01') { // PostgreSQL code for 'relation does not exist'
        console.log(`Table 'ad_set_funnel_mappings' does not exist, returning empty mappings`);
        return NextResponse.json([]);
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch ad set mappings from database' },
        { status: 500 }
      );
    }

    // Group mappings by ad_set_id
    const groupedMappings = data?.reduce((acc: Record<string, any>, mapping) => {
      if (!acc[mapping.ad_set_id]) {
        acc[mapping.ad_set_id] = {
          ad_set_id: mapping.ad_set_id,
          ad_set: mapping.ad_set_name,
          stages: []
        };
      }
      acc[mapping.ad_set_id].stages.push(mapping.funnel_stage);
      return acc;
    }, {});

    // Convert the map back to an array
    const mappings = groupedMappings ? Object.values(groupedMappings) : [];

    console.log(`Found mappings for ${mappings.length} ad sets for ad account: ${adAccountId}`);
    return NextResponse.json(mappings);

  } catch (error) {
    console.error('Error in GET /api/ad-set-mapping:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ad set mappings' },
      { status: 500 }
    );
  }
}
