import React, { useState } from 'react';
import { X, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Users, Check, AlertCircle } from 'lucide-react';
import { Course, Student } from '../types';
import { extractSpreadsheetId, buildGoogleSheetUrl } from '../utils/sheetParser';
import { googleSheetsService } from '../services/googleSheetsService';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseToEdit?: Course | null;
  globalAppsScriptUrl: string;
  onSaveCourse: (course: Course) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-500' },
  { id: 'blue', label: 'Azul', bg: 'bg-blue-500' },
  { id: 'emerald', label: 'Verde', bg: 'bg-emerald-500' },
  { id: 'amber', label: 'Ámbar', bg: 'bg-amber-500' },
  { id: 'rose', label: 'Rosa', bg: 'bg-rose-500' },
  { id: 'purple', label: 'Púrpura', bg: 'bg-purple-500' },
];

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  courseToEdit,
  globalAppsScriptUrl,
  onSaveCourse,
  showToast,
}) => {
  const [name, setName] = useState(courseToEdit?.name || '');
  const [institution, setInstitution] = useState(courseToEdit?.institution || '');
  const [subject, setSubject] = useState(courseToEdit?.subject || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(courseToEdit?.spreadsheetUrl || '');
  const [sheetName, setSheetName] = useState(courseToEdit?.sheetName || 'Asistencia');
  const [courseAppsScriptUrl, setCourseAppsScriptUrl] = useState(courseToEdit?.appsScriptUrl || '');
  const [startRow, setStartRow] = useState(courseToEdit?.startRow || 4);
  const [nameColumn, setNameColumn] = useState(courseToEdit?.nameColumn || 'A');
  const [dateRow, setDateRow] = useState(courseToEdit?.dateRow || 3);
  const [startColumn, setStartColumn] = useState(courseToEdit?.startColumn || 'C');
  const [color, setColor] = useState(courseToEdit?.color || 'indigo');
  const [students, setStudents] = useState<Student[]>(courseToEdit?.students || []);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSheetId = extractSpreadsheetId(spreadsheetUrl);
  const effectiveAppsScriptUrl = (courseAppsScriptUrl || globalAppsScriptUrl).trim();

  const handleFetchStudentsFromSheet = async () => {
    if (!currentSheetId) {
      showToast('error', 'Ingresa primero el enlace o ID de la planilla de Google Sheet');
      return;
    }
    if (!effectiveAppsScriptUrl) {
      showToast(
        'error',
        'No has configurado la URL de Google Apps Script. Configúrala primero en Ajustes.'
      );
      return;
    }

    setIsLoadingStudents(true);
    setSyncStatus(null);

    try {
      const fetched = await googleSheetsService.fetchStudents(
        effectiveAppsScriptUrl,
        currentSheetId,
        sheetName,
        startRow,
        nameColumn
      );

      if (fetched.length === 0) {
        showToast('info', 'No se encontraron alumnos en la fila/columna especificada');
        setSyncStatus('Planilla leída, pero no se encontraron alumnos');
      } else {
        setStudents(fetched);
        showToast('success', `¡Se cargaron ${fetched.length} alumnos desde Google Sheets!`);
        setSyncStatus(`¡${fetched.length} alumnos cargados con éxito!`);
      }
    } catch (err: any) {
      showToast('error', `Error al leer alumnos: ${err.message}`);
      setSyncStatus(`Error: ${err.message}`);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('error', 'El nombre del curso es obligatorio');
      return;
    }

    const updatedCourse: Course = {
      id: courseToEdit?.id || `course-${Date.now()}`,
      name: name.trim(),
      institution: institution.trim(),
      subject: subject.trim(),
      spreadsheetUrl: spreadsheetUrl.trim(),
      spreadsheetId: currentSheetId,
      sheetName: sheetName.trim() || 'Asistencia',
      appsScriptUrl: courseAppsScriptUrl.trim() || undefined,
      startRow,
      nameColumn: nameColumn.toUpperCase().trim() || 'A',
      dateRow,
      startColumn: startColumn.toUpperCase().trim() || 'C',
      color,
      students,
      history: courseToEdit?.history || [],
      createdAt: courseToEdit?.createdAt || new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    };

    onSaveCourse(updatedCourse);
    showToast(
      'success',
      courseToEdit ? 'Curso actualizado exitosamente' : 'Curso creado exitosamente'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              {courseToEdit ? 'Editar Curso' : 'Nuevo Curso'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form fields */}
          <div className="p-6 overflow-y-auto space-y-4 text-sm">
            {/* Course Name and Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Curso *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: 3° 1ra - Informática"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Materia / Asignatura
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Programación / Matemática"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>

            {/* Institution */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institución / Escuela
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ej: E.E.S.T. N° 1 / Escuela Normal"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            {/* Google Sheets Link */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Enlace o ID de la Planilla Google Sheet *
                </label>
                {currentSheetId && (
                  <a
                    href={buildGoogleSheetUrl(currentSheetId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                  >
                    Abrir Hoja <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Pega la URL completa de tu Google Sheet. Cada curso puede tener su propia planilla.
              </p>
            </div>

            {/* Sheet Tab Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Pestaña en la Hoja
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Asistencia"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
                <span className="text-[10px] text-slate-400">
                  Pestaña activa en tu planilla (ej. "Asistencia")
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Color Identificador
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-all flex items-center justify-center text-white ${
                        color === c.id ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {color === c.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fetch Students Button */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-xs text-slate-800">
                    Alumnos del Curso ({students.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFetchStudentsFromSheet}
                  disabled={isLoadingStudents || !currentSheetId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStudents ? 'animate-spin' : ''}`} />
                  <span>{isLoadingStudents ? 'Cargando...' : 'Cargar desde Google Sheet'}</span>
                </button>
              </div>

              {syncStatus && (
                <p
                  className={`text-xs ${
                    syncStatus.startsWith('¡') ? 'text-emerald-600 font-medium' : 'text-slate-600'
                  }`}
                >
                  {syncStatus}
                </p>
              )}

              {students.length > 0 && (
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {students.map((st, i) => (
                    <div key={st.id || i} className="px-3 py-1.5 text-xs flex items-center justify-between">
                      <span className="text-slate-700">
                        <strong className="text-slate-400 font-normal mr-2">#{i + 1}</strong>
                        {st.name}
                      </span>
                      <span className="text-[10px] text-slate-400">Fila {st.row}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collapsible Advanced Settings */}
            <div className="border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 py-1"
              >
                <span>Configuración Avanzada de Celdas (Filas y Columnas)</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Fila Alumnos
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={startRow}
                      onChange={(e) => setStartRow(parseInt(e.target.value) || 4)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    />
                    <span className="text-[10px] text-slate-400">Default: 4</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Columna Alumnos
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={nameColumn}
                      onChange={(e) => setNameColumn(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg uppercase"
                    />
                    <span className="text-[10px] text-slate-400">Default: A</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Fila Fechas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={dateRow}
                      onChange={(e) => setDateRow(parseInt(e.target.value) || 3)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    />
                    <span className="text-[10px] text-slate-400">Default: 3</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Inicio Fechas
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={startColumn}
                      onChange={(e) => setStartColumn(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg uppercase"
                    />
                    <span className="text-[10px] text-slate-400">Default: C</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              {courseToEdit ? 'Actualizar Curso' : 'Crear Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
