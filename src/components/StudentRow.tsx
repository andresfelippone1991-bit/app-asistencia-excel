import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import type { AttendanceStatus, Student } from '../types';

interface StudentRowProps {
  index: number;
  student: Student;
  status: AttendanceStatus;
  note?: string;
  onStatusChange: (status: AttendanceStatus) => void;
  onNoteChange: (note: string) => void;
}

const CYCLE_ORDER: Record<string, AttendanceStatus> = {
  P: 'A',
  A: 'T',
  T: 'J',
  J: 'P',
  '': 'P',
};

const STATUS_CONFIG: Record<
  'P' | 'A' | 'T' | 'J',
  {
    label: string;
    rowBg: string;
    btnClass: string;
  }
> = {
  P: {
    label: 'Presente',
    rowBg: 'bg-emerald-50/30 border-emerald-200/70',
    btnClass:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 ring-2 ring-emerald-600/20',
  },
  A: {
    label: 'Ausente',
    rowBg: 'bg-rose-50/40 border-rose-200/80',
    btnClass:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 ring-2 ring-rose-600/20',
  },
  T: {
    label: 'Tarde',
    rowBg: 'bg-amber-50/40 border-amber-200/80',
    btnClass:
      'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200 ring-2 ring-amber-500/20',
  },
  J: {
    label: 'Justificada',
    rowBg: 'bg-blue-50/40 border-blue-200/80',
    btnClass:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200 ring-2 ring-blue-600/20',
  },
};

export const StudentRow: React.FC<StudentRowProps> = ({
  index,
  student,
  status,
  note,
  onStatusChange,
  onNoteChange,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(Boolean(note));

  const currentStatus: 'P' | 'A' | 'T' | 'J' =
    status === 'A' || status === 'T' || status === 'J' ? status : 'P';

  const config = STATUS_CONFIG[currentStatus];

  const handleCycleStatus = () => {
    const nextStatus = CYCLE_ORDER[currentStatus] || 'P';
    onStatusChange(nextStatus);
  };

  return (
    <div
      className={`p-3 sm:px-4 sm:py-3 rounded-xl border transition-all duration-150 flex flex-col gap-2 ${config.rowBg}`}
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

        {/* Single cycling attendance button (P -> A -> T -> J) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCycleStatus}
            className={`min-w-[110px] sm:min-w-[125px] h-10 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between gap-2 transition-all active:scale-95 select-none cursor-pointer ${config.btnClass}`}
            title="Toca para cambiar entre P (Presente), A (Ausente), T (Tarde) y J (Justificada)"
          >
            <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-sm font-black">
              {currentStatus}
            </span>
            <span className="flex-1 text-center tracking-wide">{config.label}</span>
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
