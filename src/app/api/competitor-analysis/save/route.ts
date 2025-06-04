import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseClient'

export async function POST(request: Request) {
  // Use the existing supabaseAdmin client from supabaseClient.ts
  const { clientName, productFocus, analysisData } = await request.json()

  if (!clientName || !productFocus || !analysisData) {
    return new NextResponse('Missing data', { status: 400 })
  }

  try {
    // Delete existing analysis for this client+product
    await supabaseAdmin
      .from('competitor_analysis')
      .delete()
      .eq('client_name', clientName)
      .eq('product_focus', productFocus)

    // Insert new analysis
    const { data, error } = await supabaseAdmin
      .from('competitor_analysis')
      .insert([{
        client_name: clientName,
        product_focus: productFocus,
        analysis_data: analysisData
      }])
      .select()

    if (error) throw error
    return NextResponse.json(data[0])

  } catch (error) {
    console.error('Save error:', error)
    return new NextResponse('Save failed', { status: 500 })
  }
}
