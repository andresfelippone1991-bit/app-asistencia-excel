import type { Student } from '../types';
import { extractSpreadsheetId } from '../utils/sheetParser';

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
        i++; // skip escaped quote
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
  return Math.max(0, col - 1); // 0-based index
}

export const directSheetReaderService = {
  /**
   * Reads students directly from a Google Sheet URL without requiring OAuth or Apps Script!
   * Only requires the sheet to have link sharing enabled ("Anyone with the link").
   */
  async fetchStudentsByUrl(
    spreadsheetIdOrUrl: string,
    sheetName: string = 'Asistencia',
    startRow: number = 4,
    nameColumn: string = 'A'
  ): Promise<{ students: Student[]; nextAvailableColIndex: number; existingDates: string[] }> {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    if (!spreadsheetId) {
      throw new Error('URL o ID de Google Sheet no válido.');
    }

    // Try reading the specified sheet tab via gviz CSV export
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      sheetName
    )}`;

    let response: Response;
    try {
      response = await fetch(csvUrl, {
        method: 'GET',
        mode: 'cors',
      });
    } catch (err) {
      throw new Error(
        'No se pudo leer la planilla directamente. Asegúrate de que en tu Google Sheet el botón "Compartir" esté configurado como "Cualquier persona con el enlace".'
      );
    }

    if (!response.ok) {
      throw new Error(
        'La planilla está en modo privado. En tu Google Sheet, haz clic en "Compartir" (arriba a la derecha) y elige "Cualquier persona con el enlace".'
      );
    }

    const text = await response.text();

    // If Google redirected to a sign-in HTML page because the sheet is restricted
    if (
      text.trim().startsWith('<!DOCTYPE html>') ||
      text.trim().startsWith('<html') ||
      text.includes('accounts.google.com/ServiceLogin')
    ) {
      throw new Error(
        'Tu planilla está restringida. En Google Sheets, haz clic en el botón "Compartir" (arriba a la derecha) y cámbialo a "Cualquier persona con el enlace" para cargar los alumnos sin configuración.'
      );
    }

    const rows = parseCSV(text);
    const colIdx = colLetterToIndex(nameColumn);

    // Find the "Alumnos" header row dynamically (usually row 3 in the sheet, but CSV might skip empty row 2)
    let alumnosHeaderCsvIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const cell = String(rows[r]?.[colIdx] || '').trim().toLowerCase();
      if (cell === 'alumnos' || cell === 'alumno' || cell === 'nombre y apellido' || cell === 'apellido y nombre') {
        alumnosHeaderCsvIdx = r;
        break;
      }
    }

    // Extract existing dates from header row (columns C onwards, index 2+)
    const existingDates: string[] = [];
    let nextAvailableColIndex = 2; // Column C (0-based = 2)
    if (alumnosHeaderCsvIdx !== -1 && rows[alumnosHeaderCsvIdx]) {
      const headerRow = rows[alumnosHeaderCsvIdx];
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

    const firstStudentCsvIdx =
      alumnosHeaderCsvIdx !== -1 ? alumnosHeaderCsvIdx + 1 : Math.max(0, startRow - 1);

    const students: Student[] = [];
    for (let i = firstStudentCsvIdx; i < rows.length; i++) {
      const rawName = String(rows[i]?.[colIdx] || '').trim();
      // Calculate actual sheet row number: if Alumnos is on row 3 (startRow - 1), then first student is startRow (4)
      const sheetRowNumber = startRow + (i - firstStudentCsvIdx);

      if (
        rawName &&
        rawName !== '**' &&
        !rawName.startsWith('---') &&
        !rawName.toLowerCase().startsWith('total') &&
        !rawName.startsWith('#')
      ) {
        students.push({
          id: `row_${sheetRowNumber}`,
          row: sheetRowNumber,
          name: rawName,
          active: true,
        });
      }
    }

    // If no students found in "Asistencia", try fallback to "Alumnos" tab if sheetName was "Asistencia"
    if (students.length === 0 && sheetName.toLowerCase() === 'asistencia') {
      try {
        const fallbackUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Alumnos`;
        const fbRes = await fetch(fallbackUrl);
        if (fbRes.ok) {
          const fbText = await fbRes.text();
          if (!fbText.trim().startsWith('<')) {
            const fbRows = parseCSV(fbText);
            for (let i = 1; i < fbRows.length; i++) {
              const rawName = String(fbRows[i]?.[0] || '').trim();
              const secondCol = String(fbRows[i]?.[1] || '').trim();
              const combined =
                rawName && secondCol && !secondCol.includes('@') && isNaN(Number(secondCol))
                  ? `${rawName} ${secondCol}`
                  : rawName;

              if (
                combined &&
                combined !== '**' &&
                !combined.toLowerCase().includes('alumno') &&
                !combined.toLowerCase().includes('apellido')
              ) {
                const rowNum = startRow + students.length;
                students.push({
                  id: `row_${rowNum}`,
                  row: rowNum,
                  name: combined,
                  active: true,
                });
              }
            }
          }
        }
      } catch {
        // ignore fallback error
      }
    }

    return {
      students,
      nextAvailableColIndex,
      existingDates,
    };
  },
};
