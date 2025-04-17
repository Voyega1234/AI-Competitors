import { NextResponse } from 'next/server';
import { sheetsServer } from '@/lib/server/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json(
        { error: 'Missing folderId parameter' },
        { status: 400 }
      );
    }

    const files = await sheetsServer.listFilesInFolder(folderId);
    return NextResponse.json(files);
  } catch (error) {
    // console.error('Error in list-files API:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
} 