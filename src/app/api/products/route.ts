import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseClient'; // Import the Supabase client

// Define the expected shape of the data from Supabase
interface ProductFocusResult {
  productFocus: string | null;
}

export async function GET(request: NextRequest) {
  // Extract clientName from query parameters
  const searchParams = request.nextUrl.searchParams;
  const clientName = searchParams.get('clientName');

  console.log(`Attempting to handle GET /api/products for client: ${clientName} using Supabase`);

  if (!clientName) {
    return new NextResponse(
      JSON.stringify({ error: 'clientName query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fetch distinct product focuses for the given client using Supabase
    const { data, error } = await supabaseAdmin
      .from('AnalysisRun') // Ensure 'AnalysisRun' matches your table name
      .select('productFocus', { head: false, count: 'exact' })
      .eq('clientName', clientName) // Filter by clientName
      .order('productFocus', { ascending: true });

    if (error) {
      console.error(`Supabase error fetching products for ${clientName}:`, error);
      throw new Error(error.message || 'Failed to fetch products from Supabase');
    }

    // Process the results
    const productFocuses = (data || []).map((item: ProductFocusResult) => item.productFocus);
                                    
    // Get unique focuses (select distinct isn't directly supported, do it manually)
    // Also handle potential nulls explicitly
    const uniqueProductFocuses = Array.from(new Set(productFocuses));

    console.log(`Found unique products for ${clientName}:`, uniqueProductFocuses);

    // Note: The frontend expects nulls to be represented, don't filter them here unless intended
    return NextResponse.json({ products: uniqueProductFocuses });

  } catch (error: any) {
    console.error(`Error in GET /api/products for ${clientName}:`, error);
    return new NextResponse(
      JSON.stringify({ error: error.message || `Failed to fetch products for ${clientName}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // No finally block needed for Prisma disconnect
} 