// export const allCreatives = [
// Creative data fetching functionality
// Fetches creatives from Supabase based on client name and product focus

import supabaseAdmin from './supabaseClient';

export type Creative = {
  id: string;
  name: string;
  objective: string;
  thumbnail_url: string;
  launch_date: string;
  clicks: string;
  impressions: string;
  reach: string;
  spend: string;
  ctr: string;
  roas: string;
  cpc: string;
  message: string;
  platform: string;
  creative_pillars: string;
  ad_account: string;
  frequency: string;
  funnel_segment?: string;
};

/**
 * Fetches creatives from Supabase based on client name and product focus
 * @param clientName The name of the client
 * @param productFocus The product focus
 * @returns Array of creatives
 */
export async function fetchCreatives(clientName: string, productFocus: string): Promise<Creative[]> {
  console.log('fetchCreatives called with:', { clientName, productFocus });
  
  if (!clientName || !productFocus) {
    const errorMsg = 'Missing clientName or productFocus in fetchCreatives';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log('1. Starting to fetch creatives for:', { clientName, productFocus });
  
  try {
    // First get the ad account ID
    const url = `/api/ad-account?clientName=${encodeURIComponent(clientName)}&productFocus=${encodeURIComponent(productFocus)}`;
    console.log('2. Fetching ad account from:', url);
    
    const adAccountResponse = await fetch(url);
    const responseText = await adAccountResponse.text();
    
    console.log('3. Ad account response status:', adAccountResponse.status);
    console.log('4. Ad account response text:', responseText);
    
    if (!adAccountResponse.ok) {
      // Try to parse error response
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        // If we can't parse the error, just use the status text
        throw new Error(`Failed to fetch ad account: ${adAccountResponse.status} ${adAccountResponse.statusText}`);
      }
      
      // If we have a custom error message, use it
      if (errorData.error) {
        // If we have available clients, include them in the error message
        if (errorData.availableClients?.length > 0) {
          throw new Error(`Client not found. Available clients: ${errorData.availableClients.join(', ')}`);
        }
        throw new Error(errorData.error);
      }
      
      throw new Error(`Failed to fetch ad account: ${adAccountResponse.status} ${JSON.stringify(errorData)}`);
    }
    
    // Parse the response text to get the ad account ID
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid response format from ad-account API');
    }
    
    const ad_account_id = responseData?.ad_account_id;
    console.log('5. Parsed ad account ID:', ad_account_id);
    
    if (!ad_account_id) {
      const errorMsg = `No ad account ID found for client: ${clientName}, product: ${productFocus}`;
      console.warn(errorMsg);
      // Return empty array instead of throwing to allow the UI to handle it gracefully
      return [];
    }
    
    // Now fetch creatives using the ad account ID
    console.log('6. Fetching creatives for ad account:', ad_account_id);
    
    const { data, error } = await supabaseAdmin
      .from('ads_details')
      .select('*')
      .eq('ad_account', ad_account_id);

    if (error) {
      console.error('7. Error fetching creatives from Supabase:', error);
      throw error;
    }

    console.log(`8. Successfully fetched ${data?.length || 0} creatives`);
    return (data || []) as Creative[];
  } catch (error) {
    console.error('Error in fetchCreatives:', error);
    throw error;
  }
}