import { Student, AttendanceStatus } from '../types';
import { extractSpreadsheetId } from '../utils/sheetParser';

function colIndexToLetter(colIndex: number): string {
  let letter = '';
  while (colIndex > 0) {
    const temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = Math.floor((colIndex - temp - 1) / 26);
  }
  return letter;
}

function colLetterToIndex(colLetter: string): number {
  const letter = String(colLetter || 'A').toUpperCase();
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col;
}

export const googleSheetsApiService = {
  /**
   * Get spreadsheet info (title, sheet tabs)
   */
  async getSpreadsheetInfo(spreadsheetIdOrUrl: string, accessToken: string) {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.error?.message || `Error al acceder a Google Sheets (${res.status})`
      );
    }

    const data = await res.json();
    const sheets = (data.sheets || []).map((s: any) => s.properties?.title as string);

    return {
      title: data.properties?.title || 'Planilla de Asistencia',
      sheets,
    };
  },

  /**
   * Fetch students from column A (or custom column)
   */
  async fetchStudents(
    spreadsheetIdOrUrl: string,
    sheetName: string = 'Asistencia',
    startRow: number = 4,
    nameColumn: string = 'A',
    accessToken: string
  ): Promise<Student[]> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    // Range: Asistencia!A4:A
    const range = `'${sheetName}'!${nameColumn}${startRow}:${nameColumn}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?majorDimension=ROWS`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.error?.message || `No se pudo leer la lista de alumnos (${res.status})`
      );
    }

    const data = await res.json();
    const values: string[][] = data.values || [];

    const students: Student[] = [];
    values.forEach((rowVals, idx) => {
      const rawName = String(rowVals[0] || '').trim();
      const currentRow = startRow + idx;
      if (
        rawName &&
        rawName !== '**' &&
        !rawName.startsWith('---') &&
        !rawName.toLowerCase().startsWith('total')
      ) {
        students.push({
          id: `row_${currentRow}`,
          row: currentRow,
          name: rawName,
          active: true,
        });
      }
    });

    return students;
  },

  /**
   * Save date and attendance using Google Sheets API v4
   */
  async saveAttendance(
    spreadsheetIdOrUrl: string,
    sheetName: string = 'Asistencia',
    date: string,
    dateRow: number = 3,
    startColumn: string = 'C',
    records: Record<string, AttendanceStatus>,
    accessToken: string
  ): Promise<{ columnLetter: string; totalUpdated: number; message: string }> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

    // 1. Fetch Date Row to inspect existing columns (Row 3)
    const headerRange = `'${sheetName}'!${dateRow}:${dateRow}`;
    const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      headerRange
    )}?majorDimension=ROWS`;

    const headerRes = await fetch(headerUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!headerRes.ok) {
      const errData = await headerRes.json().catch(() => ({}));
      throw new Error(
        errData.error?.message || `Error al leer encabezados de fechas (${headerRes.status})`
      );
    }

    const headerData = await headerRes.json();
    const rowValues: string[] = headerData.values?.[0] || [];

    const startColIdx = colLetterToIndex(startColumn); // e.g. 'C' -> 3
    let targetColIdx = -1;

    // Search if target date already exists in row 3
    for (let c = startColIdx - 1; c < rowValues.length; c++) {
      const val = String(rowValues[c] || '').trim();
      if (val === date || val.startsWith(date)) {
        targetColIdx = c + 1; // 1-based index
        break;
      }
    }

    // If not found, find first column containing "Fecha" or empty
    if (targetColIdx === -1) {
      for (let c = startColIdx - 1; c < Math.max(rowValues.length, startColIdx + 50); c++) {
        const val = String(rowValues[c] || '').trim().toLowerCase();
        if (val === '' || val === 'fecha') {
          targetColIdx = c + 1;
          break;
        }
      }
    }

    if (targetColIdx === -1) {
      targetColIdx = Math.max(rowValues.length + 1, startColIdx);
    }

    const targetColLetter = colIndexToLetter(targetColIdx);

    // Prepare batch update data
    const updateRanges: Array<{ range: string; values: string[][] }> = [];

    // Set Date in row 3
    updateRanges.push({
      range: `'${sheetName}'!${targetColLetter}${dateRow}`,
      values: [[date]],
    });

    // Set each student's attendance in their row
    let updatedCount = 0;
    for (const key in records) {
      const rowNum = parseInt(key.replace('row_', ''), 10);
      if (!isNaN(rowNum) && rowNum > 0) {
        const statusVal = String(records[key] || '').toUpperCase();
        updateRanges.push({
          range: `'${sheetName}'!${targetColLetter}${rowNum}`,
          values: [[statusVal]],
        });
        updatedCount++;
      }
    }

    // Call batchUpdate
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    const batchRes = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updateRanges,
      }),
    });

    if (!batchRes.ok) {
      const errData = await batchRes.json().catch(() => ({}));
      throw new Error(
        errData.error?.message || `Error al guardar en Google Sheets (${batchRes.status})`
      );
    }

    return {
      columnLetter: targetColLetter,
      totalUpdated: updatedCount,
      message: `Asistencia guardada exitosamente en columna ${targetColLetter}`,
    };
  },
};
