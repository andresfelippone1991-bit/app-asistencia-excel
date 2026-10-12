export type AttendanceStatus = 'P' | 'A' | 'T' | 'J' | '';

export interface Student {
  id: string;
  row: number; // Row index in the Google Sheet (e.g. 4, 5, 6...)
  name: string; // Full name (e.g. "Gómez, Juan Martín")
  active?: boolean;
}

export interface AttendanceRecord {
  date: string; // Formatted date e.g. "12/10/2026" or "12/10"
  timestamp: string; // ISO string
  records: Record<string, AttendanceStatus>; // studentId -> status ('P' | 'A' | 'T' | 'J')
  notes?: Record<string, string>; // studentId -> optional note
  syncedToGoogleSheets: boolean;
  columnUsed?: string; // Column letter where it was saved (e.g. "C", "D")
}

export interface Course {
  id: string;
  name: string; // e.g. "3° 1ra - Informática"
  institution?: string; // e.g. "E.E.S.T. N° 1"
  subject?: string; // e.g. "Programación Web"
  spreadsheetUrl: string; // Full Google Sheet URL or ID
  spreadsheetId: string; // Parsed ID
  sheetName: string; // Tab name, default: "Asistencia"
  appsScriptUrl?: string; // Optional course-specific Apps Script URL (falls back to global)
  startRow: number; // Row where students start (default 4)
  nameColumn: string; // Column letter for names (default "A")
  dateRow: number; // Row for date headers (default 3)
  startColumn: string; // Column letter where attendance dates start (default "C")
  color: string; // Tailwind color theme for course card
  students: Student[];
  history: AttendanceRecord[];
  createdAt: string;
  lastSyncedAt?: string;
}

export interface AppSettings {
  globalAppsScriptUrl: string;
  dateFormat: 'DD/MM' | 'DD/MM/YYYY';
  defaultTabName: string;
  autoMarkAllPresent: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  spreadsheetTitle?: string;
  sheets?: string[];
  students?: Array<{ row: number; name: string }>;
  column?: number;
  columnLetter?: string;
}
