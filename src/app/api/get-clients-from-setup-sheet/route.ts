import { NextResponse } from 'next/server';
import { sheetsServer } from '@/lib/server/sheets';

// Sheet ID for the master configuration sheet
const MASTER_SHEET_ID = '19T1P8-mhUW2uRqWmhDTc8M9hVu8bc4njk7RC6Kvze9g';
const SHEET_NAME = 'Sheet1';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // console.log('Fetching data from sheet:', MASTER_SHEET_ID);
    const data = await sheetsServer.getSheetData(MASTER_SHEET_ID, SHEET_NAME);
    // console.log('Raw data from sheet:', data);
    
    // Transform the data into ClientData format
    const clients = data
      .filter(row => row['Mode'] === 'Active')  // Only get Weekly Fetch clients
      .map(row => ({
        client: row['Client'] || '',
        databaseSheetId: row['Database Sheet ID'] || '',
        databaseFolderId: row['Database Folder ID'] || '',
        mode: row['Mode'] || 'manual'
      }))
      .filter(client => client.client && client.databaseSheetId);

    // console.log('Processed clients:', clients);
    return NextResponse.json(clients);
  } catch (error) {
    // console.error('Error in clients API:', error);
    if (error instanceof Error) {
      // console.error('Error details:', error.message);
      // console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
} 