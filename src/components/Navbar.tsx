import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Settings, BookOpen, Plus, ShieldCheck, AlertCircle, LogOut } from 'lucide-react';
import { googleAuthService, GoogleAuthState } from '../services/googleAuthService';

interface NavbarProps {
  isConfigured: boolean;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onNewCourse: () => void;
  onGoogleSignIn: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConfigured,
  onOpenSettings,
  onOpenGuide,
  onNewCourse,
  onGoogleSignIn,
}) => {
  const [authState, setAuthState] = useState<GoogleAuthState>(googleAuthService.getState());
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    return googleAuthService.subscribe((state) => {
      setAuthState(state);
    });
  }, []);

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
          {/* Direct Google Sign-In Button */}
          {authState.isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors text-xs text-emerald-800 font-medium"
              >
                {authState.user?.picture ? (
                  <img
                    src={authState.user.picture}
                    alt="Perfil"
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {authState.user?.name ? authState.user.name[0] : 'G'}
                  </div>
                )}
                <span className="hidden md:inline font-semibold">
                  {authState.user?.name?.split(' ')[0] || 'Google Conectado'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-10 z-30 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{authState.user?.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{authState.user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        googleAuthService.signOut();
                      }}
                      className="w-full text-left px-3 py-2 mt-1 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Cerrar sesión de Google
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all hover:border-slate-300"
              title="Iniciar sesión con Google para sincronizar sin Apps Script"
            >
              {/* Google G icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Conectar Google</span>
            </button>
          )}

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
