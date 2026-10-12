import React from 'react';
import { Users, Calendar, ExternalLink, MoreVertical, Edit2, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Course } from '../types';
import { buildGoogleSheetUrl } from '../utils/sheetParser';

interface CourseCardProps {
  course: Course;
  onSelectCourse: (course: Course) => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onSyncCourse: (course: Course) => void;
  isSyncing?: boolean;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  indigo: { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-700', badge: 'bg-indigo-500' },
  blue: { bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-700', badge: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-700', badge: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-700', badge: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-700', badge: 'bg-rose-500' },
  purple: { bg: 'bg-purple-50/50', border: 'border-purple-100', text: 'text-purple-700', badge: 'bg-purple-500' },
};

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onSelectCourse,
  onEditCourse,
  onDeleteCourse,
  onSyncCourse,
  isSyncing,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const colorScheme = COLOR_MAP[course.color] || COLOR_MAP.indigo;

  const lastAttendance = course.history && course.history.length > 0
    ? course.history[course.history.length - 1]
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Top banner / Info */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`w-3.5 h-3.5 rounded-full ${colorScheme.badge} ring-4 ring-white shadow-xs`} />
            <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
              {course.name}
            </h3>
          </div>

          {/* Menu popover */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1 text-xs">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEditCourse(course);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    Editar configuración
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onSyncCourse(course);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    Actualizar alumnos
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteCourse(course.id);
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar curso
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Subtitle details */}
        <div className="mt-1 space-y-0.5">
          {course.subject && (
            <p className="text-xs font-medium text-slate-600">{course.subject}</p>
          )}
          {course.institution && (
            <p className="text-xs text-slate-400">{course.institution}</p>
          )}
        </div>

        {/* Badges row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{course.students.length} alumnos</span>
          </div>

          {course.spreadsheetId ? (
            <a
              href={buildGoogleSheetUrl(course.spreadsheetId)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
              title="Abrir planilla vinculada en Google Sheets"
            >
              <span>{course.sheetName || 'Hoja'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Sin planilla
            </span>
          )}
        </div>

        {/* Last attendance label */}
        {lastAttendance && (
          <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Última asistencia: <strong>{lastAttendance.date}</strong></span>
          </div>
        )}
      </div>

      {/* Card action footer */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onSyncCourse(course)}
          disabled={isSyncing}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-colors"
          title="Sincronizar nombres desde la planilla"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        <button
          onClick={() => onSelectCourse(course)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md shadow-indigo-100 transition-all"
        >
          <Calendar className="w-4 h-4" />
          <span>Tomar Asistencia</span>
        </button>
      </div>
    </div>
  );
};
