import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Volume2,
  VolumeX,
  Shield,
  User,
  Play,
  Settings,
  Users,
  Palette,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { UserSession, AppThemeId } from '../types';
import { toKhmerNum } from '../utils/khmer';
import { APP_THEMES } from '../services/theme';
import { KhmerLatticeBar } from './KhmerOrnaments';

interface NavbarProps {
  session: UserSession;
  activeTab: 'play' | 'admin';
  onTabChange: (tab: 'play' | 'admin') => void;
  onLogout: () => void;
  onlineCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  currentTheme: AppThemeId;
  onOpenThemeModal: () => void;
  notificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  activeTab,
  onTabChange,
  onLogout,
  onlineCount,
  isMuted,
  onToggleMute,
  currentTheme,
  onOpenThemeModal,
  notificationsCount = 0,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentThemeConfig = APP_THEMES.find((t) => t.id === currentTheme) || APP_THEMES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleOpenMessenger = () => {
    window.dispatchEvent(new CustomEvent('open-messenger-widget'));
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 app-nav backdrop-blur-md border-b shadow-sm">
      <KhmerLatticeBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Logo */}
          <button
            type="button"
            onClick={() => onTabChange('play')}
            className="flex items-center gap-3 cursor-pointer shrink-0 text-left focus-visible:outline-none"
          >
            <div className="p-0.5 rounded-full border border-[var(--theme-gold)]/75 bg-[var(--theme-bg-surface)]">
              <img
                src="https://i.postimg.cc/0ygmLdvR/3QCM_Ep4.png"
                alt="Master Quiz KH Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover"
              />
            </div>
            <span className="font-moul text-sm sm:text-base app-text-primary whitespace-nowrap">
              MASTER QUIZ KH
            </span>
          </button>

          {/* Center Mode Switch (Admin) or Subtitle */}
          {session.role === 'admin' ? (
            <div className="hidden md:flex items-center app-subcard p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => onTabChange('play')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'play'
                    ? 'khmer-btn-primary shadow-sm'
                    : 'app-text-secondary hover:opacity-80'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>ធ្វើតេស្ត</span>
              </button>
              <button
                type="button"
                onClick={() => onTabChange('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin'
                    ? 'khmer-btn-crimson shadow-sm'
                    : 'app-text-secondary hover:opacity-80'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>គ្រប់គ្រង</span>
              </button>
            </div>
          ) : (
            <div className="hidden lg:block text-sm font-medium app-text-secondary whitespace-nowrap">
              ប្រព័ន្ធធ្វើតេស្តត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ
            </div>
          )}

          {/* Right Area: Online Count + Unified Menu Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
              <Users className="w-4 h-4" />
              <span className="tabular-nums">{toKhmerNum(onlineCount || 1)}</span>
              <span className="hidden sm:inline">កំពុងសិក្សា</span>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition cursor-pointer font-semibold text-sm ${
                  isMenuOpen
                    ? 'khmer-soft-surface border-[var(--theme-gold)]'
                    : 'app-card hover:opacity-90'
                }`}
                title="បើកម៉ឺនុយកម្មវិធី"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                {session.role === 'admin' ? (
                  <Shield className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                ) : (
                  <User className="w-4 h-4 khmer-accent-text shrink-0" />
                )}

                <span className="hidden sm:inline truncate max-w-[110px]">
                  {session.username}
                </span>

                <span className="text-sm">ម៉ឺនុយ</span>
                {isMenuOpen ? (
                  <X className="w-4 h-4 shrink-0" />
                ) : (
                  <Menu className="w-4 h-4 shrink-0" />
                )}
              </button>

              {/* DROPDOWN MENU FLYOUT */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl khmer-frame-card shadow-xl p-3 z-50">
                  {/* Profile Header */}
                  <div className="p-3 mb-2 rounded-xl app-subcard flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl khmer-btn-primary flex items-center justify-center font-bold text-base shrink-0">
                      {session.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate app-text-primary">
                        {session.username}
                      </p>
                      <p className="text-xs app-text-muted mt-0.5">
                        {session.role === 'admin' ? 'អ្នកគ្រប់គ្រង (Admin)' : 'សមាជិក (Member)'} · កំពុងដំណើរការ
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Navigation (Mobile Admin Switcher Only) */}
                  {session.role === 'admin' && (
                    <div className="md:hidden space-y-1 mb-2 pb-2 border-b app-border">
                      <p className="text-xs font-bold app-text-muted px-2.5 py-1">
                        ទំព័រមេ និងផ្នែក
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          onTabChange('play');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                          activeTab === 'play'
                            ? 'khmer-btn-primary'
                            : 'app-text-primary hover:bg-[var(--theme-bg-hover)]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Play className="w-4 h-4" />
                          <span>ធ្វើតេស្តវិញ្ញាសា</span>
                        </span>
                        {activeTab === 'play' && (
                          <span className="text-xs font-bold">បច្ចុប្បន្ន</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onTabChange('admin');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                          activeTab === 'admin'
                            ? 'khmer-btn-crimson'
                            : 'app-text-primary hover:bg-[var(--theme-bg-hover)]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Settings className="w-4 h-4" />
                          <span>ផ្ទាំងគ្រប់គ្រង (Admin)</span>
                        </span>
                        {activeTab === 'admin' && (
                          <span className="text-xs font-bold">បច្ចុប្បន្ន</span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Section 2: Preferences */}
                  <div className="space-y-1 mb-2 pb-2 border-b app-border">
                    <p className="text-xs font-bold app-text-muted px-2.5 py-1">
                      ការកំណត់ និងរចនាប័ទ្ម
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        onOpenThemeModal();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium app-text-primary hover:bg-[var(--theme-bg-hover)] transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Palette className="w-4 h-4 khmer-gold-text" />
                        <span>រចនាប័ទ្មពណ៌</span>
                      </span>
                      <span className="text-xs font-semibold app-text-secondary">
                        {currentThemeConfig.emoji} {currentThemeConfig.nameKhmer}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={onToggleMute}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium app-text-primary hover:bg-[var(--theme-bg-hover)] transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        {isMuted ? (
                          <VolumeX className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span>សំឡេងឆ្លើយតប</span>
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          !isMuted
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {!isMuted ? 'កំពុងបើក' : 'បានបិទ'}
                      </span>
                    </button>
                  </div>

                  {/* Section 3: Communication */}
                  <div className="space-y-1 mb-2 pb-2 border-b app-border">
                    <button
                      type="button"
                      onClick={handleOpenMessenger}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium app-text-primary hover:bg-[var(--theme-bg-hover)] transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 khmer-accent-text" />
                        <span>ដំណឹង និងផ្ញើមតិយោបល់</span>
                      </span>
                      {notificationsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md khmer-btn-crimson font-bold text-xs tabular-nums">
                          {toKhmerNum(notificationsCount)}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Section 4: Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ចាកចេញពីប្រព័ន្ធ</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
