import { NextResponse } from 'next/server';
import { sheetsServer } from '@/lib/server/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheetId');
    const sheetName = searchParams.get('sheetName');

    if (!sheetId || !sheetName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const data = await sheetsServer.getSheetData(sheetId, sheetName);
    return NextResponse.json(data);
  } catch (error) {
    // console.error('Error in sheet-data API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sheet data' },
      { status: 500 }
    );
  }
} 