import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseClient'; // Import Supabase client


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const runId = searchParams.get('runId');

  console.log(`Attempting to handle GET /api/competitors for runId: ${runId}`);

  if (!runId) {
    return new NextResponse(
      JSON.stringify({ error: 'runId query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fetch competitors associated with the given analysisRunId using Supabase
    const { data: competitors, error } = await supabaseAdmin
      .from('Competitor') // Ensure 'Competitor' matches your Supabase table name
      .select('*')
      .eq('analysisRunId', runId)
      .order('name', { ascending: true }); // Optional ordering

    if (error) {
      console.error(`Supabase error fetching Competitors for runId ${runId}:`, error);
      throw new Error(error.message || 'Failed to fetch competitor data from Supabase');
    }

    console.log(`Found ${competitors?.length ?? 0} competitors for runId: ${runId}`);

    // The frontend expects the data in a specific format: { competitors: [...] }
    return NextResponse.json({ competitors: competitors || [] }); // Return empty array if null

  } catch (error) {
    console.error(`Error in GET /api/competitors for runId ${runId}:`, error);
    return new NextResponse(
      JSON.stringify({ error: `Failed to fetch competitors for run ${runId}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {

  }
} 