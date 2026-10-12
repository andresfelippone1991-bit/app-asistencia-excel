import { ApiResponse, AttendanceStatus, Student } from '../types';
import { extractSpreadsheetId } from '../utils/sheetParser';
import { googleAuthService } from './googleAuthService';
import { googleSheetsApiService } from './googleSheetsApiService';

export interface SaveAttendancePayload {
  appsScriptUrl?: string;
  spreadsheetId: string;
  sheetName: string;
  date: string;
  dateRow: number;
  startColumn: string;
  records: Record<string, AttendanceStatus>;
  overwrite?: boolean;
}

/**
 * Execute request to Google Apps Script Web App (Fallback mode)
 */
async function callAppsScript<T = any>(
  url: string,
  data: Record<string, any>
): Promise<ApiResponse<T>> {
  if (!url || !url.trim()) {
    throw new Error('No se ha configurado la URL de Google Apps Script ni se ha iniciado sesión con Google.');
  }

  const cleanUrl = url.trim();

  try {
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
      if (text.includes('accounts.google.com') || text.includes('Sign in')) {
        throw new Error(
          'Google Apps Script requiere inicio de sesión. Elige: "¿Quién tiene acceso? -> Cualquiera (Anyone)".'
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
        'No se pudo conectar con Google Apps Script. Verifica la URL o inicia sesión directamente con Google.'
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
    const auth = googleAuthService.getState();
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

    // If logged in with Google, use direct Google Sheets API v4!
    if (auth.isAuthenticated && auth.accessToken) {
      return googleSheetsApiService.getSpreadsheetInfo(spreadsheetId, auth.accessToken);
    }

    // Otherwise use Apps Script
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
   * Fetch students from Column A of the sheet
   */
  async fetchStudents(
    appsScriptUrl: string,
    spreadsheetIdOrUrl: string,
    sheetName: string = 'Asistencia',
    startRow: number = 4,
    nameColumn: string = 'A'
  ): Promise<Student[]> {
    const auth = googleAuthService.getState();
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

    // 1. Direct Google Sheets API v4 (Preferred: Instant, no Apps Script)
    if (auth.isAuthenticated && auth.accessToken) {
      return googleSheetsApiService.fetchStudents(
        spreadsheetId,
        sheetName,
        startRow,
        nameColumn,
        auth.accessToken
      );
    }

    // 2. Apps Script Fallback
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
   * Save date and attendance
   */
  async saveAttendance(payload: SaveAttendancePayload): Promise<{
    columnLetter: string;
    totalUpdated: number;
    message: string;
  }> {
    const auth = googleAuthService.getState();
    const spreadsheetId = extractSpreadsheetId(payload.spreadsheetId);

    // 1. Direct Google Sheets API v4 (Instant, no Apps Script)
    if (auth.isAuthenticated && auth.accessToken) {
      return googleSheetsApiService.saveAttendance(
        spreadsheetId,
        payload.sheetName || 'Asistencia',
        payload.date,
        payload.dateRow || 3,
        payload.startColumn || 'C',
        payload.records,
        auth.accessToken
      );
    }

    // 2. Apps Script Fallback
    const res = await callAppsScript(payload.appsScriptUrl || '', {
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
};
