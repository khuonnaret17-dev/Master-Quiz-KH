import { AppThemeId, AppThemeConfig } from '../types';

export const APP_THEMES: AppThemeConfig[] = [
  {
    id: 'angkor_paper',
    nameKhmer: 'រចនាបថខ្មែរសាត្រា',
    nameEn: 'Khmer Silk & Gold (Default)',
    taglineKhmer: 'រចនាបថខ្មែរប្រពៃណី ថ្លៃថ្នូរ និងច្បាស់លាស់',
    descriptionKhmer: 'ផ្ទៃពណ៌ក្រដាសសាត្រាស្រទន់ រំលេចដោយពណ៌មាស និងហង្សបាទបុរាណ ងាយស្រួលអានមិនចាំងភ្នែក',
    emoji: '🏛️',
    isDark: false,
    swatch: {
      bg: '#f7f2e6',
      card: '#fffdf8',
      accent: '#9a3412',
      border: '#d5c5a3',
    },
  },
  {
    id: 'simple_light',
    nameKhmer: 'ខៀវរាជ & មាសខ្មែរ',
    nameEn: 'Royal Sapphire & Gold',
    taglineKhmer: 'ផ្លូវការ ខៀវរាជ អក្សរច្បាស់មុត',
    descriptionKhmer: 'ផ្ទៃពណ៌សភ្លឺស្អាត សម្រួលការអានវិញ្ញាសាផ្លូវការ ជាមួយស៊ុមមាសខ្មែរដ៏ប្រណីត',
    emoji: '☀️',
    isDark: false,
    swatch: {
      bg: '#f8f7f2',
      card: '#ffffff',
      accent: '#1e3a8a',
      border: '#d6ceb8',
    },
  },
  {
    id: 'royal_midnight',
    nameKhmer: 'រាត្រីប្រាសាទមាស',
    nameEn: 'Angkor Midnight Gold',
    taglineKhmer: 'ផ្ទៃងងឹត ច្បាស់ មិនចាំងភ្នែក',
    descriptionKhmer: 'រចនាប័ទ្មងងឹតរំលេចពណ៌មាសប្រពៃណី ជាមួយអក្សរសភ្លឺច្បាស់ ស័ក្តិសមសម្រាប់រៀនពេលយប់',
    emoji: '🌙',
    isDark: true,
    swatch: {
      bg: '#0b1120',
      card: '#111827',
      accent: '#d97706',
      border: '#3b485e',
    },
  },
  {
    id: 'emerald_forest',
    nameKhmer: 'បៃតងមរកតខ្មែរ',
    nameEn: 'Khmer Emerald Forest',
    taglineKhmer: 'ធម្មជាតិបៃតង ត្រជាក់ភ្នែក',
    descriptionKhmer: 'រចនាប័ទ្មបៃតងមរកតជួយបន្ធូរភាពនឿយហត់ភ្នែក និងបង្កើនការផ្ដោតអារម្មណ៍',
    emoji: '🌲',
    isDark: true,
    swatch: {
      bg: '#04150f',
      card: '#0a241b',
      accent: '#059669',
      border: '#1e5945',
    },
  },
  {
    id: 'ocean_sapphire',
    nameKhmer: 'ខៀវគង្គារ',
    nameEn: 'Royal Sapphire',
    taglineKhmer: 'ទំនើប និងច្បាស់លាស់',
    descriptionKhmer: 'រចនាប័ទ្មខៀវជ្រៅ ជាមួយអក្សរសភ្លឺច្បាស់លាស់ និងស៊ុមមាស',
    emoji: '🌊',
    isDark: true,
    swatch: {
      bg: '#061021',
      card: '#0d1d3a',
      accent: '#0284c7',
      border: '#254886',
    },
  },
  {
    id: 'lotus_saffron',
    nameKhmer: 'ផ្កាឈូកអង្គរ',
    nameEn: 'Angkor Lotus Crimson',
    taglineKhmer: 'កក់ក្តៅ និងថ្លៃថ្នូរ',
    descriptionKhmer: 'រចនាប័ទ្មពណ៌ស្វាយក្រហមព្រលឹម និងមាសអង្គរ ជាមួយអក្សរពណ៌សភ្លឺច្បាស់',
    emoji: '🪷',
    isDark: true,
    swatch: {
      bg: '#160813',
      card: '#240f20',
      accent: '#e11d48',
      border: '#5e2a54',
    },
  },
];

const STORAGE_KEY = 'master_quiz_app_theme_v2';

export function getStoredTheme(): AppThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as AppThemeId;
    if (saved && APP_THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch {
    // Fallback
  }
  return 'angkor_paper';
}

export function setStoredTheme(themeId: AppThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    // Ignore
  }
  applyThemeToDom(themeId);
}

export function applyThemeToDom(themeId: AppThemeId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);

  const themeConfig = APP_THEMES.find((t) => t.id === themeId);
  if (themeConfig?.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  window.dispatchEvent(new CustomEvent('appthemechange', { detail: themeId }));
}

// Initialize theme on initial script load
if (typeof window !== 'undefined') {
  const initialTheme = getStoredTheme();
  applyThemeToDom(initialTheme);
}
