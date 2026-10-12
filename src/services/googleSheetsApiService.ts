import type { Student, AttendanceStatus } from '../types';
import { extractSpreadsheetId } from '../utils/sheetParser';
import {
  isExcludedStudentRow,
  isSecondCuatrimestreStart,
  getCuatrimestreFromDate,
} from '../utils/cuatrimestreUtils';

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

function normalizeName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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
   * Fetch unique students of the course from Column A (Primer Cuatrimestre block, rows 4..35),
   * excluding Row 1, Row 36, and headers like "Alumnos", "Fecha", etc.
   */
  async fetchStudents(
    spreadsheetIdOrUrl: string,
    sheetName: string = 'Asistencia',
    startRow: number = 4,
    nameColumn: string = 'A',
    accessToken: string
  ): Promise<Student[]> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    // Read from row 1 to 35 (Primer Cuatrimestre block, before Row 36)
    const range = `'${sheetName}'!${nameColumn}1:${nameColumn}35`;
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
    for (let idx = 0; idx < values.length; idx++) {
      const currentRow = idx + 1; // 1-based sheet row
      const rawName = String(values[idx]?.[0] || '').trim();

      if (currentRow < startRow) continue;

      // Stop if we hit Segundo Cuatrimestre boundary (Row 36 or second "Alumnos" header)
      if (isSecondCuatrimestreStart(rawName, currentRow)) {
        break;
      }

      // Exclude Row 1, Row 36, "Alumnos", "Fecha", etc.
      if (!isExcludedStudentRow(rawName, currentRow)) {
        students.push({
          id: `row_${currentRow}`,
          row: currentRow,
          name: rawName,
          active: true,
        });
      }
    }

    return students;
  },

  /**
   * Save date and attendance using Google Sheets API v4.
   * Automatically detects whether the date belongs to:
   * - Primer Cuatrimestre (Months 03 to 07) -> writes in top block (Rows 3..35)
   * - Segundo Cuatrimestre (Months 08 to 12) -> writes in bottom block (after Row 36)
   */
  async saveAttendance(
    spreadsheetIdOrUrl: string,
    sheetName: string = 'Asistencia',
    date: string,
    dateRow: number = 3,
    startColumn: string = 'C',
    records: Record<string, AttendanceStatus>,
    accessToken: string,
    students?: Student[]
  ): Promise<{
    columnLetter: string;
    dateRowUsed: number;
    cuatrimestre: 1 | 2;
    totalUpdated: number;
    message: string;
  }> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    const cuatrimestre = getCuatrimestreFromDate(date);

    // Read full grid A1:AZ85 to inspect both Primer and Segundo Cuatrimestre blocks
    const gridRange = `'${sheetName}'!A1:AZ85`;
    const gridUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      gridRange
    )}?majorDimension=ROWS`;

    const gridRes = await fetch(gridUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!gridRes.ok) {
      const errData = await gridRes.json().catch(() => ({}));
      throw new Error(
        errData.error?.message || `Error al leer la planilla de asistencia (${gridRes.status})`
      );
    }

    const gridData = await gridRes.json();
    const allRows: string[][] = gridData.values || [];

    let effectiveDateRow = dateRow || 3;
    const studentRowMapping: Record<string, number> = {}; // originalRowKey -> targetSheetRow

    if (cuatrimestre === 1) {
      // PRIMER CUATRIMESTRE (Meses 03 a 07)
      // Find first valid student row between row 2 and 35
      let firstStudentRow1st = 4;
      for (let r = 1; r < Math.min(allRows.length, 35); r++) {
        const sheetRowNum = r + 1;
        const cellA = String(allRows[r]?.[0] || '').trim();
        if (sheetRowNum >= 3 && !isExcludedStudentRow(cellA, sheetRowNum)) {
          firstStudentRow1st = sheetRowNum;
          break;
        }
      }
      effectiveDateRow = firstStudentRow1st - 1; // Row 3

      // Map students directly to their 1st cuatrimestre rows
      for (const key in records) {
        const origRow = parseInt(key.replace('row_', ''), 10);
        if (!isNaN(origRow) && origRow > 1 && origRow < 36) {
          studentRowMapping[key] = origRow;
        }
      }
    } else {
      // SEGUNDO CUATRIMESTRE (Meses 08 a 12)
      // Row 36 is the Segundo Cuatrimestre banner (excluded).
      // Scan rows >= 37 (index >= 36) to find where the 2nd Cuatrimestre students start.
      let secondBannerRow = 36;
      for (let r = 20; r < Math.min(allRows.length, 55); r++) {
        const rowText = (allRows[r] || []).join(' ').toLowerCase();
        if (rowText.includes('segundo cuatrimestre') || rowText.includes('2do cuatrimestre')) {
          secondBannerRow = r + 1;
          break;
        }
      }

      let firstStudentRow2nd = secondBannerRow + 3; // Default: Row 39 (if 36=Banner, 37=Fecha, 38=Dates, 39=First student)
      const secondBlockStudentRowsByName: Record<string, number> = {};

      let foundFirst2nd = false;
      for (let r = secondBannerRow; r < allRows.length; r++) {
        const sheetRowNum = r + 1; // starts at 37
        if (sheetRowNum === 1 || sheetRowNum === 36) continue;
        const cellA = String(allRows[r]?.[0] || '').trim();
        if (!isExcludedStudentRow(cellA, sheetRowNum)) {
          if (!foundFirst2nd) {
            firstStudentRow2nd = sheetRowNum;
            foundFirst2nd = true;
          }
          secondBlockStudentRowsByName[normalizeName(cellA)] = sheetRowNum;
        }
      }

      effectiveDateRow = firstStudentRow2nd - 1; // e.g., Row 38

      // Map each student from 1st cuatrimestre to their exact row in 2nd cuatrimestre
      const sortedKeys = Object.keys(records).sort((a, b) => {
        const rA = parseInt(a.replace('row_', ''), 10);
        const rB = parseInt(b.replace('row_', ''), 10);
        return rA - rB;
      });

      const minOrigRow =
        sortedKeys.length > 0
          ? Math.min(...sortedKeys.map((k) => parseInt(k.replace('row_', ''), 10)))
          : 4;

      sortedKeys.forEach((key) => {
        const origRow = parseInt(key.replace('row_', ''), 10);
        const studentObj = students?.find((s) => s.row === origRow || s.id === key);
        const normName = studentObj ? normalizeName(studentObj.name) : '';

        if (normName && secondBlockStudentRowsByName[normName]) {
          studentRowMapping[key] = secondBlockStudentRowsByName[normName];
        } else {
          // Offset mapping: e.g. row 4 -> 39, row 5 -> 40, etc.
          const offset = origRow - minOrigRow;
          studentRowMapping[key] = firstStudentRow2nd + offset;
        }
      });
    }

    // Inspect the effectiveDateRow to find target column (starting at startColumn, default 'C')
    const dateRowValues: string[] = allRows[effectiveDateRow - 1] || [];
    const startColIdx = colLetterToIndex(startColumn); // 'C' -> 3
    let targetColIdx = -1;

    // 1. Check if this date already exists in effectiveDateRow
    for (let c = startColIdx - 1; c < dateRowValues.length; c++) {
      const val = String(dateRowValues[c] || '').trim();
      if (val && (val === date || val.startsWith(date))) {
        targetColIdx = c + 1;
        break;
      }
    }

    // 2. If not found, find first column in effectiveDateRow that is empty or "Fecha"
    if (targetColIdx === -1) {
      for (let c = startColIdx - 1; c < Math.max(dateRowValues.length + 1, startColIdx + 50); c++) {
        const val = String(dateRowValues[c] || '').trim().toLowerCase();
        if (val === '' || val === 'fecha') {
          targetColIdx = c + 1;
          break;
        }
      }
    }

    if (targetColIdx === -1) {
      targetColIdx = Math.max(dateRowValues.length + 1, startColIdx);
    }

    const targetColLetter = colIndexToLetter(targetColIdx);

    // Prepare batchUpdate payload
    const updateRanges: Array<{ range: string; values: string[][] }> = [];

    // Write Date header in effectiveDateRow
    updateRanges.push({
      range: `'${sheetName}'!${targetColLetter}${effectiveDateRow}`,
      values: [[date]],
    });

    // Write each student's attendance in their mapped row for the detected cuatrimestre
    let updatedCount = 0;
    for (const key in records) {
      const targetRow = studentRowMapping[key];
      if (targetRow && targetRow !== 1 && targetRow !== 36) {
        const statusVal = String(records[key] || '').toUpperCase();
        updateRanges.push({
          range: `'${sheetName}'!${targetColLetter}${targetRow}`,
          values: [[statusVal]],
        });
        updatedCount++;
      }
    }

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

    const cuatrLabel = cuatrimestre === 1 ? '1° Cuatrimestre' : '2° Cuatrimestre';

    return {
      columnLetter: targetColLetter,
      dateRowUsed: effectiveDateRow,
      cuatrimestre,
      totalUpdated: updatedCount,
      message: `Asistencia guardada en ${cuatrLabel} (Celda fecha: ${targetColLetter}${effectiveDateRow})`,
    };
  },
};
