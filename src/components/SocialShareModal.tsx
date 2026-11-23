import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Smartphone,
  LayoutGrid,
  RefreshCw,
  Image as ImageIcon,
  Link2,
} from 'lucide-react';
import { KhmerCornerMotif } from './KhmerOrnaments';
import {
  ShareImageFormat,
  HostedShareInfo,
  shareImageNative,
  copyImageToClipboard,
  copyTextToClipboard,
  downloadImageDataUrl,
  publishShareCard,
  updateShareCardCaption,
  buildFacebookShareUrl,
  buildTelegramShareUrl,
  TIKTOK_UPLOAD_URL,
} from '../services/socialShare';

export interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialCaption: string;
  filenameBase: string;
  renderImage: (opts: { format: ShareImageFormat; showAnswer: boolean }) => Promise<string>;
  allowShowAnswerToggle?: boolean;
  defaultShowAnswer?: boolean;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  title,
  initialCaption,
  filenameBase,
  renderImage,
  allowShowAnswerToggle = false,
  defaultShowAnswer = false,
}) => {
  const [format, setFormat] = useState<ShareImageFormat>('card');
  const [showAnswer, setShowAnswer] = useState<boolean>(defaultShowAnswer);
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>(initialCaption);

  const [hostedShare, setHostedShare] = useState<HostedShareInfo | null>(null);
  const [isPublishingHost, setIsPublishingHost] = useState<boolean>(false);

  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const latestCaptionRef = useRef<string>(initialCaption);
  latestCaptionRef.current = caption;

  useEffect(() => {
    if (isOpen) {
      setCaption(initialCaption);
      latestCaptionRef.current = initialCaption;
      setShowAnswer(defaultShowAnswer);
      setHostedShare(null);
      setStatusNotice(null);
      setCopiedImage(false);
      setCopiedCaption(false);
      setCopiedLink(false);
    }
  }, [isOpen, initialCaption, defaultShowAnswer]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const generateAndPublish = async () => {
      setIsRendering(true);
      setRenderError(null);
      setHostedShare(null);
      try {
        const dataUrl = await renderImage({ format, showAnswer });
        if (cancelled) return;
        setImageDataUrl(dataUrl);
        setIsRendering(false);

        // Publish temporary hosted Open Graph card so Facebook & mobile share links include both image and caption
        setIsPublishingHost(true);
        const published = await publishShareCard({
          imageDataUrl: dataUrl,
          title,
          caption: latestCaptionRef.current,
          format,
        });
        if (!cancelled && published) {
          setHostedShare(published);
        }
      } catch (err) {
        console.error('Error generating share image:', err);
        if (!cancelled) {
          setRenderError('មិនអាចបង្កើតរូបភាពបានទេ សូមព្យាយាមម្ដងទៀត');
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
          setIsPublishingHost(false);
        }
      }
    };

    generateAndPublish();
    return () => {
      cancelled = true;
    };
  }, [isOpen, format, showAnswer, renderImage, title]);

  // Keep hosted Open Graph caption synced when user edits caption
  useEffect(() => {
    if (!hostedShare?.id) return;
    const timer = setTimeout(() => {
      updateShareCardCaption(hostedShare.id, caption);
    }, 350);
    return () => clearTimeout(timer);
  }, [caption, hostedShare?.id]);

  if (!isOpen) return null;

  const targetFilename = `${filenameBase}_${format === 'tiktok' ? '9x16' : 'card'}.png`;

  const handleNativeShare = async () => {
    if (!imageDataUrl) return;
    setStatusNotice(null);
    const result = await shareImageNative(imageDataUrl, targetFilename, title, caption);
    if (result === 'shared') {
      setStatusNotice({
        text: 'បានបើកផ្ទាំងចែករំលែករូបភាព និងអត្ថបទរួចរាល់!',
        type: 'success',
      });
    } else if (result === 'unsupported') {
      await copyTextToClipboard(caption);
      const imgCopied = await copyImageToClipboard(imageDataUrl);
      setStatusNotice({
        text: imgCopied
          ? 'ផ្ទាំងមើលសាកល្បង (iframe) មិនអនុញ្ញាតឱ្យបើក OS Share ផ្ទាល់ទេ — បានចម្លងរូបភាព + អត្ថបទជូនរួច! លោកអ្នកអាចចុច "បើកផ្ទាំង Share ក្រៅស៊ុម" ដើម្បីបញ្ជូនផ្ទាល់ទៅ TikTok/FB លើទូរស័ព្ទ ឬចុច Facebook / TikTok ខាងក្រោម។'
          : 'កម្មវិធីរុករកលើកុំព្យូទ័រ ឬផ្ទាំងមើលសាកល្បងមិនគាំទ្រ OS Share File ផ្ទាល់ទេ — សូមចុច Facebook / TikTok ខាងក្រោម ឬបើក "ផ្ទាំង Share ក្រៅស៊ុម" នៅលើទូរស័ព្ទ។',
        type: 'info',
      });
    }
  };

  const handleCopyImage = async () => {
    if (!imageDataUrl) return;
    const ok = await copyImageToClipboard(imageDataUrl);
    if (ok) {
      setCopiedImage(true);
      setStatusNotice({
        text: 'បានចម្លងរូបភាពជោគជ័យ! អ្នកអាចចុច Paste (Ctrl+V) លើ Facebook បានភ្លាមៗ។',
        type: 'success',
      });
      setTimeout(() => setCopiedImage(false), 2500);
    } else {
      downloadImageDataUrl(imageDataUrl, targetFilename);
      setStatusNotice({
        text: 'កម្មវិធីរុករកមិនអនុញ្ញាត Copy រូបភាពផ្ទាល់ទេ — បានទាញយករូបភាព PNG ជូនជំនួសរួចរាល់។',
        type: 'info',
      });
    }
  };

  const handleDownloadImage = () => {
    if (!imageDataUrl) return;
    downloadImageDataUrl(imageDataUrl, targetFilename);
    setStatusNotice({
      text: `បានទាញយករូបភាព ${targetFilename} ជោគជ័យ!`,
      type: 'success',
    });
  };

  const handleCopyCaption = async () => {
    const ok = await copyTextToClipboard(caption);
    if (ok) {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  const handleCopyShareLink = async () => {
    if (!hostedShare?.shareUrl) return;
    const ok = await copyTextToClipboard(hostedShare.shareUrl);
    if (ok) {
      setCopiedLink(true);
      setStatusNotice({
        text: 'បានចម្លងតំណភ្ជាប់កាតរូបភាព + អត្ថបទរួចរាល់! អាច Paste លើ Facebook ឬ Messenger ដើម្បីបង្ហាញរូបភាពភ្លាមៗ។',
        type: 'success',
      });
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handlePrepareExternalPost = async (platformName: 'Facebook' | 'TikTok' | 'Telegram') => {
    await copyTextToClipboard(caption);
    if (platformName === 'Facebook') {
      const copiedPng = imageDataUrl ? await copyImageToClipboard(imageDataUrl) : false;
      setStatusNotice({
        text: hostedShare?.shareUrl
          ? 'បានភ្ជាប់ Link កាតរូបភាព + អត្ថបទជូន Facebook Sharer (និងចម្លងរូបភាព + Caption ទុក Paste បន្ថែម) រួចរាល់!'
          : copiedPng
          ? 'បានចម្លងរូបភាព និង Caption រួចរាល់! សូម Paste (Ctrl+V) ក្នុងផុស Facebook របស់អ្នក។'
          : 'បានចម្លង Caption រួចរាល់! សូមទាញយករូបភាព PNG ដើម្បីភ្ជាប់ក្នុងផុស Facebook។',
        type: 'success',
      });
    } else if (platformName === 'TikTok') {
      if (imageDataUrl) {
        downloadImageDataUrl(imageDataUrl, targetFilename);
      }
      setStatusNotice({
        text: 'បានទាញយករូបភាព PNG និងចម្លងអត្ថបទ Caption រួចរាល់! សូមជ្រើសរូបភាពដែលទើបទាញយក ហើយ Paste Caption ក្នុង TikTok (ឬប្រើ "បើកផ្ទាំង Share ក្រៅស៊ុម" លើទូរស័ព្ទ)។',
        type: 'success',
      });
    } else {
      setStatusNotice({
        text: 'បានបើក Telegram Share ជាមួយតំណភ្ជាប់រូបភាព និងអត្ថបទរួចរាល់!',
        type: 'info',
      });
    }
  };

  const fbHref = buildFacebookShareUrl(caption, hostedShare?.shareUrl);
  const tgHref = buildTelegramShareUrl(caption, hostedShare?.shareUrl);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-share-modal-title"
    >
      <div className="relative khmer-ornate-card w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-5 sm:p-7 shadow-2xl">
        <KhmerCornerMotif position="tl" size={28} />
        <KhmerCornerMotif position="tr" size={28} />
        <KhmerCornerMotif position="bl" size={28} />
        <KhmerCornerMotif position="br" size={28} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b app-border">
          <div>
            <h3
              id="social-share-modal-title"
              className="font-moul text-base sm:text-lg app-text-primary flex items-center gap-2"
            >
              <Share2 className="w-5 h-5 khmer-accent-text shrink-0" />
              <span>ចែករំលែករូបភាពទៅបណ្ដាញសង្គម</span>
            </h3>
            <p className="text-xs sm:text-sm app-text-secondary mt-1">
              {title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="បិទផ្ទាំងចែករំលែក"
            className="w-10 h-10 rounded-xl app-subcard app-text-primary flex items-center justify-center hover:opacity-80 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-column layout: Preview left, Controls right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Format selector + Live Image Preview */}
          <div className="lg:col-span-6 space-y-3">
            {/* Aspect Format Segmented Control */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl app-subcard">
              <button
                type="button"
                onClick={() => setFormat('card')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  format === 'card'
                    ? 'khmer-btn-primary shadow-sm'
                    : 'app-text-secondary hover:app-text-primary'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span>កាត Facebook / ទូទៅ</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('tiktok')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  format === 'tiktok'
                    ? 'khmer-btn-primary shadow-sm'
                    : 'app-text-secondary hover:app-text-primary'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>បញ្ឈរ 9:16 (TikTok)</span>
              </button>
            </div>

            {allowShowAnswerToggle && (
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl app-subcard cursor-pointer select-none text-xs sm:text-sm font-medium app-text-primary">
                <input
                  type="checkbox"
                  checked={showAnswer}
                  onChange={(e) => setShowAnswer(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--theme-accent)]"
                />
                <span>បង្ហាញចម្លើយត្រឹមត្រូវនៅលើរូបភាព</span>
              </label>
            )}

            {/* Preview Box */}
            <div className="rounded-2xl app-subcard p-3 flex items-center justify-center min-h-[260px] max-h-[420px] overflow-hidden">
              {isRendering ? (
                <div className="flex flex-col items-center justify-center gap-2.5 py-12 app-text-secondary">
                  <RefreshCw className="w-7 h-7 animate-spin khmer-accent-text" />
                  <span className="text-xs font-semibold">កំពុងបង្កើតរូបភាពគុណភាពខ្ពស់...</span>
                </div>
              ) : renderError ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <ImageIcon className="w-8 h-8 app-text-muted" />
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">{renderError}</p>
                </div>
              ) : imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className={`rounded-xl shadow-md object-contain ${
                    format === 'tiktok' ? 'max-h-[385px] w-auto' : 'w-full max-h-[360px]'
                  }`}
                />
              ) : null}
            </div>
          </div>

          {/* Right: Share Actions, Caption, Platform Links */}
          <div className="lg:col-span-6 space-y-4">
            {/* Primary Direct Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleNativeShare}
                disabled={isRendering || !imageDataUrl}
                className="w-full py-3 px-4 rounded-xl khmer-btn-primary font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>ចែករំលែកផ្ទាល់ទៅ App (រូបភាព + អត្ថបទ)</span>
              </button>

              {hostedShare?.shareUrl && (
                <a
                  href={hostedShare.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl app-subcard app-text-primary hover:opacity-85 font-semibold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5 khmer-accent-text shrink-0" />
                  <span>បើកផ្ទាំង Share ក្រៅស៊ុម (បញ្ជូនផ្ទាល់លើទូរស័ព្ទទៅ TikTok/FB)</span>
                </a>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={isRendering || !imageDataUrl}
                  className="py-2.5 px-3 rounded-xl app-subcard app-text-primary hover:opacity-85 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {copiedImage ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 khmer-gold-text shrink-0" />
                  )}
                  <span>{copiedImage ? 'បានចម្លងរូប' : 'ចម្លងរូបភាព'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={isRendering || !imageDataUrl}
                  className="py-2.5 px-3 rounded-xl app-subcard app-text-primary hover:opacity-85 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4 khmer-accent-text shrink-0" />
                  <span>ទាញយក PNG</span>
                </button>
              </div>
            </div>

            {/* Caption Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-bold app-text-primary">
                  អត្ថបទ Caption សម្រាប់បង្ហោះ
                </label>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="text-xs font-semibold khmer-accent-text hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? 'បានចម្លងអត្ថបទ' : 'ចម្លងអត្ថបទ'}</span>
                </button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl app-input text-xs sm:text-sm leading-relaxed resize-none"
              />
            </div>

            {/* Direct Platform Shortcuts (Carrying hosted card link + image + caption) */}
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-xs font-bold app-text-secondary">
                  បើកកម្មវិធីបណ្ដាញសង្គម (ភ្ជាប់ទាំងរូបភាព + អត្ថបទ)៖
                </p>
                {hostedShare?.shareUrl && (
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="text-xs font-semibold khmer-gold-text hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedLink ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                    <span>{copiedLink ? 'បានចម្លង Link' : 'ចម្លង Link កាត'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <a
                  href={fbHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handlePrepareExternalPost('Facebook')}
                  aria-disabled={isRendering || isPublishingHost}
                  className="py-2.5 px-3 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                >
                  <span>Facebook</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>

                <a
                  href={TIKTOK_UPLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handlePrepareExternalPost('TikTok')}
                  className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                >
                  <span>TikTok</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>

                <a
                  href={tgHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handlePrepareExternalPost('Telegram')}
                  className="py-2.5 px-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                >
                  <span>Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>

            {statusNotice && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed font-medium ${
                  statusNotice.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                    : statusNotice.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200'
                    : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                }`}
              >
                {statusNotice.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
