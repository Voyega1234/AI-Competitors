import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseClient'

interface AnalysisData {
  news?: Array<{title: string, summary: string}>;
  analysis?: {
    competitors?: Array<{
      id: string;
      name: string;
      // Exclude strengths and weaknesses from being saved
      [key: string]: any;
    }>;
    // Exclude these fields from analysis
    [key: string]: any;
  };
  market_trends?: {research: string[]};
  news_insights?: {research: string[]};
  [key: string]: any;
}

export async function POST(request: Request) {
  const { clientName, productFocus, analysisData } = await request.json()

  if (!clientName || !productFocus || !analysisData) {
    return new NextResponse('Missing data', { status: 400 })
  }

  try {
    // Extract and filter the data we want to keep
    const { news, analysis, market_trends, news_insights, ...rest } = analysisData as AnalysisData;
    
    // Filter out unwanted fields from analysis
    const filteredAnalysis = analysis ? {
      ...analysis,
      // Remove the fields we don't want to save
      strengths: undefined,
      weaknesses: undefined,
      market_gaps: undefined,
      shared_patterns: undefined,
      summary: undefined,
      differentiation_strategies: undefined,
      competitors: analysis.competitors?.map(competitor => ({
        ...competitor,
        strengths: undefined,
        weaknesses: undefined
      }))
    } : undefined;
    
    const filteredData: AnalysisData = {
      ...(news && { news }),
      ...(filteredAnalysis && { analysis: filteredAnalysis }),
      ...(market_trends && { market_trends }),
      ...(news_insights && { news_insights })
    };
    
    // Clean up any undefined values
    Object.keys(filteredData).forEach(key => 
      filteredData[key] === undefined && delete filteredData[key]
    );

    // Delete existing analysis for this client+product
    await supabaseAdmin
      .from('competitor_analysis')
      .delete()
      .eq('client_name', clientName)
      .eq('product_focus', productFocus)

    // Insert new analysis with filtered data
    const { data, error } = await supabaseAdmin
      .from('competitor_analysis')
      .insert([{
        client_name: clientName,
        product_focus: productFocus,
        analysis_data: filteredData
      }])
      .select()

    if (error) throw error
    return NextResponse.json(data[0])

  } catch (error) {
    console.error('Save error:', error)
    return new NextResponse('Save failed', { status: 500 })
  }
}
