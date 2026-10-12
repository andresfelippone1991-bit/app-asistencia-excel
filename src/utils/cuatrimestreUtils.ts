/**
 * Utilities for detecting Primer Cuatrimestre (Months 03-07) vs Segundo Cuatrimestre (Months 08-12)
 * and filtering out header/title rows (Row 1, Row 36, "Alumnos", "Fecha", etc.)
 */

const EXCLUDED_KEYWORDS = [
  'alumnos',
  'alumno',
  'primer cuatrimestre',
  'segundo cuatrimestre',
  '1er cuatrimestre',
  '2do cuatrimestre',
  '1° cuatrimestre',
  '2° cuatrimestre',
  'cuatrimestre',
  'fecha',
  '% asistencia',
  'asistencia',
  'nombre y apellido',
  'apellido y nombre',
  'apellidos y nombres',
  'nombres y apellidos',
  'total',
  'promedio',
  '**',
];

function normalizeText(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Checks if a row number or cell text is a title/header that must be excluded from the student list.
 * Specifically excludes Row 1, Row 36, and titles like "Alumnos", "Primer Cuatrimestre", "Segundo Cuatrimestre", etc.
 */
export function isExcludedStudentRow(rawName: string, sheetRowNumber: number): boolean {
  // Explicitly exclude Row 1 and Row 36
  if (sheetRowNumber === 1 || sheetRowNumber === 36) {
    return true;
  }

  const clean = normalizeText(rawName);
  if (!clean) return true;

  if (clean.startsWith('---') || clean.startsWith('#')) {
    return true;
  }

  for (const kw of EXCLUDED_KEYWORDS) {
    if (clean === kw || clean.includes('cuatrimestre')) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if we have reached the Segundo Cuatrimestre boundary (Row 36 or second "Alumnos" header)
 * so we don't duplicate students when loading the course list.
 */
export function isSecondCuatrimestreStart(rawName: string, sheetRowNumber: number): boolean {
  if (sheetRowNumber >= 36) {
    return true;
  }
  const clean = normalizeText(rawName);
  if (clean.includes('segundo cuatrimestre') || clean.includes('2do cuatrimestre')) {
    return true;
  }
  if (sheetRowNumber > 6 && (clean === 'alumnos' || clean === 'alumno')) {
    return true;
  }
  return false;
}

/**
 * Determines which Cuatrimestre a date belongs to:
 * - Months 03 to 07 (March - July) -> 1 (Primer Cuatrimestre)
 * - Months 08 to 12 (August - December) -> 2 (Segundo Cuatrimestre)
 */
export function getCuatrimestreFromDate(dateStr: string): 1 | 2 {
  if (!dateStr) return 1;
  const trimmed = dateStr.trim();

  let month = 0;

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split('-');
    month = parseInt(parts[1], 10);
  }
  // Format DD/MM or DD/MM/YYYY
  else if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length >= 2) {
      month = parseInt(parts[1], 10);
    }
  }

  if (month >= 3 && month <= 7) {
    return 1; // Primer Cuatrimestre (03 al 07)
  }
  if (month >= 8 && month <= 12) {
    return 2; // Segundo Cuatrimestre (08 al 12)
  }

  // Fallback for Jan/Feb (mesas de examen / intensificación de fin de curso)
  return 2;
}

export function getCuatrimestreLabel(cuatrimestre: 1 | 2): string {
  return cuatrimestre === 1
    ? '1° Cuatrimestre (Meses 03 a 07)'
    : '2° Cuatrimestre (Meses 08 a 12)';
}
