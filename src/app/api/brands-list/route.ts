import { NextResponse } from 'next/server';
import { sheetsServer } from '@/lib/server/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheetId');

    if (!sheetId) {
      // console.log('Missing sheet ID parameter');
      return NextResponse.json(
        { error: 'Missing sheet ID parameter' },
        { status: 400 }
      );
    }

    // console.log('Fetching brands from sheet:', sheetId);
    
    // Get the specific ranges we need
    const brandNames = await sheetsServer.getCellRange(sheetId, 'Brand Setup!A4:A9');
    const pageUrls = await sheetsServer.getCellRange(sheetId, 'Brand Setup!C4:C9');
    
    // console.log('Raw data from sheet:', { brandNames, pageUrls });

    // Combine the ranges into brand objects
    const brands = [];
    for (let i = 0; i < 6; i++) { // We're looking at 6 rows (4-9)
      const brand = brandNames[i]?.[0];
      const pageUrl = pageUrls[i]?.[0];

      if (brand && pageUrl) { // Only include if both brand and URL exist
        brands.push({
          brand,
          pageName: '', // Page name is optional
          pageUrl: pageUrl.replace('https://', '').replace('www.', '') // Clean up URL format
        });
      }
    }

    // console.log('Processed brands:', brands);
    return NextResponse.json(brands);
  } catch (error) {
    // console.error('Error in brands API:', error);
    if (error instanceof Error) {
      // console.error('Error details:', error.message);
      // console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
} 