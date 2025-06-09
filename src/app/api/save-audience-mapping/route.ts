import { NextRequest, NextResponse } from 'next/server';

interface MappingData {
  audience_id: string;
  funnel_stages: string[];
  ad_account_id: string;
}

interface RequestBody {
  mappings: MappingData[];
}

/**
 * API route to save audience to funnel stage mappings
 * This connects to our database to store the mapping data
 */
export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    
    if (!body.mappings || !Array.isArray(body.mappings) || body.mappings.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an array of mappings.' },
        { status: 400 }
      );
    }

    // Validate each mapping
    for (const mapping of body.mappings) {
      if (!mapping.audience_id || !mapping.ad_account_id) {
        return NextResponse.json(
          { error: 'Each mapping must include audience_id and ad_account_id' },
          { status: 400 }
        );
      }
      
      if (!Array.isArray(mapping.funnel_stages)) {
        return NextResponse.json(
          { error: 'funnel_stages must be an array' },
          { status: 400 }
        );
      }
    }

    // In a real implementation, we would save to our database
    // For now, we'll just log the data and return success
    console.log('Saving audience mappings:', JSON.stringify(body.mappings, null, 2));
    
    // Simulate a database operation
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Audience mappings saved successfully',
      count: body.mappings.length
    });
  } catch (error) {
    console.error('Error saving audience mappings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save audience mappings' },
      { status: 500 }
    );
  }
}
