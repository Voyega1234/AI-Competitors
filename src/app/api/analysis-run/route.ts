import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseClient'; // Import the Supabase client


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientName = searchParams.get('clientName');
  const productFocus = searchParams.get('productFocus'); // Stays as string or null

  console.log(`Attempting to handle GET /api/analysis-run for client: ${clientName}, product: ${productFocus} using Supabase`);

  if (!clientName) {
    return new NextResponse(
      JSON.stringify({ error: 'clientName query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Construct the query
    let query = supabaseAdmin
      .from('AnalysisRun') // Ensure 'AnalysisRun' matches your table name
      .select('id')
      .eq('clientName', clientName);

    // Handle null productFocus using Supabase methods
    if (productFocus === null) {
      // query = query.is('productFocus', null); // Check for NULL in the database
      // Check for empty string OR NULL when the parameter is not provided
      query = query.or('productFocus.eq.,productFocus.is.null') 
    } else {
      query = query.eq('productFocus', productFocus); // Check for specific string
    }

    // Execute the query to get the first matching run
    // .single() returns one object or null, and throws error if > 1 row found (which is fine here)
    const { data: analysisRun, error } = await query.limit(1).single();

    // Check for errors, but ignore the "Row not found" error (PGRST116) as we handle it explicitly
    if (error && error.code !== 'PGRST116') {
        console.error(`Supabase error fetching analysis run for ${clientName}, ${productFocus}:`, error);
        throw new Error(error.message || 'Failed to fetch analysis run from Supabase');
    }

    // If no run was found (either data is null or PGRST116 error occurred)
    if (!analysisRun) {
      console.log(`No analysis run found for client: ${clientName}, product: ${productFocus}`);
      return new NextResponse(
        JSON.stringify({ error: 'Analysis run not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If found, return the ID
    console.log(`Found analysis run ID: ${analysisRun.id}`);
    return NextResponse.json({ id: analysisRun.id });

  } catch (error: any) {
    console.error(`Error in GET /api/analysis-run for ${clientName}, ${productFocus}:`, error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Failed to fetch analysis run ID' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 