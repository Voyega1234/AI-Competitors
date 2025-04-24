import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseClient'; // Import the Supabase client


// Define the expected shape of the data from Supabase
interface ClientNameResult {
  clientName: string | null;
}

export async function GET() {
  console.log("Attempting to handle GET /api/clients using Supabase");
  try {
    // Fetch distinct client names using Supabase
    const { data, error } = await supabaseAdmin
      .from('AnalysisRun') // Ensure 'AnalysisRun' matches your table name
      .select('clientName', { head: false, count: 'exact' })
      .order('clientName', { ascending: true });

    if (error) {
      console.error("Supabase error fetching client names:", error);
      throw new Error(error.message || 'Failed to fetch from Supabase');
    }

    // Process the results
    const clientNames = (data || []).map((item: ClientNameResult) => item.clientName)
                                  // Filter out null or empty names directly
                                  .filter((name: string | null): name is string => name != null && name.trim() !== '');
    
    const uniqueClientNames = Array.from(new Set(clientNames));

    console.log("Found unique client names:", uniqueClientNames); 

    return NextResponse.json({ clients: uniqueClientNames });

  } catch (error: any) {
    console.error("Error in GET /api/clients:", error); 
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Failed to fetch client names' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } 
} 