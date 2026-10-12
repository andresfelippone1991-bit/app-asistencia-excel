import React, { useState } from 'react';
import { MessageSquare, Check, X, Clock, FileText } from 'lucide-react';
import { AttendanceStatus, Student } from '../types';

interface StudentRowProps {
  index: number;
  student: Student;
  status: AttendanceStatus;
  note?: string;
  onStatusChange: (status: AttendanceStatus) => void;
  onNoteChange: (note: string) => void;
}

export const StudentRow: React.FC<StudentRowProps> = ({
  index,
  student,
  status,
  note,
  onStatusChange,
  onNoteChange,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(Boolean(note));

  return (
    <div
      className={`p-3 sm:px-4 sm:py-3 rounded-xl border transition-all duration-150 flex flex-col gap-2 ${
        status === 'A'
          ? 'bg-rose-50/40 border-rose-200/80'
          : status === 'P'
          ? 'bg-emerald-50/30 border-emerald-200/60'
          : status === 'T'
          ? 'bg-amber-50/40 border-amber-200/80'
          : status === 'J'
          ? 'bg-blue-50/40 border-blue-200/80'
          : 'bg-white border-slate-200/70 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Student Name & Index */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-xs font-semibold text-slate-400 w-6 text-right shrink-0">
            {index + 1}.
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-slate-800 text-sm block truncate">
              {student.name}
            </span>
            <span className="text-[10px] text-slate-400">
              Fila {student.row}
            </span>
          </div>
        </div>

        {/* Action status toggle buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* P - Presente */}
          <button
            type="button"
            onClick={() => onStatusChange(status === 'P' ? '' : 'P')}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all ${
              status === 'P'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200 scale-105 ring-2 ring-emerald-600/30'
                : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
            }`}
            title="Presente (P)"
          >
            P
          </button>

          {/* A - Ausente */}
          <button
            type="button"
            onClick={() => onStatusChange(status === 'A' ? '' : 'A')}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all ${
              status === 'A'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-200 scale-105 ring-2 ring-rose-600/30'
                : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700'
            }`}
            title="Ausente (A)"
          >
            A
          </button>

          {/* T - Tarde */}
          <button
            type="button"
            onClick={() => onStatusChange(status === 'T' ? '' : 'T')}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all ${
              status === 'T'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-200 scale-105 ring-2 ring-amber-500/30'
                : 'bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700'
            }`}
            title="Tarde (T)"
          >
            T
          </button>

          {/* J - Justificada */}
          <button
            type="button"
            onClick={() => onStatusChange(status === 'J' ? '' : 'J')}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all ${
              status === 'J'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 scale-105 ring-2 ring-blue-600/30'
                : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700'
            }`}
            title="Justificada (J)"
          >
            J
          </button>

          {/* Optional Note toggle button */}
          <button
            type="button"
            onClick={() => setShowNoteInput(!showNoteInput)}
            className={`p-2 rounded-lg text-xs transition-colors hidden sm:block ${
              note
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Agregar observación"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Note input if open */}
      {showNoteInput && (
        <div className="pt-1.5 flex items-center gap-2">
          <input
            type="text"
            value={note || ''}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Nota u observación (opcional, ej: llegó 8:15)"
            className="flex-1 px-3 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-hidden bg-white/80"
          />
          {note && (
            <button
              onClick={() => onNoteChange('')}
              className="text-slate-400 hover:text-slate-600 p-1 text-xs"
              title="Borrar nota"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
