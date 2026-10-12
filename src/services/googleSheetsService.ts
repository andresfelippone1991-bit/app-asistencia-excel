import { ApiResponse, AttendanceStatus, Student } from '../types';
import { extractSpreadsheetId } from '../utils/sheetParser';

export interface SaveAttendancePayload {
  appsScriptUrl: string;
  spreadsheetId: string;
  sheetName: string;
  date: string;
  dateRow: number;
  startColumn: string;
  records: Record<string, AttendanceStatus>;
  overwrite?: boolean;
}

/**
 * Execute request to Google Apps Script Web App
 */
async function callAppsScript<T = any>(
  url: string,
  data: Record<string, any>
): Promise<ApiResponse<T>> {
  if (!url || !url.trim()) {
    throw new Error('No se ha configurado la URL de Google Apps Script. Ve a Configuración para agregarla.');
  }

  const cleanUrl = url.trim();

  try {
    // Send using text/plain to avoid CORS preflight OPTIONS rejection from Google Apps Script
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(text);
    } catch {
      // If response is HTML (often happens when Google login is required or permissions are restricted)
      if (text.includes('accounts.google.com') || text.includes('Sign in')) {
        throw new Error(
          'Google Apps Script requiere inicio de sesión. Al implementar la aplicación web, debes elegir: "¿Quién tiene acceso? -> Cualquiera (Anyone)".'
        );
      }
      throw new Error(`Respuesta no válida del servidor: ${text.slice(0, 150)}...`);
    }

    if (json.status === 'error') {
      throw new Error(json.message || 'Error desconocido al interactuar con Google Sheets');
    }

    return json;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(
        'No se pudo conectar con Google Apps Script. Verifica que la URL sea correcta y que la implementación tenga acceso "Cualquiera".'
      );
    }
    throw error;
  }
}

export const googleSheetsService = {
  /**
   * Test connection with a Google Sheet
   */
  async testConnection(
    appsScriptUrl: string,
    spreadsheetIdOrUrl: string
  ): Promise<{ title: string; sheets: string[] }> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    const res = await callAppsScript(appsScriptUrl, {
      action: 'test',
      spreadsheetId,
    });

    return {
      title: res.spreadsheetTitle || 'Planilla de Asistencia',
      sheets: res.sheets || [],
    };
  },

  /**
   * Fetch students from Column A (or configured column) of the sheet
   */
  async fetchStudents(
    appsScriptUrl: string,
    spreadsheetIdOrUrl: string,
    sheetName: string = 'Asistencia',
    startRow: number = 4,
    nameColumn: string = 'A'
  ): Promise<Student[]> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    const res = await callAppsScript(appsScriptUrl, {
      action: 'getStudents',
      spreadsheetId,
      sheetName,
      startRow,
      nameColumn,
    });

    if (!res.students || !Array.isArray(res.students)) {
      return [];
    }

    return res.students.map((s, index) => ({
      id: `row_${s.row || startRow + index}`,
      row: s.row || startRow + index,
      name: s.name,
      active: true,
    }));
  },

  /**
   * Save date and attendance to the next available column (or overwrite existing date)
   */
  async saveAttendance(payload: SaveAttendancePayload): Promise<{
    columnLetter: string;
    totalUpdated: number;
    message: string;
  }> {
    const spreadsheetId = extractSpreadsheetId(payload.spreadsheetId);
    const res = await callAppsScript(payload.appsScriptUrl, {
      action: 'saveAttendance',
      spreadsheetId,
      sheetName: payload.sheetName || 'Asistencia',
      date: payload.date,
      dateRow: payload.dateRow || 3,
      startColumn: payload.startColumn || 'C',
      records: payload.records,
      overwrite: payload.overwrite ?? true,
    });

    return {
      columnLetter: res.columnLetter || 'C',
      totalUpdated: (res as any).totalUpdated || Object.keys(payload.records).length,
      message: res.message || 'Asistencia registrada con éxito',
    };
  },

  /**
   * Get past recorded dates
   */
  async fetchHistory(
    appsScriptUrl: string,
    spreadsheetIdOrUrl: string,
    sheetName: string = 'Asistencia',
    dateRow: number = 3,
    startColumn: string = 'C'
  ): Promise<Array<{ date: string; column: number; columnLetter: string }>> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    const res = await callAppsScript(appsScriptUrl, {
      action: 'getHistory',
      spreadsheetId,
      sheetName,
      dateRow,
      startColumn,
    });

    return (res as any).dates || [];
  },
};
