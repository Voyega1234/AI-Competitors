import { google } from 'googleapis';
import path from 'path';

export class GoogleSheetsServer {
  private sheets;
  private drive;

  constructor() {
    // Use the service account key file from the project root
    const keyFilePath = path.join(process.cwd(), 'competitve-listing-tool-sa.json');
    
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.drive = google.drive({ version: 'v3', auth });
  }

  // For sheets that use table format with headers (like master sheet)
  async getSheetData(sheetId: string, sheetName: string) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:Z`,
      });

      const rows = response.data.values || [];
      const headers = rows[0] as string[];
      return rows.slice(1).map((row: string[]) => {
        const obj: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
    } catch (error) {
      // console.error('Error in getSheetData:', error);
      throw error;
    }
  }

  // For getting specific cell ranges (like brand setup sheet)
  async getCellRange(sheetId: string, range: string) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      return response.data.values || [];
    } catch (error) {
      // console.error('Error in getCellRange:', error);
      throw error;
    }
  }

  async appendToSheet(sheetId: string, sheetName: string, data: Record<string, string>[]) {
    try {
      // Get the headers first
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!1:1`,
      });
      
      const headers = response.data.values?.[0] as string[] || [];
      
      // Transform data to match header order
      const rows = data.map(item => 
        headers.map(header => item[header] || '')
      );

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });
    } catch (error) {
      // console.error('Error in appendToSheet:', error);
      throw error;
    }
  }

  async readJsonFromDrive(folderId: string, fileName: string): Promise<any> {
    try {
      // Search for the file in the specified folder
      const response = await this.drive.files.list({
        q: `name = '${fileName}' and '${folderId}' in parents and mimeType = 'application/json'`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (!response.data.files || response.data.files.length === 0) {
        // console.log(`No JSON file found with name: ${fileName}`);
        return null;
      }

      const fileId = response.data.files[0].id;
      if (!fileId) {
        // console.log('No file ID found');
        return null;
      }

      // Get the file content
      const fileContent = await this.drive.files.get({
        fileId,
        alt: 'media'
      });

      // Log the response to debug
      // console.log('File content response:', JSON.stringify(fileContent, null, 2));

      // The response data is already parsed when using alt='media'
      if (typeof fileContent.data === 'string') {
        return JSON.parse(fileContent.data);
      } else {
        // If it's already an object, return it directly
        return fileContent.data;
      }
    } catch (error) {
      // console.error('Error reading JSON file from Drive:', error);
      if (error instanceof Error) {
        // console.error('Error details:', error.message);
        // console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  async listFilesInFolder(folderId: string): Promise<{ name: string; modifiedTime: string }[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/json'`,
        fields: 'files(name, modifiedTime)',
        orderBy: 'modifiedTime desc',
      });

      return response.data.files?.map(file => ({
        name: file.name || '',
        modifiedTime: file.modifiedTime || '',
      })) || [];
    } catch (error) {
      // console.error('Error listing files in folder:', error);
      throw error;
    }
  }
}

export const sheetsServer = new GoogleSheetsServer(); 