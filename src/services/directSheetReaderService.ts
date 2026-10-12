import type { Student } from '../types';
import { extractSpreadsheetId } from '../utils/sheetParser';
import {
  isExcludedStudentRow,
  isSecondCuatrimestreStart,
} from '../utils/cuatrimestreUtils';

/**
 * Simple RFC-4180 compliant CSV parser
 */
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentVal);
        currentVal = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
        i++;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }

  return rows;
}

function colLetterToIndex(letter: string): number {
  const clean = String(letter || 'A').toUpperCase().trim();
  let col = 0;
  for (let i = 0; i < clean.length; i++) {
    col = col * 26 + (clean.charCodeAt(i) - 64);
  }
  return Math.max(0, col - 1);
}

export const directSheetReaderService = {
  /**
   * Reads students directly from a Google Sheet URL without requiring OAuth or Apps Script.
   * Excludes Row 1, Row 36, and headers like "Alumnos", "Fecha", "Primer Cuatrimestre", "Segundo Cuatrimestre".
   */
  async fetchStudentsByUrl(
    spreadsheetIdOrUrl: string,
    sheetName: string = 'Asistencia',
    startRow: number = 4,
    nameColumn: string = 'A',
    cuatrimestre: 1 | 2 = 1
  ): Promise<{
    students: Student[];
    nextAvailableColIndex: number;
    dateRowUsed: number;
    existingDates: string[];
  }> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    if (!spreadsheetId) {
      throw new Error('URL o ID de Google Sheet no válido.');
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      sheetName
    )}`;

    let response: Response;
    try {
      response = await fetch(csvUrl, {
        method: 'GET',
        mode: 'cors',
      });
    } catch {
      throw new Error(
        'No se pudo leer la planilla directamente. Asegúrate de que en tu Google Sheet el botón "Compartir" esté configurado como "Cualquier persona con el enlace".'
      );
    }

    if (!response.ok) {
      throw new Error(
        'La planilla está en modo privado. En tu Google Sheet, haz clic en "Compartir" y elige "Cualquier persona con el enlace".'
      );
    }

    const text = await response.text();

    if (
      text.trim().startsWith('<!DOCTYPE html>') ||
      text.trim().startsWith('<html') ||
      text.includes('accounts.google.com/ServiceLogin')
    ) {
      throw new Error(
        'Tu planilla está restringida. En Google Sheets, haz clic en "Compartir" y cámbialo a "Cualquier persona con el enlace".'
      );
    }

    const rows = parseCSV(text);
    const colIdx = colLetterToIndex(nameColumn);

    // Find the first "Alumnos" header row (1st Cuatrimestre)
    let alumnosHeaderCsvIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const cell = String(rows[r]?.[colIdx] || '').trim().toLowerCase();
      if (
        cell === 'alumnos' ||
        cell === 'alumno' ||
        cell === 'nombre y apellido' ||
        cell === 'apellido y nombre'
      ) {
        alumnosHeaderCsvIdx = r;
        break;
      }
    }

    const firstStudentCsvIdx =
      alumnosHeaderCsvIdx !== -1 ? alumnosHeaderCsvIdx + 1 : Math.max(0, startRow - 1);

    const students: Student[] = [];
    for (let i = firstStudentCsvIdx; i < rows.length; i++) {
      const rawName = String(rows[i]?.[colIdx] || '').trim();
      const sheetRowNumber = startRow + (i - firstStudentCsvIdx);

      // Stop as soon as we reach Row 36 or Segundo Cuatrimestre header
      if (isSecondCuatrimestreStart(rawName, sheetRowNumber)) {
        break;
      }

      // Check across the row if it says "SEGUNDO CUATRIMESTRE" in any column
      const rowJoined = (rows[i] || []).join(' ').toLowerCase();
      if (rowJoined.includes('segundo cuatrimestre') || rowJoined.includes('2do cuatrimestre')) {
        break;
      }

      if (!isExcludedStudentRow(rawName, sheetRowNumber)) {
        students.push({
          id: `row_${sheetRowNumber}`,
          row: sheetRowNumber,
          name: rawName,
          active: true,
        });
      }
    }

    // Determine dateRowUsed and nextAvailableColIndex based on Cuatrimestre (1 vs 2)
    const dateRowUsed = cuatrimestre === 1 ? 3 : 38;
    const targetCsvHeaderIdx =
      cuatrimestre === 1
        ? alumnosHeaderCsvIdx !== -1
          ? alumnosHeaderCsvIdx
          : 2
        : Math.min(rows.length - 1, 37);

    const existingDates: string[] = [];
    let nextAvailableColIndex = 2; // Column C (0-based = 2)
    if (rows[targetCsvHeaderIdx]) {
      const headerRow = rows[targetCsvHeaderIdx];
      let foundEmptyOrFecha = false;
      for (let c = 2; c < headerRow.length; c++) {
        const val = String(headerRow[c] || '').trim();
        if (val && val.toLowerCase() !== 'fecha') {
          existingDates.push(val);
        } else if (!foundEmptyOrFecha && (val === '' || val.toLowerCase() === 'fecha')) {
          nextAvailableColIndex = c;
          foundEmptyOrFecha = true;
        }
      }
      if (!foundEmptyOrFecha) {
        nextAvailableColIndex = Math.max(2, headerRow.length);
      }
    }

    return {
      students,
      nextAvailableColIndex,
      dateRowUsed,
      existingDates,
    };
  },
};
