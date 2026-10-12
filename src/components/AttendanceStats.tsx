import React from 'react';
import { CheckCheck, RotateCcw, Search, Filter } from 'lucide-react';
import { AttendanceStatus } from '../types';

interface AttendanceStatsProps {
  total: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  justifiedCount: number;
  unmarkedCount: number;
  onMarkAllPresent: () => void;
  onClearAll: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: AttendanceStatus | 'all';
  onFilterChange: (f: AttendanceStatus | 'all') => void;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({
  total,
  presentCount,
  absentCount,
  lateCount,
  justifiedCount,
  unmarkedCount,
  onMarkAllPresent,
  onClearAll,
  searchQuery,
  onSearchChange,
  statusFilter,
  onFilterChange,
}) => {
  const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-4">
      {/* Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {/* Presentes */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
            Presentes
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-700">{presentCount}</span>
            <span className="text-xs font-semibold text-emerald-600">{percentage}%</span>
          </div>
        </div>

        {/* Ausentes */}
        <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
            Ausentes
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-rose-700">{absentCount}</span>
            <span className="text-xs text-rose-500">
              {total > 0 ? Math.round((absentCount / total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Tardes */}
        <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
            Tardes
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-700">{lateCount}</span>
            <span className="text-xs text-amber-600">alumnos</span>
          </div>
        </div>

        {/* Justificadas */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
            Justificadas
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-blue-700">{justifiedCount}</span>
            <span className="text-xs text-blue-600">alumnos</span>
          </div>
        </div>

        {/* Total / Pendientes */}
        <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Total Lista
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-800">{total}</span>
            {unmarkedCount > 0 && (
              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                {unmarkedCount} sin marcar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Batch actions & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por apellido o nombre..."
            className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
          />
        </div>

        {/* Quick actions buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMarkAllPresent}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold transition-colors"
            title="Marcar a todos los alumnos como Presentes"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Todos Presentes</span>
          </button>

          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition-colors"
            title="Limpiar todas las marcas"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 text-[11px] mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Ver:
        </span>
        <button
          onClick={() => onFilterChange('all')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos ({total})
        </button>
        <button
          onClick={() => onFilterChange('P')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
            statusFilter === 'P'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          Presentes ({presentCount})
        </button>
        <button
          onClick={() => onFilterChange('A')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
            statusFilter === 'A'
              ? 'bg-rose-600 text-white'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          }`}
        >
          Ausentes ({absentCount})
        </button>
        <button
          onClick={() => onFilterChange('T')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
            statusFilter === 'T'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          Tardes ({lateCount})
        </button>
        <button
          onClick={() => onFilterChange('J')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
            statusFilter === 'J'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          Justificadas ({justifiedCount})
        </button>
      </div>
    </div>
  );
};
