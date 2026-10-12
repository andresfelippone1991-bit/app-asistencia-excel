import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Download, Upload, Key, HelpCircle, LogOut } from 'lucide-react';
import { AppSettings } from '../types';
import { storageService } from '../services/storageService';
import { googleSheetsService } from '../services/googleSheetsService';
import { googleAuthService, GoogleAuthState } from '../services/googleAuthService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onOpenGuide: () => void;
  onDataRestored: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onOpenGuide,
  onDataRestored,
  showToast,
}) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [clientId, setClientId] = useState(googleAuthService.getClientId());
  const [authState, setAuthState] = useState<GoogleAuthState>(googleAuthService.getState());
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return googleAuthService.subscribe((state) => {
      setAuthState(state);
    });
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    googleAuthService.setClientId(clientId);
    onSaveSettings(form);
    showToast('success', 'Configuración guardada correctamente');
    onClose();
  };

  const handleGoogleSignIn = async () => {
    if (!clientId.trim()) {
      showToast(
        'error',
        'Por favor ingresa tu Google Client ID antes de iniciar sesión'
      );
      return;
    }

    setIsSigningIn(true);
    googleAuthService.setClientId(clientId);

    try {
      await googleAuthService.signIn(clientId.trim());
      showToast('success', '¡Sesión iniciada con Google exitosamente!');
    } catch (err: any) {
      showToast('error', err.message || 'Error al iniciar sesión con Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleTestUrl = async () => {
    if (!form.globalAppsScriptUrl.trim()) {
      showToast('error', 'Por favor ingresa una URL de Google Apps Script');
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      await googleSheetsService.testConnection(form.globalAppsScriptUrl.trim(), '');
      setTestResult('¡Conexión verificada con éxito!');
      showToast('success', 'Conexión con Google Apps Script verificada');
    } catch (err: any) {
      setTestResult(`Error: ${err.message || 'No se pudo conectar'}`);
      showToast('error', 'Fallo al verificar conexión');
    } finally {
      setTesting(false);
    }
  };

  const handleExport = () => {
    storageService.exportBackup();
    showToast('success', 'Archivo de respaldo exportado');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { coursesCount } = await storageService.importBackup(file);
      onDataRestored();
      showToast('success', `Copia restaurada (${coursesCount} cursos)`);
      onClose();
    } catch (err) {
      showToast('error', 'El archivo seleccionado no es un respaldo válido');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
            <h2 className="text-lg font-bold text-slate-900">Configuración</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 text-sm max-h-[75vh] overflow-y-auto">
            {/* Método 1: Google OAuth (Directo) */}
            <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Método Directo: Iniciar Sesión con Google
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                  Sin código ni Apps Script
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Al conectar tu cuenta de Google, solo tendrás que <strong>pegar el enlace de tu planilla</strong> (o elegirla de Drive) y la app guardará todo automáticamente.
              </p>

              {authState.isAuthenticated ? (
                <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {authState.user?.picture ? (
                      <img
                        src={authState.user.picture}
                        alt="Avatar"
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-xs text-slate-900 leading-tight">
                        {authState.user?.name || 'Conectado'}
                      </p>
                      <p className="text-[11px] text-slate-500">{authState.user?.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => googleAuthService.signOut()}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Desconectar
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Google OAuth Client ID
                      </label>
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-600 hover:underline font-medium"
                      >
                        Abrir Google Cloud Console &rarr;
                      </a>
                    </div>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="123456789-xxxxxxx.apps.googleusercontent.com"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono outline-hidden bg-white"
                    />
                  </div>

                  {/* Quick mini-guide */}
                  <details className="bg-white/80 border border-indigo-100 rounded-xl p-2.5 text-[11px] text-slate-600">
                    <summary className="font-semibold text-indigo-700 cursor-pointer select-none">
                      ¿Cómo crear mi Client ID gratis en 2 minutos? (Ver pasos)
                    </summary>
                    <ol className="list-decimal list-inside space-y-1.5 mt-2 pl-1 text-slate-700">
                      <li>
                        Ve a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium">console.cloud.google.com</a> y crea un <strong>Proyecto nuevo</strong>.
                      </li>
                      <li>
                        En <strong>APIs y servicios &gt; Biblioteca</strong>, busca y habilita: <strong>Google Sheets API</strong> y <strong>Google Drive API</strong>.
                      </li>
                      <li>
                        En <strong>Pantalla de consentimiento de OAuth</strong>, elige <em>Externo</em>, pon un nombre, y en <strong>Usuarios de prueba (Test users)</strong> agrega tu propio correo de Gmail.
                      </li>
                      <li>
                        En <strong>Credenciales &gt; Crear credenciales &gt; ID de cliente de OAuth</strong>, elige <strong>Aplicación web</strong>.
                      </li>
                      <li>
                        En <strong>Orígenes de JavaScript autorizados</strong>, agrega <code>http://localhost:5173</code> (y luego tu URL de Vercel/Netlify).
                      </li>
                      <li>Copia el <strong>ID de cliente</strong> generado y pégalo arriba.</li>
                    </ol>
                  </details>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn || !clientId.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  >
                    {/* Google G Logo */}
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
                    <span>{isSigningIn ? 'Iniciando sesión...' : 'Iniciar Sesión con Google'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Método 2: Apps Script Webhook (Alternativa) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Key className="w-4 h-4 text-slate-500" />
                  Método Alternativo: Google Apps Script Webhook
                </label>
                <button
                  type="button"
                  onClick={onOpenGuide}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Ver Guía
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Si prefieres usar un script en tu Google Sheet en lugar de Google OAuth, pega aquí la URL terminada en <code>/exec</code>.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={form.globalAppsScriptUrl}
                  onChange={(e) => setForm({ ...form, globalAppsScriptUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleTestUrl}
                  disabled={testing || !form.globalAppsScriptUrl.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                >
                  {testing ? '...' : 'Probar'}
                </button>
              </div>
              {testResult && (
                <p
                  className={`text-xs font-medium ${
                    testResult.startsWith('¡') ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {testResult}
                </p>
              )}
            </div>

            {/* Format & defaults */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Formato de Fecha
                </label>
                <select
                  value={form.dateFormat}
                  onChange={(e) =>
                    setForm({ ...form, dateFormat: e.target.value as 'DD/MM' | 'DD/MM/YYYY' })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
                >
                  <option value="DD/MM">DD/MM (Ej: 12/03)</option>
                  <option value="DD/MM/YYYY">DD/MM/AAAA (Ej: 12/03/2026)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pestaña por Defecto
                </label>
                <input
                  type="text"
                  value={form.defaultTabName}
                  onChange={(e) => setForm({ ...form, defaultTabName: e.target.value })}
                  placeholder="Asistencia"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>

            {/* Auto-mark all present */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="font-semibold text-xs text-slate-800 block">
                  Autocompletar con "Presente"
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Al abrir la lista, marcar a todos los alumnos como Presente por defecto
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.autoMarkAllPresent}
                onChange={(e) => setForm({ ...form, autoMarkAllPresent: e.target.checked })}
                className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
            </div>

            {/* Backup & Restore */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Copias de Seguridad (Backup)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Copia (JSON)
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Restaurar Copia
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
              </div>
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
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
