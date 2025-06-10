import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Define the payload interface for funnel stages
interface FunnelStagesPayload {
  client_name: string;
  product_focus: string;
  stage_funnel: string[];
  ad_account_id?: string;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
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
      // If the table doesn't exist, return default stages instead of throwing an error
      if (error.code === '42P01') { // PostgreSQL code for 'relation does not exist'
        console.log(`Table 'funnel_stages' does not exist, returning default stages`);
        return NextResponse.json({
          stages: ["Evaluation", "Consideration", "Conversion"],
          isDefault: true
        });
      }
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
    console.error('Error in /api/funnel-stages GET:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const payload: FunnelStagesPayload = await request.json();
    
    // Validate the payload
    if (!payload.client_name || !payload.product_focus || !Array.isArray(payload.stage_funnel) || payload.stage_funnel.length === 0) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid payload. Required fields: client_name, product_focus, and non-empty stage_funnel array' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received funnel stages submission:', payload);
    
    // Create a record in the funnel_configurations table
    const funnelConfigId = uuidv4();
    const { error: insertError } = await supabase
      .from('funnel_configurations')
      .insert({
        id: funnelConfigId,
        client_name: payload.client_name,
        product_focus: payload.product_focus,
        ad_account_id: payload.ad_account_id || null,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error inserting funnel configuration:', insertError);
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Failed to save funnel configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Insert each funnel stage with reference to the configuration
    const stageInserts = payload.stage_funnel.map((stageName, index) => ({
      id: uuidv4(),
      funnel_config_id: funnelConfigId,
      name: stageName,
      position: index,
      created_at: new Date().toISOString()
    }));
    
    const { error: stagesError } = await supabase
      .from('funnel_stages')
      .insert(stageInserts);
    
    if (stagesError) {
      console.error('Error inserting funnel stages:', stagesError);
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Failed to save funnel stages' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Funnel stages saved successfully',
      data: {
        funnel_config_id: funnelConfigId,
        client_name: payload.client_name,
        product_focus: payload.product_focus,
        stages: payload.stage_funnel
      }
    });
    
  } catch (error: any) {
    console.error('Error in /api/funnel-stages POST:', error);
    return new NextResponse(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
