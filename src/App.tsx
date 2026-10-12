import { useState, useEffect } from 'react';
import { Plus, BookOpen, Search, ArrowRight, ShieldAlert, GraduationCap, CheckCircle2 } from 'lucide-react';
import type { Course, AppSettings } from './types';
import { storageService } from './services/storageService';
import { googleSheetsService } from './services/googleSheetsService';
import { googleAuthService, GoogleAuthState } from './services/googleAuthService';
import { Navbar } from './components/Navbar';
import { CourseCard } from './components/CourseCard';
import { CourseModal } from './components/CourseModal';
import { SettingsModal } from './components/SettingsModal';
import { AppsScriptGuideModal } from './components/AppsScriptGuideModal';
import { AttendanceTaker } from './components/AttendanceTaker';
import { Toast } from './components/Toast';
import type { ToastMessage } from './components/Toast';

import { isExcludedStudentRow, isSecondCuatrimestreStart } from './utils/cuatrimestreUtils';

export function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [authState, setAuthState] = useState<GoogleAuthState>(googleAuthService.getState());

  // Modals state
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [syncingCourseId, setSyncingCourseId] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchCourseQuery, setSearchCourseQuery] = useState('');

  // Load courses and auth subscription
  useEffect(() => {
    const rawCourses = storageService.getCourses();
    const cleanedCourses = rawCourses.map((c) => ({
      ...c,
      students: (c.students || []).filter(
        (s) => !isExcludedStudentRow(s.name, s.row) && !isSecondCuatrimestreStart(s.name, s.row)
      ),
    }));
    setCourses(cleanedCourses);
    storageService.saveCourses(cleanedCourses);

    return googleAuthService.subscribe((state) => {
      setAuthState(state);
    });
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      message,
      title,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  const handleSaveCourse = (updatedCourse: Course) => {
    let updatedCourses: Course[];
    const exists = courses.some((c) => c.id === updatedCourse.id);

    if (exists) {
      updatedCourses = courses.map((c) => (c.id === updatedCourse.id ? updatedCourse : c));
    } else {
      updatedCourses = [...courses, updatedCourse];
    }

    setCourses(updatedCourses);
    storageService.saveCourses(updatedCourses);

    if (selectedCourse?.id === updatedCourse.id) {
      setSelectedCourse(updatedCourse);
    }
  };

  const handleDeleteCourse = (courseId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este curso? No se borrarán los datos de tu Google Sheet.')) {
      const updated = courses.filter((c) => c.id !== courseId);
      setCourses(updated);
      storageService.saveCourses(updated);
      showToast('info', 'Curso eliminado');
    }
  };

  const handleSyncCourse = async (course: Course) => {
    const effectiveAppsScriptUrl = (course.appsScriptUrl || settings.globalAppsScriptUrl).trim();

    if (!course.spreadsheetId) {
      showToast('error', 'El curso no tiene un enlace o ID de Google Sheet configurado.');
      return;
    }

    setSyncingCourseId(course.id);

    try {
      const fetchedStudents = await googleSheetsService.fetchStudents(
        effectiveAppsScriptUrl,
        course.spreadsheetId,
        course.sheetName || 'Asistencia',
        course.startRow || 4,
        course.nameColumn || 'A'
      );

      if (fetchedStudents.length === 0) {
        showToast('info', 'No se encontraron alumnos en la fila indicada de la planilla');
      } else {
        const updatedCourse: Course = {
          ...course,
          students: fetchedStudents,
          lastSyncedAt: new Date().toISOString(),
        };

        handleSaveCourse(updatedCourse);
        showToast(
          'success',
          `Se actualizaron ${fetchedStudents.length} alumnos para "${course.name}"`
        );
      }
    } catch (err: any) {
      showToast('error', `Error al actualizar alumnos: ${err.message}`);
    } finally {
      setSyncingCourseId(null);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const q = searchCourseQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      (c.institution && c.institution.toLowerCase().includes(q))
    );
  });

  const totalStudentsAllCourses = courses.reduce((acc, c) => acc + c.students.length, 0);
  const isConnected = authState.isAuthenticated || Boolean(settings.globalAppsScriptUrl);

  const handleDirectGoogleSignIn = async () => {
    try {
      await googleAuthService.signIn();
      showToast('success', '¡Cuenta de Google conectada! Ahora la asistencia se guardará automáticamente.');
    } catch (err: any) {
      showToast('error', err.message || 'No se pudo iniciar sesión con Google.');
      setIsSettingsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Top Navbar */}
      <Navbar
        isConfigured={isConnected}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onNewCourse={() => {
          setCourseToEdit(null);
          setIsCourseModalOpen(true);
        }}
        onGoogleSignIn={handleDirectGoogleSignIn}
      />

      {/* Main Container */}
      <main className="flex-1">
        {selectedCourse ? (
          /* Attendance Taker View */
          <AttendanceTaker
            course={selectedCourse}
            globalAppsScriptUrl={settings.globalAppsScriptUrl}
            dateFormat={settings.dateFormat}
            autoMarkAllPresent={settings.autoMarkAllPresent}
            onBack={() => setSelectedCourse(null)}
            onAttendanceSaved={(updated) => {
              handleSaveCourse(updated);
            }}
            onSyncStudents={handleSyncCourse}
            showToast={showToast}
          />
        ) : (
          /* Courses Dashboard */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Info Banner for Direct URL Mode */}
            {!isConnected && (
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-emerald-950 text-sm">
                      ¡Modo Sin Configuración Activo! Solo pega el link de tu Google Sheet
                    </h3>
                    <p className="text-xs text-emerald-900/80 mt-0.5 leading-relaxed">
                      En tu planilla de Google Sheets toca <strong>"Compartir" &rarr; "Cualquier persona con el enlace"</strong>, pega el link al crear tu curso y la app leerá todos tus alumnos automáticamente sin configurar nada más.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCourseToEdit(null);
                    setIsCourseModalOpen(true);
                  }}
                  className="self-start sm:self-center flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Pegar Link de mi Curso</span>
                </button>
              </div>
            )}

            {/* Dashboard Welcome & Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-indigo-600" />
                  Mis Cursos y Materias
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona un curso para tomar asistencia hoy o vincular una nueva planilla.
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cursos</span>
                  <strong className="text-slate-900 text-sm font-bold">{courses.length}</strong>
                </div>
                <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Alumnos</span>
                  <strong className="text-slate-900 text-sm font-bold">{totalStudentsAllCourses}</strong>
                </div>
              </div>
            </div>

            {/* Search and Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchCourseQuery}
                  onChange={(e) => setSearchCourseQuery(e.target.value)}
                  placeholder="Buscar curso por nombre, materia o escuela..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white shadow-xs"
                />
              </div>

              <button
                onClick={() => {
                  setCourseToEdit(null);
                  setIsCourseModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nuevo Curso</span>
              </button>
            </div>

            {/* Course Cards Grid */}
            {filteredCourses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">No hay cursos registrados</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Agrega tu primer curso para conectar la planilla de Google Sheets y comenzar a tomar asistencia.
                </p>
                <button
                  onClick={() => {
                    setCourseToEdit(null);
                    setIsCourseModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear mi Primer Curso</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isSyncing={syncingCourseId === course.id}
                    onSelectCourse={(c) => setSelectedCourse(c)}
                    onEditCourse={(c) => {
                      setCourseToEdit(c);
                      setIsCourseModalOpen(true);
                    }}
                    onDeleteCourse={handleDeleteCourse}
                    onSyncCourse={handleSyncCourse}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Course Modal */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => {
          setIsCourseModalOpen(false);
          setCourseToEdit(null);
        }}
        courseToEdit={courseToEdit}
        globalAppsScriptUrl={settings.globalAppsScriptUrl}
        onSaveCourse={handleSaveCourse}
        showToast={showToast}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onOpenGuide={() => {
          setIsSettingsModalOpen(false);
          setIsGuideModalOpen(true);
        }}
        onDataRestored={() => {
          setCourses(storageService.getCourses());
          setSettings(storageService.getSettings());
        }}
        showToast={showToast}
      />

      {/* Apps Script Guide Modal */}
      <AppsScriptGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        currentUrl={settings.globalAppsScriptUrl}
        onSaveUrl={(url) => {
          handleSaveSettings({ ...settings, globalAppsScriptUrl: url });
          showToast('success', 'URL de Google Apps Script vinculada correctamente');
        }}
      />
    </div>
  );
}

export default App;
