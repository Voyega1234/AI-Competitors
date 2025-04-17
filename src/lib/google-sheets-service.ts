export interface ClientData {
  client: string;
  databaseSheetId: string;
  databaseFolderId: string;
  mode: string;
}

export interface BrandData {
  brand: string;
  pageName: string;
  pageUrl: string;
}

export class GoogleSheetsService {
  async getWeeklyFetchClients(): Promise<ClientData[]> {
    try {
      const response = await fetch('/api/get-clients-from-setup-sheet');
      if (!response.ok) {
        throw new Error('Failed to fetch clients from setup sheet');
      }
      return await response.json();
    } catch (error) {
      // console.error('Error fetching clients:', error);
      throw error;
    }
  }

  async getBrandsListFromSheet(databaseSheetId: string): Promise<BrandData[]> {
    try {
      const response = await fetch(`/api/brands-list?sheetId=${databaseSheetId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      return await response.json();
    } catch (error) {
      // console.error('Error fetching brands:', error);
      throw error;
    }
  }

  async getSheetData(sheetId: string, sheetName: string): Promise<Record<string, string>[]> {
    try {
      const response = await fetch(`/api/sheet-data?sheetId=${sheetId}&sheetName=${sheetName}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sheet data');
      }
      return await response.json();
    } catch (error) {
      // console.error('Error fetching sheet data:', error);
      throw error;
    }
  }

  async appendToSheet(sheetId: string, sheetName: string, data: Record<string, string>[]): Promise<void> {
    try {
      const response = await fetch('/api/append-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetId,
          sheetName,
          data,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to append data to sheet');
      }
    } catch (error) {
      // console.error('Error appending to sheet:', error);
      throw error;
    }
  }

  async readJsonFromDrive(folderId: string, fileName: string): Promise<any> {
    try {
      const response = await fetch(`/api/read-json?folderId=${folderId}&fileName=${fileName}`);
      if (!response.ok) {
        throw new Error('Failed to read JSON file');
      }
      return await response.json();
    } catch (error) {
      // console.error('Error reading JSON file:', error);
      throw error;
    }
  }

  async listFilesInFolder(folderId: string): Promise<{ name: string; modifiedTime: string }[]> {
    try {
      const response = await fetch(`/api/list-files?folderId=${folderId}`);
      if (!response.ok) {
        throw new Error('Failed to list files');
      }
      return await response.json();
    } catch (error) {
      // console.error('Error listing files:', error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService(); 