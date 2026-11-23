import React from 'react';
import { Palette, Check, X, Moon, Sun } from 'lucide-react';
import { AppThemeId } from '../types';
import { APP_THEMES, setStoredTheme } from '../services/theme';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppThemeId;
  onThemeSelect: (themeId: AppThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeSelect,
}) => {
  if (!isOpen) return null;

  const handleSelect = (themeId: AppThemeId) => {
    setStoredTheme(themeId);
    onThemeSelect(themeId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl khmer-ornate-card shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b app-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl khmer-btn-primary flex items-center justify-center shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-moul text-base sm:text-lg app-text-primary">
                ជ្រើសរើសរចនាប័ទ្ម (Theme Styles)
              </h3>
              <p className="text-xs sm:text-sm app-text-secondary">
                ជ្រើសរើសពណ៌ផ្ទៃ និងពណ៌អក្សរដែលអ្នកងាយស្រួលអានបំផុត
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl app-text-muted hover:opacity-75 transition cursor-pointer"
            title="បិទ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Theme Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {APP_THEMES.map((theme) => {
              const isSelected = currentTheme === theme.id;

              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => handleSelect(theme.id)}
                  className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-[var(--theme-accent)] ring-1 ring-[var(--theme-gold)]/50 app-subcard shadow-md'
                      : 'app-card hover:border-[var(--theme-gold)]/70'
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{theme.emoji}</span>
                        <div>
                          <h4 className="font-moul text-sm app-text-primary">
                            {theme.nameKhmer}
                          </h4>
                          <span className="text-xs app-text-muted font-medium">
                            {theme.nameEn}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {theme.isDark ? (
                          <span
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-200"
                            title="Dark Mode"
                          >
                            <Moon className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span
                            className="p-1.5 rounded-lg bg-amber-100 text-amber-800"
                            title="Light Mode"
                          >
                            <Sun className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {isSelected && (
                          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-bold khmer-accent-text mb-1">
                      {theme.taglineKhmer}
                    </p>

                    <p className="text-xs app-text-secondary leading-relaxed mb-3">
                      {theme.descriptionKhmer}
                    </p>
                  </div>

                  {/* Swatch & Preview Bar */}
                  <div className="w-full pt-2.5 border-t app-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-slate-400/50"
                        style={{ backgroundColor: theme.swatch.bg }}
                        title="Background"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-slate-400/50"
                        style={{ backgroundColor: theme.swatch.card }}
                        title="Card Surface"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-slate-400/50"
                        style={{ backgroundColor: theme.swatch.accent }}
                        title="Accent Color"
                      />
                    </div>

                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'app-text-muted'
                      }`}
                    >
                      {isSelected ? 'កំពុងប្រើប្រាស់ ✓' : 'ជ្រើសរើស'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t app-border flex items-center justify-between app-subcard text-xs sm:text-sm">
          <span className="app-text-secondary">
            ការកំណត់រចនាប័ទ្មនឹងត្រូវបានរក្សាទុកដោយស្វ័យប្រវត្តិ
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl khmer-btn-primary font-semibold cursor-pointer"
          >
            រួចរាល់
          </button>
        </div>
      </div>
    </div>
  );
};
