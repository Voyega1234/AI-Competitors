import { NextResponse } from 'next/server';
import { sheetsServer } from '@/lib/server/sheets';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { sheetId, sheetName, data } = await request.json();

    if (!sheetId || !sheetName || !data) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    await sheetsServer.appendToSheet(sheetId, sheetName, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    // console.error('Error in append-sheet API:', error);
    return NextResponse.json(
      { error: 'Failed to append data to sheet' },
      { status: 500 }
    );
  }
} 