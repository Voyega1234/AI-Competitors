import { NextResponse } from 'next/server';
import { sheetsServer } from '@/lib/server/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const fileName = searchParams.get('fileName');

    if (!folderId || !fileName) {
      // console.log('Missing required parameters:', { folderId, fileName });
      return NextResponse.json(
        { error: 'Missing required parameters', details: { folderId, fileName } },
        { status: 400 }
      );
    }

    // console.log('Reading JSON file:', fileName, 'from folder:', folderId);
    
    // Get the file content from Google Drive
    const fileContent = await sheetsServer.readJsonFromDrive(folderId, fileName);
    
    if (!fileContent) {
      // console.log('No file content found');
      return NextResponse.json(
        { error: 'File not found', details: { folderId, fileName } },
        { status: 404 }
      );
    }

    // console.log('Successfully read JSON file');
    return NextResponse.json(fileContent);
  } catch (error) {
    // console.error('Error in read-json API:', error);
    if (error instanceof Error) {
      // console.error('Error details:', error.message);
      // console.error('Stack trace:', error.stack);
      // console.error('Error name:', error.name);
      // console.error('Error cause:', error.cause);
    }
    return NextResponse.json(
      { 
        error: 'Failed to read JSON file', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 