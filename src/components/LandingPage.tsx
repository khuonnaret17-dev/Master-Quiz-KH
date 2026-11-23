import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Lock, Send, AlertCircle, ArrowRight, X, Palette, Bot } from 'lucide-react';
import { recordLogin } from '../services/firebase';
import { UserSession, AppThemeId } from '../types';
import { getStoredTheme, APP_THEMES } from '../services/theme';
import { ThemeSelectorModal } from './ThemeSelectorModal';
import { FloatingMessengerWidget } from './FloatingMessengerWidget';
import {
  KhmerLatticeBar,
  KhmerLotusCrest,
  KhmerLotusDivider,
  KhmerCornerMotif,
} from './KhmerOrnaments';

interface LandingPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const [activeModal, setActiveModal] = useState<'member' | 'admin' | null>(null);
  const [currentTheme, setCurrentTheme] = useState<AppThemeId>(() => getStoredTheme());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail) setCurrentTheme(e.detail);
    };
    window.addEventListener('appthemechange', handleThemeChange);
    return () => window.removeEventListener('appthemechange', handleThemeChange);
  }, []);

  const currentThemeConfig = APP_THEMES.find((t) => t.id === currentTheme) || APP_THEMES[0];

  // Member form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [memberError, setMemberError] = useState('');

  // Admin form state
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState('');

  // Validate member passcode: 6 digits, starts with 20, ends with 26
  const validateMemberPasscode = (code: string): boolean => {
    return /^20\d{2}26$/.test(code);
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');

    if (!username.trim()) {
      setMemberError('សូមបញ្ចូលឈ្មោះអ្នកប្រើប្រាស់ (Username)!');
      return;
    }

    if (!password.trim()) {
      setMemberError('សូមបញ្ចូលលេខសម្ងាត់ ៦ខ្ទង់!');
      return;
    }

    if (!validateMemberPasscode(password)) {
      setMemberError('លេខសម្ងាត់មិនត្រឹមត្រូវទេ! សូមពិនិត្យម្ដងទៀត ឬទាក់ទង Admin ដើម្បីទទួលបានកូដសមាជិក។');
      return;
    }

    const session: UserSession = {
      username: username.trim(),
      role: 'user',
      loggedInAt: new Date().toISOString(),
    };

    await recordLogin(session.username, password, 'user');
    onLoginSuccess(session);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    if (adminCode.trim() !== '168') {
      setAdminError('លេខកូដ Master Code មិនត្រឹមត្រូវទេ! សូមពិនិត្យលេខកូដម្ដងទៀត។');
      return;
    }

    const session: UserSession = {
      username: 'Admin Master',
      role: 'admin',
      loggedInAt: new Date().toISOString(),
    };

    await recordLogin('Admin Master', adminCode, 'admin');
    onLoginSuccess(session);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between app-canvas">
      <div>
        <KhmerLatticeBar />

        {/* Top Bar */}
        <div className="w-full max-w-5xl mx-auto px-4 pt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('open-command-bot', { detail: { command: '/register' } })
              )
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl khmer-frame-card text-xs sm:text-sm font-bold khmer-accent-text hover:opacity-90 transition cursor-pointer"
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span>ណែនាំចុះឈ្មោះ (Command Bot)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl khmer-frame-card text-sm font-semibold hover:opacity-90 transition cursor-pointer"
            title={`ប្តូររចនាប័ទ្ម (Theme: ${currentThemeConfig.nameKhmer})`}
          >
            <Palette className="w-4 h-4 khmer-gold-text" />
            <span>{currentThemeConfig.emoji} {currentThemeConfig.nameKhmer}</span>
          </button>
        </div>

        {/* Header Section */}
        <header className="w-full max-w-4xl mx-auto pt-4 pb-4 px-4 text-center">
          <div className="space-y-1 mb-4">
            <KhmerLotusCrest size={56} className="mx-auto mb-1.5" />
            <p className="font-moul khmer-gold-text text-lg sm:text-xl">
              ព្រះរាជាណាចក្រកម្ពុជា
            </p>
            <p className="font-siemreap app-text-secondary text-sm sm:text-base font-semibold tracking-wider">
              ជាតិ · សាសនា · ព្រះមហាក្សត្រ
            </p>
            <KhmerLotusDivider width={220} className="mx-auto pt-1" />
          </div>

          <div className="flex justify-center mb-4">
            <div className="p-1.5 rounded-full border-2 border-[var(--theme-gold)]/70 bg-[var(--theme-bg-surface)] shadow-md">
              <img
                src="https://i.postimg.cc/0ygmLdvR/3QCM_Ep4.png"
                alt="Master Quiz KH Logo"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
              />
            </div>
          </div>

          <h1 className="font-moul text-2xl sm:text-4xl app-text-primary tracking-wide mb-2.5">
            MASTER QUIZ KH
          </h1>
          <p className="app-text-secondary font-kantumruy text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            ប្រព័ន្ធគ្រប់គ្រង និងធ្វើតេស្តសមត្ថភាពត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ (QCM, Q&A, ពន្យល់ពាក្យ)
          </p>
        </header>
      </div>

      {/* Main Role Selection */}
      <main className="w-full max-w-3xl mx-auto px-4 py-6 flex-1 flex flex-col items-center justify-center">
        <p className="app-text-secondary text-sm sm:text-base font-semibold mb-6 text-center">
          សូមជ្រើសរើសតួនាទីដើម្បីចូលប្រព័ន្ធ
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Member Card */}
          <div
            onClick={() => setActiveModal('member')}
            className="relative khmer-ornate-card rounded-2xl p-7 sm:p-8 flex flex-col items-center text-center cursor-pointer hover:border-[var(--theme-accent)] transition hover:shadow-lg"
          >
            <KhmerCornerMotif position="tl" size={34} />
            <KhmerCornerMotif position="tr" size={34} />

            <div className="w-14 h-14 rounded-2xl khmer-btn-primary flex items-center justify-center mb-4 shadow-sm">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="font-moul text-lg sm:text-xl app-text-primary mb-2">
              សមាជិក (Member)
            </h2>
            <p className="app-text-secondary text-sm leading-relaxed mb-6 flex-1">
              សម្រាប់បេក្ខជនធ្វើតេស្តសមត្ថភាព ហ្វឹកហាត់វិញ្ញាសា QCM, Q&A និងស្វែងយល់វាក្យសព្ទរដ្ឋបាល
            </p>
            <button
              type="button"
              className="w-full py-3 px-4 rounded-xl khmer-btn-primary font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ចូលធ្វើតេស្ត</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Card */}
          <div
            onClick={() => setActiveModal('admin')}
            className="relative khmer-ornate-card rounded-2xl p-7 sm:p-8 flex flex-col items-center text-center cursor-pointer hover:border-rose-700 transition hover:shadow-lg"
          >
            <KhmerCornerMotif position="tl" size={34} />
            <KhmerCornerMotif position="tr" size={34} />

            <div className="w-14 h-14 rounded-2xl khmer-btn-crimson flex items-center justify-center mb-4 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="font-moul text-lg sm:text-xl app-text-primary mb-2">
              អ្នកគ្រប់គ្រង (Admin)
            </h2>
            <p className="app-text-secondary text-sm leading-relaxed mb-6 flex-1">
              សម្រាប់អ្នកគ្រប់គ្រង បញ្ចូលវិញ្ញាសាថ្មី បញ្ចូលសំណួរជាដុំ បាញ់ Telegram និង Export PDF
            </p>
            <button
              type="button"
              className="w-full py-3 px-4 rounded-xl khmer-btn-crimson font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ចូលផ្ទាំងគ្រប់គ្រង</span>
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer Telegram Links */}
      <footer className="w-full py-6 px-4 text-center border-t app-border app-card">
        <KhmerLotusDivider width={180} className="mx-auto mb-3" />
        <p className="text-sm app-text-secondary mb-2 font-medium">
          Master Quiz KH · ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋកម្ពុជា
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold">
          <a
            href="https://t.me/qcm_and_q_a"
            target="_blank"
            rel="noopener noreferrer"
            className="khmer-accent-text hover:underline flex items-center gap-1.5 transition"
          >
            <Send className="w-4 h-4" />
            <span>ទំនាក់ទំនង Telegram (@qcm_and_q_a)</span>
          </a>
          <span className="app-text-muted">·</span>
          <a
            href="https://t.me/qiuzs_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="khmer-gold-text hover:underline flex items-center gap-1.5 transition"
          >
            <Send className="w-4 h-4" />
            <span>Telegram Bot (@qiuzs_bot)</span>
          </a>
          <span className="app-text-muted">·</span>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('open-command-bot', { detail: { command: '/register' } }))
            }
            className="khmer-accent-text hover:underline flex items-center gap-1.5 transition cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>ណែនាំចុះឈ្មោះ (Command Bot)</span>
          </button>
        </div>
      </footer>

      {/* Modal: Member Login */}
      {activeModal === 'member' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="khmer-ornate-card w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <KhmerCornerMotif position="tl" size={28} />
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 app-text-muted hover:opacity-75 p-1.5 rounded-lg transition cursor-pointer"
              aria-label="បិទ"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 mt-1">
              <div className="w-11 h-11 rounded-xl khmer-btn-primary flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-moul text-base sm:text-lg app-text-primary">ចូលជាសមាជិក</h3>
                <p className="text-sm app-text-secondary">វាយឈ្មោះ និងលេខកូដ ៦ខ្ទង់</p>
              </div>
            </div>

            {memberError && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{memberError}</span>
              </div>
            )}

            <form onSubmit={handleMemberLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold app-text-primary mb-1.5">
                  ឈ្មោះអ្នកប្រើប្រាស់ (Username) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ឧ. បូរ៉ា ឬ Dara"
                  className="w-full px-3.5 py-2.5 rounded-xl app-input text-sm transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold app-text-primary mb-1.5">
                  លេខសម្ងាត់ ៦ខ្ទង់ (Passcode) <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl app-input text-base font-mono tracking-widest transition"
                />
                <p className="text-xs app-text-secondary mt-2 leading-relaxed">
                  * សូមបញ្ចូលលេខសម្ងាត់សមាជិក ៦ខ្ទង់ ដែលផ្ដល់ដោយ Admin
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl khmer-btn-primary font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>ផ្ទៀងផ្ទាត់ និងចូលធ្វើតេស្ត</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t app-border text-center">
              <p className="text-sm app-text-secondary mb-3">មិនទាន់ចេះចុះឈ្មោះ ឬមិនទាន់មានលេខសម្ងាត់សមាជិក?</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    window.dispatchEvent(
                      new CustomEvent('open-command-bot', { detail: { command: '/register' } })
                    );
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl app-subcard khmer-accent-text text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-80 transition cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>មើលការណែនាំចុះឈ្មោះតាម Command Bot (/register)</span>
                </button>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <a
                    href="https://t.me/qcm_and_q_a"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3.5 py-2 rounded-xl app-subcard khmer-accent-text text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-80 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ទាក់ទង Admin (@qcm_and_q_a)</span>
                  </a>
                  <a
                    href="https://t.me/qiuzs_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3.5 py-2 rounded-xl app-subcard khmer-gold-text text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-80 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram Bot (@qiuzs_bot)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Login */}
      {activeModal === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="khmer-ornate-card w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <KhmerCornerMotif position="tl" size={28} />
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 app-text-muted hover:opacity-75 p-1.5 rounded-lg transition cursor-pointer"
              aria-label="បិទ"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 mt-1">
              <div className="w-11 h-11 rounded-xl khmer-btn-crimson flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-moul text-base sm:text-lg app-text-primary">ផ្ទាំងគ្រប់គ្រង (Admin)</h3>
                <p className="text-sm app-text-secondary">បញ្ចូលលេខកូដ Master Code របស់អ្នកគ្រប់គ្រង</p>
              </div>
            </div>

            {adminError && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold app-text-primary mb-1.5">
                  Master Code សម្ងាត់ <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="បញ្ចូលលេខកូដសម្ងាត់ Admin"
                  className="w-full px-3.5 py-2.5 rounded-xl app-input text-lg font-mono tracking-widest text-center transition"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl khmer-btn-crimson font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>ផ្ទៀងផ្ទាត់ និងចូលគ្រប់គ្រង</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Theme Selection Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={currentTheme}
        onThemeSelect={(t) => setCurrentTheme(t)}
      />

      {/* Command Bot Assistant for Registration & Guidance */}
      <FloatingMessengerWidget
        notifications={[]}
        session={null}
        onOpenMemberLogin={() => setActiveModal('member')}
      />
    </div>
  );
};
