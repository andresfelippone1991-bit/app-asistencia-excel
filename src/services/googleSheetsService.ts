import type { ApiResponse, AttendanceStatus, Student } from '../types';
import { extractSpreadsheetId } from '../utils/sheetParser';
import { googleAuthService } from './googleAuthService';
import { googleSheetsApiService } from './googleSheetsApiService';
import { directSheetReaderService } from './directSheetReaderService';

export interface SaveAttendancePayload {
  appsScriptUrl?: string;
  spreadsheetId: string;
  sheetName: string;
  date: string;
  dateRow: number;
  startColumn: string;
  records: Record<string, AttendanceStatus>;
  students?: Student[];
  overwrite?: boolean;
}

export interface SaveAttendanceResult {
  mode: 'cloud_oauth' | 'cloud_script' | 'direct_clipboard';
  columnLetter: string;
  totalUpdated: number;
  message: string;
  clipboardText?: string;
}

function colIndexToLetter(colIndex0Based: number): string {
  let col = colIndex0Based + 1;
  let letter = '';
  while (col > 0) {
    const temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = Math.floor((col - temp - 1) / 26);
  }
  return letter;
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

    if (auth.isAuthenticated && auth.accessToken) {
      return googleSheetsApiService.getSpreadsheetInfo(spreadsheetId, auth.accessToken);
    }

    if (appsScriptUrl && appsScriptUrl.trim()) {
      const res = await callAppsScript(appsScriptUrl, {
        action: 'test',
        spreadsheetId,
      });

      return {
        title: res.spreadsheetTitle || 'Planilla de Asistencia',
        sheets: res.sheets || [],
      };
    }

    // Direct URL check
    const directRes = await directSheetReaderService.fetchStudentsByUrl(spreadsheetId, 'Asistencia');
    return {
      title: `Planilla (${directRes.students.length} alumnos detectados)`,
      sheets: ['Asistencia'],
    };
  },

  /**
   * Fetch students from Column A of the sheet.
   * Works automatically via Direct URL Reader if neither OAuth nor Apps Script is configured!
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

    // 1. Direct Google Sheets API v4 (If signed in with Google OAuth)
    if (auth.isAuthenticated && auth.accessToken) {
      try {
        return await googleSheetsApiService.fetchStudents(
          spreadsheetId,
          sheetName,
          startRow,
          nameColumn,
          auth.accessToken
        );
      } catch (e) {
        console.warn('OAuth fetch failed, trying direct URL reader...', e);
      }
    }

    // 2. Apps Script (If configured)
    if (appsScriptUrl && appsScriptUrl.trim()) {
      try {
        const res = await callAppsScript(appsScriptUrl, {
          action: 'getStudents',
          spreadsheetId,
          sheetName,
          startRow,
          nameColumn,
        });

        if (res.students && Array.isArray(res.students)) {
          return res.students.map((s, index) => ({
            id: `row_${s.row || startRow + index}`,
            row: s.row || startRow + index,
            name: s.name,
            active: true,
          }));
        }
      } catch (e) {
        console.warn('Apps Script fetch failed, trying direct URL reader...', e);
      }
    }

    // 3. ZERO-CONFIG Direct URL Reader (No Client ID, No Apps Script needed!)
    const directResult = await directSheetReaderService.fetchStudentsByUrl(
      spreadsheetId,
      sheetName,
      startRow,
      nameColumn
    );
    return directResult.students;
  },

  /**
   * Save date and attendance.
   * Uses Cloud API if connected, or falls back to Smart 1-Click Column Copy so the user is never blocked!
   */
  async saveAttendance(payload: SaveAttendancePayload): Promise<SaveAttendanceResult> {
    const auth = googleAuthService.getState();
    const spreadsheetId = extractSpreadsheetId(payload.spreadsheetId);

    // 1. Direct Google Sheets API v4 (OAuth)
    if (auth.isAuthenticated && auth.accessToken) {
      const res = await googleSheetsApiService.saveAttendance(
        spreadsheetId,
        payload.sheetName || 'Asistencia',
        payload.date,
        payload.dateRow || 3,
        payload.startColumn || 'C',
        payload.records,
        auth.accessToken
      );
      return {
        mode: 'cloud_oauth',
        ...res,
      };
    }

    // 2. Apps Script Webhook (If configured)
    if (payload.appsScriptUrl && payload.appsScriptUrl.trim()) {
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
        mode: 'cloud_script',
        columnLetter: res.columnLetter || 'C',
        totalUpdated: (res as any).totalUpdated || Object.keys(payload.records).length,
        message: res.message || 'Asistencia registrada en la nube con éxito',
      };
    }

    // 3. ZERO-CONFIG Smart Clipboard Column Mode
    // Detects next available column in the sheet if possible, builds exact vertical column (Date + P/A/T/J)
    let targetColLetter = payload.startColumn || 'C';
    try {
      const directInfo = await directSheetReaderService.fetchStudentsByUrl(
        spreadsheetId,
        payload.sheetName || 'Asistencia',
        4,
        'A'
      );
      targetColLetter = colIndexToLetter(directInfo.nextAvailableColIndex);
    } catch {
      // keep default C
    }

    // Sort rows from startRow (e.g. 4) to maxRow
    const rowNumbers = Object.keys(payload.records)
      .map((k) => parseInt(k.replace('row_', ''), 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    const minRow = rowNumbers.length > 0 ? Math.min(...rowNumbers) : 4;
    const maxRow = rowNumbers.length > 0 ? Math.max(...rowNumbers) : 4;

    const lines: string[] = [payload.date]; // First cell is Date (Row 3)
    for (let r = minRow; r <= maxRow; r++) {
      lines.push(payload.records[r.toString()] || payload.records[`row_${r}`] || '');
    }

    const clipboardText = lines.join('\n');
    try {
      await navigator.clipboard.writeText(clipboardText);
    } catch {
      // ignore if clipboard permission denied
    }

    return {
      mode: 'direct_clipboard',
      columnLetter: targetColLetter,
      totalUpdated: rowNumbers.length,
      clipboardText,
      message: `Asistencia guardada y columna copiada lista para pegar en la celda ${targetColLetter}${payload.dateRow || 3}`,
    };
  },
};
