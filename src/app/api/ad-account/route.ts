import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  // Extract clientName and productFocus from query parameters
  const searchParams = request.nextUrl.searchParams;
  const clientName = searchParams.get('clientName');
  const productFocus = searchParams.get('productFocus');

  console.log(`Fetching ad account for client: ${clientName}, product: ${productFocus}`);

  if (!clientName || !productFocus) {
    return new NextResponse(
      JSON.stringify({ error: 'Both clientName and productFocus query parameters are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const trimmedClientName = clientName.trim();
    const trimmedProductFocus = productFocus.trim();
    
    console.log('Querying AnalysisRun table with:', { 
      clientName: trimmedClientName,
      productFocus: trimmedProductFocus
    });
    
    // First, get all clients to find a match
    const { data: allClients, error: clientsError } = await supabaseAdmin
      .from('AnalysisRun')
      .select('clientName')
      .order('createdAt', { ascending: false });
      
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      throw new Error('Failed to fetch clients');
    }
    
    // Find the best matching client (case insensitive, partial match)
    const matchingClient = allClients?.find(c => 
      c.clientName?.toLowerCase().includes(trimmedClientName.toLowerCase()) ||
      trimmedClientName.toLowerCase().includes(c.clientName?.toLowerCase() || '')
    );
    
    if (!matchingClient) {
      console.warn(`No matching client found for: ${trimmedClientName}`);
      return NextResponse.json({ 
        error: 'Client not found',
        availableClients: allClients?.map(c => c.clientName).filter(Boolean)
      }, { status: 404 });
    }
    
    console.log(`Found matching client: ${matchingClient.clientName}`);
    
    // Now get the most recent record for this client
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('AnalysisRun')
      .select('*')
      .ilike('clientName', `%${matchingClient.clientName}%`)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (clientError) {
      console.error('Error fetching client data:', clientError);
      throw new Error('Failed to fetch client data');
    }
    
    if (!clientData) {
      console.warn(`No data found for client: ${matchingClient.clientName}`);
      return NextResponse.json({ ad_account_id: null });
    }
    
    console.log('Found client data:', {
      clientName: clientData.clientName,
      productFocus: clientData.productFocus,
      hasAdAccountId: Boolean(clientData.ad_account_id)
    });
    
    // Return the ad account ID if it exists
    const adAccountId = clientData.ad_account_id || clientData.adAccountId || clientData.adaccountid || clientData.ad_account;
    
    console.log(`Found ad account: ${adAccountId}`);
    return NextResponse.json({ ad_account_id: adAccountId });

  } catch (error: any) {
    console.error('Error in /api/ad-account:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
