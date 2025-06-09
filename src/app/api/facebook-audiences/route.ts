import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * API route to fetch Facebook custom audiences for a specific ad account
 * This connects to our database to retrieve audience data
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

    // Query the database for audiences matching the ad account ID
    const { data: audiences, error: dbError } = await supabase
      .from('facebook_custom_audiences')
      .select('*')
      .eq('ad_account_id', adAccountId);
      
    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch audiences from database' },
        { status: 500 }
      );
    }
    
    // Return the audiences from the database, or an empty array if none found
    return NextResponse.json(audiences || []);

  } catch (error) {
    console.error('Error fetching Facebook audiences:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch audiences' },
      { status: 500 }
    );
  }
}
