import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../data/googleAppsScriptCode';
import { googleSheetsService } from '../services/googleSheetsService';

interface AppsScriptGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSaveUrl: (url: string) => void;
}

export const AppsScriptGuideModal: React.FC<AppsScriptGuideModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSaveUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [testUrl, setTestUrl] = useState(currentUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTest = async () => {
    if (!testUrl.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await googleSheetsService.testConnection(testUrl.trim(), '');
      setTestResult({
        success: true,
        message: `¡Conexión exitosa! Planilla detectada: "${res.title}".`,
      });
      onSaveUrl(testUrl.trim());
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error al conectar con la URL especificada.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Guía de Conexión con Google Sheets
              </h2>
              <p className="text-xs text-slate-500">
                Solo debes hacer esto 1 vez en tu cuenta de Google para conectar todas tus planillas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 leading-relaxed">
          {/* Quick Explanation */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-indigo-950">
            <p className="font-medium mb-1 text-indigo-900">¿Cómo funciona?</p>
            <p className="text-xs leading-relaxed text-indigo-800">
              Esta app web se comunica de forma 100% segura y directa con tus planillas mediante un <strong>Google Apps Script</strong> personal. No necesitas configurar cuentas de desarrollador de Google Cloud ni pagar nada: el script corre directamente dentro de tu propio Google Drive.
            </p>
          </div>

          {/* Step 1: Copy Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                Copia el código del Script
              </h3>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Código Copiado!' : 'Copiar Código Completo'}
              </button>
            </div>
            <div className="relative">
              <pre className="p-3 bg-slate-900 text-slate-300 text-xs rounded-xl overflow-x-auto max-h-36 font-mono selection:bg-indigo-500 selection:text-white">
                {GOOGLE_APPS_SCRIPT_TEMPLATE.slice(0, 450)}
                {'\n... [Haz clic en el botón de arriba para copiar los 250 renglones completos]'}
              </pre>
            </div>
          </div>

          {/* Step 2: Paste in Google */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              Pega el código en Google Apps Script
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 pl-2">
              <li>
                Abre tu planilla de asistencia en Google Sheets o ve a{' '}
                <a
                  href="https://script.google.com/home/start"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 font-semibold underline inline-flex items-center gap-0.5"
                >
                  script.google.com <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
              <li>
                En el menú de tu planilla, ve a <strong>Extensiones</strong> &gt; <strong>Apps Script</strong>.
              </li>
              <li>
                Borra el código que aparezca por defecto en el editor y <strong>pega el código</strong> que copiaste en el paso 1.
              </li>
              <li>Guarda el proyecto haciendo clic en el icono del disquete (o Ctrl + S).</li>
            </ol>
          </div>

          {/* Step 3: Deploy */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</span>
              Implementar como Aplicación Web (Paso Clave)
            </h3>
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-2">
              <p className="font-semibold text-amber-950">Sigue exactamente estos 4 clics en Google Apps Script:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li>Arriba a la derecha, haz clic en el botón azul <strong>Implementar</strong> &gt; <strong>Nueva implementación</strong>.</li>
                <li>En el engranaje ⚙️ de la izquierda (Tipo), selecciona <strong>Aplicación web</strong>.</li>
                <li>En <strong>Ejecutar como</strong>: selecciona <em>Yo (tu correo)</em>.</li>
                <li>
                  En <strong>¿Quién tiene acceso?</strong>: selecciona <strong className="text-amber-950 underline">Cualquiera (Anyone)</strong>.
                  <span className="text-slate-500 block pl-4 mt-0.5">
                    (Esto es vital para que la App web en Netlify/Vercel o celular pueda comunicarse sin pedir login extra).
                  </span>
                </li>
                <li>Haz clic en <strong>Implementar</strong>, autoriza los permisos de Google y <strong>copia la URL de la aplicación web</strong> (termina en <code>/exec</code>).</li>
              </ul>
            </div>
          </div>

          {/* Step 4: Paste URL and test */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">4</span>
              Pega tu URL y pruébala aquí
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-mono"
              />
              <button
                onClick={handleTest}
                disabled={isTesting || !testUrl.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                {isTesting ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{isTesting ? 'Probando...' : 'Guardar y Probar'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}
              >
                {testResult.success && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                <p className="flex-1 leading-relaxed">{testResult.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-xs"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
