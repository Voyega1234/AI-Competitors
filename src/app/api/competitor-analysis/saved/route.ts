import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientName = searchParams.get('client')
  const productFocus = searchParams.get('product')

  if (!clientName || !productFocus) {
    return new NextResponse('Missing parameters', { status: 400 })
  }
  
  const { data, error } = await supabaseAdmin
    .from('competitor_analysis')
    .select('analysis_data')
    .eq('client_name', clientName)
    .eq('product_focus', productFocus)
    .single()

  if (error || !data) {
    return new NextResponse('Not found', { status: 404 })
  }

  return NextResponse.json(data.analysis_data)
}
