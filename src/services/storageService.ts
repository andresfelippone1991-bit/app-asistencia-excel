import { AppSettings, Course } from '../types';
import { INITIAL_COURSES } from '../data/initialMockCourses';

const COURSES_STORAGE_KEY = 'app_asistencia_courses_v1';
const SETTINGS_STORAGE_KEY = 'app_asistencia_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  globalAppsScriptUrl: '',
  dateFormat: 'DD/MM',
  defaultTabName: 'Asistencia',
  autoMarkAllPresent: true,
  theme: 'light',
};

export const storageService = {
  getCourses(): Course[] {
    try {
      const data = localStorage.getItem(COURSES_STORAGE_KEY);
      if (!data) {
        // Save initial mock data
        localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(INITIAL_COURSES));
        return INITIAL_COURSES;
      }
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading courses from localStorage:', err);
      return INITIAL_COURSES;
    }
  },

  saveCourses(courses: Course[]): void {
    try {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
    } catch (err) {
      console.error('Error saving courses to localStorage:', err);
    }
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (err) {
      console.error('Error reading settings from localStorage:', err);
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('Error saving settings to localStorage:', err);
    }
  },

  exportBackup(): void {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      courses: this.getCourses(),
      settings: this.getSettings(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_asistencia_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importBackup(file: File): Promise<{ coursesCount: number }> {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.courses && Array.isArray(data.courses)) {
      this.saveCourses(data.courses);
    }
    if (data.settings) {
      this.saveSettings(data.settings);
    }

    return { coursesCount: data.courses?.length || 0 };
  },
};
