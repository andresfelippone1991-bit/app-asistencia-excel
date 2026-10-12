import React from 'react';
import { ClipboardCheck, Settings, BookOpen, Plus, ShieldCheck, AlertCircle } from 'lucide-react';

interface NavbarProps {
  isConfigured: boolean;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onNewCourse: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConfigured,
  onOpenSettings,
  onOpenGuide,
  onNewCourse,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
              Asistencia Escolar
            </h1>
            <p className="text-xs text-slate-500 mt-1 hidden sm:block">
              Sincronización directa con Google Sheets
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Connection status badge */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse'
            }`}
            title={
              isConfigured
                ? 'Google Apps Script conectado'
                : 'Haz clic para vincular tu Google Apps Script'
            }
          >
            {isConfigured ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Sheets Conectado</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Configurar Sheets</span>
              </>
            )}
          </button>

          {/* Guide button */}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Guía de instalación del script en Google Sheets"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Guía Apps Script</span>
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Configuración"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Add Course button */}
          <button
            onClick={onNewCourse}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Curso</span>
            <span className="sm:hidden">Curso</span>
          </button>
        </div>
      </div>
    </header>
  );
};
