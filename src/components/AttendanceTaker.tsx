import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ExternalLink, RefreshCw, Send, CheckCircle2, Copy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { AttendanceStatus, Course } from '../types';
import { StudentRow } from './StudentRow';
import { AttendanceStats } from './AttendanceStats';
import { getTodayInputFormat, formatAttendanceDate, getFriendlyDateLabel } from '../utils/dateFormatter';
import { buildGoogleSheetUrl } from '../utils/sheetParser';
import { getCuatrimestreFromDate } from '../utils/cuatrimestreUtils';
import { googleSheetsService } from '../services/googleSheetsService';
import type { SaveAttendanceResult } from '../services/googleSheetsService';

interface AttendanceTakerProps {
  course: Course;
  globalAppsScriptUrl: string;
  dateFormat: 'DD/MM' | 'DD/MM/YYYY';
  autoMarkAllPresent: boolean;
  onBack: () => void;
  onAttendanceSaved: (updatedCourse: Course) => void;
  onSyncStudents: (course: Course) => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AttendanceTaker: React.FC<AttendanceTakerProps> = ({
  course,
  globalAppsScriptUrl,
  dateFormat,
  autoMarkAllPresent,
  onBack,
  onAttendanceSaved,
  onSyncStudents,
  showToast,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayInputFormat());
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveAttendanceResult | null>(null);
  const [copiedAgain, setCopiedAgain] = useState(false);

  const effectiveAppsScriptUrl = (course.appsScriptUrl || globalAppsScriptUrl).trim();
  const formattedDate = formatAttendanceDate(selectedDate, dateFormat);
  const activeCuatrimestre = getCuatrimestreFromDate(selectedDate);
  const targetDateRowPreview = activeCuatrimestre === 1 ? course.dateRow || 3 : 38;

  useEffect(() => {
    const existingRecord = course.history?.find((h) => h.date === formattedDate);

    if (existingRecord) {
      setAttendance(existingRecord.records || {});
      setNotes(existingRecord.notes || {});
    } else {
      const initial: Record<string, AttendanceStatus> = {};
      course.students.forEach((s) => {
        initial[s.id] = autoMarkAllPresent ? 'P' : '';
      });
      setAttendance(initial);
      setNotes({});
    }
    setSaveResult(null);
  }, [course.id, selectedDate, formattedDate, autoMarkAllPresent]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setNotes((prev) => ({
      ...prev,
      [studentId]: note,
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    course.students.forEach((s) => {
      updated[s.id] = 'P';
    });
    setAttendance(updated);
    showToast('info', 'Todos los alumnos marcados como Presentes');
  };

  const handleClearAll = () => {
    const updated: Record<string, AttendanceStatus> = {};
    course.students.forEach((s) => {
      updated[s.id] = '';
    });
    setAttendance(updated);
    showToast('info', 'Marcas de asistencia reiniciadas');
  };

  const handleQuickDateChange = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${da}`);
  };

  const handleSaveAttendance = async () => {
    if (!course.spreadsheetId) {
      showToast('error', 'Este curso no tiene una planilla de Google Sheets vinculada.');
      return;
    }

    setIsSaving(true);
    setSaveResult(null);

    try {
      const recordsByRow: Record<string, AttendanceStatus> = {};
      course.students.forEach((s) => {
        const val = attendance[s.id] || '';
        recordsByRow[s.row.toString()] = val;
      });

      const res = await googleSheetsService.saveAttendance({
        appsScriptUrl: effectiveAppsScriptUrl,
        spreadsheetId: course.spreadsheetId,
        sheetName: course.sheetName || 'Asistencia',
        date: formattedDate,
        dateRow: course.dateRow || 3,
        startColumn: course.startColumn || 'C',
        records: recordsByRow,
        students: course.students,
        overwrite: true,
      });

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore confetti errors
      }

      const updatedHistory = [...(course.history || [])];
      const existingIndex = updatedHistory.findIndex((h) => h.date === formattedDate);
      const newRecord = {
        date: formattedDate,
        timestamp: new Date().toISOString(),
        records: attendance,
        notes: notes,
        syncedToGoogleSheets: res.mode !== 'direct_clipboard',
        columnUsed: `${res.columnLetter}${res.dateRowUsed}`,
      };

      if (existingIndex >= 0) {
        updatedHistory[existingIndex] = newRecord;
      } else {
        updatedHistory.push(newRecord);
      }

      const updatedCourse: Course = {
        ...course,
        history: updatedHistory,
        lastSyncedAt: new Date().toISOString(),
      };

      onAttendanceSaved(updatedCourse);
      setSaveResult(res);

      const cuatrName = res.cuatrimestre === 1 ? '1° Cuatrimestre' : '2° Cuatrimestre';
      if (res.mode === 'direct_clipboard') {
        showToast(
          'success',
          `¡Columna (${cuatrName}) copiada! Abre tu planilla y pega en ${res.columnLetter}${res.dateRowUsed}`
        );
      } else {
        showToast(
          'success',
          `Guardado en ${cuatrName} (Celda fecha: ${res.columnLetter}${res.dateRowUsed})`
        );
      }
    } catch (err: any) {
      showToast('error', `Error al guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = course.students.filter((st) => {
    const matchesSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    return attendance[st.id] === statusFilter;
  });

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let justifiedCount = 0;
  let unmarkedCount = 0;

  course.students.forEach((s) => {
    const st = attendance[s.id];
    if (st === 'P') presentCount++;
    else if (st === 'A') absentCount++;
    else if (st === 'T') lateCount++;
    else if (st === 'J') justifiedCount++;
    else unmarkedCount++;
  });

  return (
    <div className="max-w-4xl mx-auto pb-28 pt-2 px-4 sm:px-6">
      {/* Top Navigation & Course Info */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              title="Volver a los cursos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {course.name}
                </h2>
                {course.spreadsheetId && (
                  <a
                    href={buildGoogleSheetUrl(course.spreadsheetId)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                    title="Ver planilla en Google Sheets"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {course.subject || 'Sin materia asignada'} &bull; {course.students.length} alumnos en lista
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              setIsSyncing(true);
              await onSyncStudents(course);
              setIsSyncing(false);
            }}
            disabled={isSyncing}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Recargar nombres desde la planilla de Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isSyncing ? 'Recargando...' : 'Actualizar Alumnos'}</span>
          </button>
        </div>

        {/* Date Selector & Automatic Cuatrimestre Detector Banner */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Fecha de Asistencia ({getFriendlyDateLabel(selectedDate)})
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
                />
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  Fecha: {formattedDate}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                    activeCuatrimestre === 1
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}
                >
                  {activeCuatrimestre === 1
                    ? '1° Cuatrimestre (Mes 03-07)'
                    : '2° Cuatrimestre (Mes 08-12)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleQuickDateChange(0)}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => handleQuickDateChange(1)}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Ayer
            </button>
          </div>
        </div>
      </div>

      {/* Save Result Banner */}
      {saveResult && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2.5 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-sm text-emerald-900">
                  {saveResult.mode === 'direct_clipboard'
                    ? `¡Columna del ${
                        saveResult.cuatrimestre === 1 ? '1° Cuatrimestre' : '2° Cuatrimestre'
                      } (${formattedDate}) copiada!`
                    : `¡Guardado automático en ${
                        saveResult.cuatrimestre === 1 ? '1° Cuatrimestre' : '2° Cuatrimestre'
                      } (Celda ${saveResult.columnLetter}${saveResult.dateRowUsed})!`}
                </p>
                {saveResult.mode === 'direct_clipboard' ? (
                  <p className="text-emerald-800 mt-1 leading-relaxed">
                    Haz clic en <strong>"Abrir Planilla"</strong>, selecciona la celda{' '}
                    <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      {saveResult.columnLetter}{saveResult.dateRowUsed}
                    </code>{' '}
                    (donde dice <em>"Fecha"</em> en el {saveResult.cuatrimestre}° Cuatrimestre) y presiona{' '}
                    <strong>Ctrl + V</strong>.
                  </p>
                ) : (
                  <p className="text-emerald-800 mt-0.5">
                    La fecha ({formattedDate}) se escribió en la celda{' '}
                    <strong>
                      {saveResult.columnLetter}{saveResult.dateRowUsed}
                    </strong>{' '}
                    y las asistencias en las filas del{' '}
                    <strong>
                      {saveResult.cuatrimestre === 1 ? 'Primer Cuatrimestre' : 'Segundo Cuatrimestre'}
                    </strong>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {course.spreadsheetId && (
              <a
                href={buildGoogleSheetUrl(course.spreadsheetId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <span>
                  {saveResult.mode === 'direct_clipboard'
                    ? `Abrir Planilla y Pegar en ${saveResult.columnLetter}${saveResult.dateRowUsed}`
                    : 'Ver Planilla en Google Sheets'}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {saveResult.clipboardText && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(saveResult.clipboardText!);
                  setCopiedAgain(true);
                  setTimeout(() => setCopiedAgain(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
              >
                {copiedAgain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAgain ? '¡Copiado!' : 'Volver a Copiar Columna'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Stats & Batch controls */}
      <AttendanceStats
        total={course.students.length}
        presentCount={presentCount}
        absentCount={absentCount}
        lateCount={lateCount}
        justifiedCount={justifiedCount}
        unmarkedCount={unmarkedCount}
        onMarkAllPresent={handleMarkAllPresent}
        onClearAll={handleClearAll}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Student List */}
      <div className="mt-4 space-y-2">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500">
            <p className="text-sm font-medium">No se encontraron alumnos con los filtros seleccionados.</p>
            {course.students.length === 0 && (
              <div className="mt-3">
                <button
                  onClick={() => onSyncStudents(course)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  Cargar Alumnos desde Google Sheet
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredStudents.map((student, idx) => (
            <StudentRow
              key={student.id}
              index={idx}
              student={student}
              status={attendance[student.id] || ''}
              note={notes[student.id]}
              onStatusChange={(status) => handleStatusChange(student.id, status)}
              onNoteChange={(note) => handleNoteChange(student.id, note)}
            />
          ))
        )}
      </div>

      {/* Fixed / Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3 sm:p-4 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-slate-800">
              {presentCount} presentes &bull; {absentCount} ausentes &bull; {lateCount} tardes
            </p>
            <p className="text-[11px] text-slate-500">
              Destino: <strong>{activeCuatrimestre}° Cuatrimestre</strong> &bull; Fecha{' '}
              <strong>{formattedDate}</strong> (Fila {targetDateRowPreview}, {course.sheetName})
            </p>
          </div>

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving || course.students.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando en {activeCuatrimestre}° Cuatrimestre...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Guardar en {activeCuatrimestre}° Cuatrimestre ({formattedDate})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
