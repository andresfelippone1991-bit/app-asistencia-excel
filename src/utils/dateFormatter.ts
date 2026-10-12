export function getTodayInputFormat(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatAttendanceDate(isoDateStr: string, format: 'DD/MM' | 'DD/MM/YYYY' = 'DD/MM'): string {
  if (!isoDateStr) return '';
  
  // Handles YYYY-MM-DD
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (format === 'DD/MM') {
      return `${day}/${month}`;
    }
    return `${day}/${month}/${year}`;
  }
  
  return isoDateStr;
}

export function getFriendlyDateLabel(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const today = getTodayInputFormat();
  if (isoDateStr === today) return 'Hoy';

  const d = new Date(isoDateStr + 'T12:00:00');
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return daysOfWeek[d.getDay()];
}
