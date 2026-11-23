import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Bell,
  Send,
  CheckCircle2,
  Bot,
  Terminal,
  ExternalLink,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { AppNotification, UserSession } from '../types';
import { submitFeedback } from '../services/firebase';
import { toKhmerNum } from '../utils/khmer';
import {
  BOT_COMMANDS_LIST,
  BotActionButton,
  BotCommandReply,
  resolveBotCommand,
} from '../utils/botCommands';

interface FloatingMessengerWidgetProps {
  notifications: AppNotification[];
  session?: UserSession | null;
  onOpenMemberLogin?: () => void;
}

interface BotChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  reply?: BotCommandReply;
  timestamp: string;
}

export const FloatingMessengerWidget: React.FC<FloatingMessengerWidgetProps> = ({
  notifications,
  session = null,
  onOpenMemberLogin,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bot' | 'notifs' | 'feedback'>(
    session ? 'notifs' : 'bot'
  );

  // Command Bot state
  const [botInput, setBotInput] = useState('');
  const [botMessages, setBotMessages] = useState<BotChatMessage[]>(() => [
    {
      id: 'init-welcome',
      sender: 'bot',
      reply: resolveBotCommand('/start'),
      timestamp: new Date().toISOString(),
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Feedback state
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const runBotCommand = (commandText: string) => {
    const clean = commandText.trim();
    if (!clean) return;

    const userMsg: BotChatMessage = {
      id: `u-${Date.now()}-${Math.random()}`,
      sender: 'user',
      text: clean,
      timestamp: new Date().toISOString(),
    };

    const reply = resolveBotCommand(clean);
    const botMsg: BotChatMessage = {
      id: `b-${Date.now()}-${Math.random()}`,
      sender: 'bot',
      reply,
      timestamp: new Date().toISOString(),
    };

    setBotMessages((prev) => [...prev, userMsg, botMsg]);
    setBotInput('');
  };

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    const handleOpenCommandBot = (e: Event) => {
      const customEvent = e as CustomEvent<{ command?: string }>;
      setIsOpen(true);
      setActiveTab('bot');
      if (customEvent?.detail?.command) {
        runBotCommand(customEvent.detail.command);
      }
    };
    window.addEventListener('open-messenger-widget', handleOpen);
    window.addEventListener('open-command-bot', handleOpenCommandBot);
    return () => {
      window.removeEventListener('open-messenger-widget', handleOpen);
      window.removeEventListener('open-command-bot', handleOpenCommandBot);
    };
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'bot') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [botMessages, isOpen, activeTab]);

  const handleBotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botInput.trim()) return;
    runBotCommand(botInput);
  };

  const handleBotActionClick = (action: BotActionButton) => {
    if (action.type === 'command') {
      runBotCommand(action.value);
    } else if (action.type === 'open_member_login') {
      if (onOpenMemberLogin) {
        setIsOpen(false);
        onOpenMemberLogin();
      } else {
        setBotMessages((prev) => [
          ...prev,
          {
            id: `logged-in-${Date.now()}`,
            sender: 'bot',
            reply: {
              command: '/status',
              title: '✅ អ្នកបានចូលប្រើប្រាស់គណនីរួចរាល់ហើយ',
              lines: [
                `គណនីបច្ចុប្បន្ន៖ ${session?.username || 'សមាជិក'}`,
                'អ្នកអាចជ្រើសរើសមុខវិជ្ជា និងចាប់ផ្ដើមធ្វើតេស្តលើទំព័រមេបានភ្លាមៗ!',
              ],
              actions: [
                { label: '💎 ការបង់ប្រាក់ KHQR (/payment)', type: 'command', value: '/payment' },
                { label: '📚 បញ្ជី Commands (/help)', type: 'command', value: '/help' },
              ],
            },
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }
  };

  const handleResetBotChat = () => {
    setBotMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'bot',
        reply: resolveBotCommand('/start'),
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setIsSubmitting(true);
    try {
      await submitFeedback(session?.username || 'ភ្ញៀវទូទៅ', feedbackText.trim());
      setFeedbackText('');
      setIsSent(true);
      setTimeout(() => setIsSent(false), 3000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            if (!session) setActiveTab('bot');
          }}
          className={
            session
              ? 'relative w-12 h-12 sm:w-14 sm:h-14 rounded-full khmer-btn-primary ring-2 ring-[var(--theme-gold)]/65 shadow-lg flex items-center justify-center transition-transform hover:scale-105 cursor-pointer'
              : 'relative px-4 py-3 rounded-2xl khmer-btn-primary ring-2 ring-[var(--theme-gold)]/75 shadow-xl flex items-center gap-2 font-bold text-xs sm:text-sm transition-transform hover:scale-105 cursor-pointer'
          }
          title="Command Bot ណែនាំចុះឈ្មោះ ដំណឹង និងមតិយោបល់"
        >
          {session ? (
            <MessageCircle className="w-6 h-6" />
          ) : (
            <>
              <Bot className="w-5 h-5 shrink-0" />
              <span>Command Bot ណែនាំ</span>
            </>
          )}
          {session && notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full khmer-btn-crimson font-bold text-xs flex items-center justify-center shadow">
              {toKhmerNum(notifications.length)}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-[410px] max-w-md rounded-2xl khmer-ornate-card shadow-2xl overflow-hidden flex flex-col max-h-[84vh] sm:max-h-[560px]">
          {/* Header */}
          <div className="p-4 khmer-btn-primary border-b-2 border-[var(--theme-gold)]/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 shrink-0" />
              <h3 className="font-moul text-sm">
                {activeTab === 'bot' ? 'Command Bot ណែនាំ' : 'ដំណឹង និងមតិយោបល់'}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {activeTab === 'bot' && (
                <button
                  type="button"
                  onClick={handleResetBotChat}
                  title="ចាប់ផ្ដើមសន្ទនាឡើងវិញ (/start)"
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
                aria-label="បិទ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex border-b app-border app-subcard p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('bot')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'bot'
                  ? 'app-card shadow-sm khmer-accent-text'
                  : 'app-text-secondary hover:opacity-80'
              }`}
            >
              <Bot className="w-3.5 h-3.5 shrink-0" />
              <span>Command Bot</span>
            </button>

            {session && (
              <button
                type="button"
                onClick={() => setActiveTab('notifs')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'notifs'
                    ? 'app-card shadow-sm khmer-accent-text'
                    : 'app-text-secondary hover:opacity-80'
                }`}
              >
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span>ដំណឹង ({toKhmerNum(notifications.length)})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'feedback'
                  ? 'app-card shadow-sm khmer-accent-text'
                  : 'app-text-secondary hover:opacity-80'
              }`}
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>មតិយោបល់</span>
            </button>
          </div>

          {/* Content Area */}
          {activeTab === 'bot' ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Quick Slash Command Bar */}
              <div className="px-3 py-2 border-b app-border app-subcard flex items-center gap-1.5 overflow-x-auto">
                <Terminal className="w-3.5 h-3.5 khmer-gold-text shrink-0" />
                {BOT_COMMANDS_LIST.map((cmd) => (
                  <button
                    key={cmd.command}
                    type="button"
                    onClick={() => runBotCommand(cmd.command)}
                    title={cmd.descriptionKh}
                    className="px-2.5 py-1 rounded-lg app-card text-xs font-mono font-bold khmer-accent-text hover:opacity-85 transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {cmd.command}
                  </button>
                ))}
              </div>

              {/* Conversation Thread */}
              <div className="p-3.5 overflow-y-auto flex-1 space-y-3">
                {botMessages.map((msg) =>
                  msg.sender === 'user' ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[82%] px-3.5 py-2 rounded-2xl rounded-tr-sm khmer-btn-primary text-xs sm:text-sm font-semibold font-mono">
                        {msg.text}
                      </div>
                    </div>
                  ) : msg.reply ? (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[94%] rounded-2xl rounded-tl-sm app-subcard p-3.5 space-y-2.5">
                        <p className="font-bold text-xs sm:text-sm khmer-accent-text">
                          {msg.reply.title}
                        </p>
                        <div className="text-xs sm:text-sm app-text-primary leading-relaxed space-y-1 whitespace-pre-line">
                          {msg.reply.lines.join('\n')}
                        </div>

                        {msg.reply.imageUrl && (
                          <div className="pt-1">
                            <div className="rounded-xl border app-border bg-white p-1.5 max-w-[230px] shadow-sm">
                              <img
                                src={msg.reply.imageUrl}
                                alt={msg.reply.imageAlt || 'Master Quiz KH'}
                                className="w-full h-auto rounded-lg object-contain"
                              />
                            </div>
                          </div>
                        )}

                        {msg.reply.actions.length > 0 && (
                          <div className="pt-2 border-t app-border flex flex-col gap-1.5">
                            {msg.reply.actions.map((act, idx) =>
                              act.type === 'url' ? (
                                <a
                                  key={idx}
                                  href={act.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2 px-3 rounded-xl app-card text-xs font-bold khmer-accent-text hover:opacity-85 flex items-center justify-between gap-2 transition"
                                >
                                  <span>{act.label}</span>
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                </a>
                              ) : (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleBotActionClick(act)}
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer ${
                                    act.type === 'open_member_login'
                                      ? 'khmer-btn-primary'
                                      : 'app-card app-text-primary hover:opacity-85'
                                  }`}
                                >
                                  <span>{act.label}</span>
                                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Command Input Box */}
              <form
                onSubmit={handleBotSubmit}
                className="p-3 border-t app-border app-subcard flex items-center gap-2"
              >
                <input
                  type="text"
                  value={botInput}
                  onChange={(e) => setBotInput(e.target.value)}
                  placeholder="វាយ Command ឧ. /register ឬ /help..."
                  className="flex-1 min-h-[40px] px-3 py-2 rounded-xl app-input text-xs sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={!botInput.trim()}
                  className="px-3.5 py-2 rounded-xl khmer-btn-primary text-xs sm:text-sm font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ផ្ញើ</span>
                </button>
              </form>
            </div>
          ) : activeTab === 'notifs' && session ? (
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm app-text-muted text-center py-6">មិនទាន់មានដំណឹងថ្មីទេ</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-xl border text-sm leading-relaxed ${
                      notif.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
                        : notif.type === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
                        : 'app-subcard'
                    }`}
                  >
                    <p className="font-kantumruy">{notif.message}</p>
                    <span className="block text-xs app-text-muted mt-1.5 font-mono">
                      {new Date(notif.timestamp).toLocaleString('km-KH')}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm app-text-secondary mb-3 font-kantumruy">
                សូមផ្ញើមតិយោបល់ សំណូមពរវិញ្ញាសា ឬរាយការណ៍បញ្ហាមកកាន់ Admin៖
              </p>

              {isSent && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>បានផ្ញើមតិយោបល់ជោគជ័យ! អរគុណច្រើន</span>
                </div>
              )}

              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="សរសេរមតិយោបល់របស់អ្នកនៅទីនេះ..."
                  className="w-full px-3.5 py-2.5 rounded-xl app-input text-sm"
                  required
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl khmer-btn-primary font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'កំពុងផ្ញើ...' : 'ផ្ញើមតិយោបល់'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
