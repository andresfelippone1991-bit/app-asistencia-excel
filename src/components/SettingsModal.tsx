import React, { useState, useRef } from 'react';
import { X, Check, Save, Download, Upload, RefreshCw, Key, HelpCircle } from 'lucide-react';
import { AppSettings } from '../types';
import { storageService } from '../services/storageService';
import { googleSheetsService } from '../services/googleSheetsService';

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    showToast('success', 'Configuración guardada correctamente');
    onClose();
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
      showToast('success', 'Conexión con Google Apps Script verificada exitosamente');
    } catch (err: any) {
      setTestResult(`Error: ${err.message || 'No se pudo conectar'}`);
      showToast('error', 'Fallo al verificar conexión. Revisa la URL.');
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
      showToast('success', `Copia de seguridad restaurada (${coursesCount} cursos)`);
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
            <h2 className="text-lg font-bold text-slate-900">Configuración General</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 text-sm">
            {/* Apps Script URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-600" />
                  URL de Google Apps Script
                </label>
                <button
                  type="button"
                  onClick={onOpenGuide}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  ¿Cómo obtenerla?
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Esta es la URL web terminada en <code>/exec</code> de tu Google Apps Script. Sirve para todos tus cursos.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={form.globalAppsScriptUrl}
                  onChange={(e) => setForm({ ...form, globalAppsScriptUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleTestUrl}
                  disabled={testing || !form.globalAppsScriptUrl.trim()}
                  className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                >
                  {testing ? 'Probando...' : 'Probar'}
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

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Formato de Fecha en Planilla
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
                  Nombre de Pestaña por Defecto
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
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Copias de Seguridad (Backup)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Copia (JSON)
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
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
