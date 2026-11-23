import html2canvas from 'html2canvas-pro';
import { Question } from '../types';
import { toKhmerNum, getOptionLabel } from '../utils/khmer';

export type ShareImageFormat = 'card' | 'tiktok';

export const APP_PUBLIC_URL =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://t.me/qiuzs_bot';

export const TELEGRAM_BOT_URL = 'https://t.me/qiuzs_bot';
export const TIKTOK_UPLOAD_URL = 'https://www.tiktok.com/upload';

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCornerSvg(pos: 'tl' | 'tr' | 'bl' | 'br'): string {
  const posStyle: Record<'tl' | 'tr' | 'bl' | 'br', string> = {
    tl: 'top:16px; left:16px; transform:rotate(0deg);',
    tr: 'top:16px; right:16px; transform:rotate(90deg);',
    br: 'bottom:16px; right:16px; transform:rotate(180deg);',
    bl: 'bottom:16px; left:16px; transform:rotate(-90deg);',
  };
  return `
    <svg width="46" height="46" viewBox="0 0 96 96" fill="none" style="position:absolute; ${posStyle[pos]} pointer-events:none;">
      <path d="M4 86 L4 4 L86 4" stroke="#b45309" stroke-width="3" stroke-linecap="square" stroke-opacity="0.8"/>
      <path d="M12 80 L12 12 L80 12" stroke="#9a3412" stroke-width="1.5" stroke-linecap="square" stroke-opacity="0.55"/>
      <path d="M16 26 C18 16, 26 15, 36 16 C27 21, 21 27, 16 36 C15 26, 16 26, 16 26 Z" fill="#b45309" fill-opacity="0.24" stroke="#b45309" stroke-width="1.8" stroke-opacity="0.82"/>
      <path d="M19 19 L29 19 L25 25 L19 29 Z" fill="#b45309" fill-opacity="0.82"/>
    </svg>
  `;
}

function buildLotusCrestSvg(size = 64): string {
  return `
    <svg width="${size}" height="${Math.round(size * 0.54)}" viewBox="0 0 120 65" fill="none" style="display:block; margin:0 auto;">
      <path d="M60 4C66 16 70 28 60 42C50 28 54 16 60 4Z" fill="#b45309" fill-opacity="0.24" stroke="#b45309" stroke-width="2"/>
      <path d="M60 42C44 37 32 25 28 15C40 16 52 24 60 42Z" fill="#b45309" fill-opacity="0.16" stroke="#b45309" stroke-width="1.8"/>
      <path d="M60 42C76 37 88 25 92 15C80 16 68 24 60 42Z" fill="#b45309" fill-opacity="0.16" stroke="#b45309" stroke-width="1.8"/>
      <path d="M59 42C36 45 19 37 11 29C23 26 42 32 59 42Z" stroke="#9a3412" stroke-width="1.6"/>
      <path d="M61 42C84 45 101 37 109 29C97 26 78 32 61 42Z" stroke="#9a3412" stroke-width="1.6"/>
      <path d="M18 52H102" stroke="#b45309" stroke-width="1.5" stroke-opacity="0.65"/>
      <circle cx="60" cy="52" r="3" fill="#b45309"/>
    </svg>
  `;
}

export interface ResultCardParams {
  title: string;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  medalTitle: string;
  username?: string;
  format?: ShareImageFormat;
}

/**
 * Render a Khmer-styled Result Certificate PNG image in Standard Card or 9:16 TikTok/Story format
 */
export async function renderResultCardImage(params: ResultCardParams): Promise<string> {
  const format = params.format ?? 'card';
  const isTikTok = format === 'tiktok';
  const cardWidth = isTikTok ? 720 : 780;

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore
    }
  }

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-12000px';
  host.style.top = '0';
  host.style.width = `${cardWidth}px`;
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  try {
    const isHigh = params.percentage >= 75;
    const isPass = params.percentage >= 50;
    const scoreBoxBg = isHigh ? '#ecfdf5' : isPass ? '#eff6ff' : '#fef3c7';
    const scoreBoxBorder = isHigh ? '#059669' : isPass ? '#1d4ed8' : '#b45309';
    const scoreTextColor = isHigh ? '#065f46' : isPass ? '#1e3a8a' : '#92400e';

    const card = document.createElement('div');
    card.style.width = `${cardWidth}px`;
    card.style.boxSizing = 'border-box';
    card.style.background = isTikTok
      ? 'linear-gradient(180deg, #9a3412 0%, #7c2d12 50%, #451a03 100%)'
      : '#f7f2e6';
    card.style.padding = isTikTok ? '26px' : '22px';
    if (isTikTok) {
      card.style.height = '1280px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
    }

    const innerFlexStyle = isTikTok
      ? 'flex:1; display:flex; flex-direction:column; justify-content:space-between;'
      : '';

    card.innerHTML = `
      <div style="position:relative; ${innerFlexStyle} background:linear-gradient(180deg, #fffdf8 0%, #f7f2e6 100%); border:2.5px solid #b45309; border-radius:20px; padding:${isTikTok ? '46px 38px 34px 38px' : '38px 40px 30px 40px'}; box-shadow: inset 0 0 0 4px #fffdf8, inset 0 0 0 6px rgba(180,83,9,0.28); text-align:center;">
        ${buildCornerSvg('tl')}
        ${buildCornerSvg('tr')}
        ${buildCornerSvg('bl')}
        ${buildCornerSvg('br')}

        <div>
          ${buildLotusCrestSvg(isTikTok ? 76 : 64)}
          <div style="font-family:'Moul', serif; font-size:${isTikTok ? '22px' : '19px'}; color:#9a3412; margin-top:10px; line-height:1.75;">
            វិញ្ញាបនបត្រលទ្ធផលការធ្វើតេស្ត
          </div>
          <div style="font-family:'Kantumruy Pro', sans-serif; font-size:${isTikTok ? '16px' : '14px'}; font-weight:700; color:#57534e; margin-top:4px;">
            MASTER QUIZ KH · ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ
          </div>
        </div>

        <div style="${isTikTok ? 'margin:32px 0;' : 'margin:24px 0;'}">
          ${
            params.username
              ? `<div style="font-family:'Kantumruy Pro', sans-serif; font-size:${isTikTok ? '18px' : '15px'}; color:#44403c; margin-bottom:10px;">
                   បេក្ខជន៖ <strong style="color:#1c1917;">${escapeHtml(params.username)}</strong>
                 </div>`
              : ''
          }
          <div style="font-family:'Moul', serif; font-size:${isTikTok ? '20px' : '17px'}; color:#1c1917; line-height:1.8; margin-bottom:${isTikTok ? '26px' : '18px'};">
            ${escapeHtml(params.title)}
          </div>

          <div style="max-width:${isTikTok ? '500px' : '440px'}; margin:0 auto; padding:${isTikTok ? '32px 24px' : '24px 20px'}; border-radius:18px; background:${scoreBoxBg}; border:2px solid ${scoreBoxBorder};">
            <div style="font-family:'Moul', serif; font-size:${isTikTok ? '20px' : '18px'}; color:${scoreTextColor}; margin-bottom:12px; line-height:1.7;">
              ${escapeHtml(params.medalTitle)}
            </div>
            <div style="font-family:'Moul', serif; font-size:${isTikTok ? '76px' : '60px'}; color:${scoreTextColor}; line-height:1.15;">
              ${toKhmerNum(params.percentage)}%
            </div>
            <div style="font-family:'Kantumruy Pro', sans-serif; font-size:${isTikTok ? '19px' : '16px'}; font-weight:700; color:#1c1917; margin-top:14px;">
              ឆ្លើយត្រូវ ${toKhmerNum(params.correctCount)} ក្នុងចំណោម ${toKhmerNum(params.totalQuestions)} សំណួរ
            </div>
          </div>

          ${
            isTikTok
              ? `<div style="margin-top:28px; font-family:'Kantumruy Pro', sans-serif; font-size:16px; font-weight:600; color:#78350f;">
                  សាកល្បងសមត្ថភាពត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋជាមួយគ្នាថ្ងៃនេះ!
                </div>`
              : ''
          }
        </div>

        <div style="padding-top:14px; border-top:1.5px solid #d5c5a3; display:flex; align-items:center; justify-content:space-between; font-family:'Kantumruy Pro', sans-serif; font-size:${isTikTok ? '14px' : '12px'}; color:#57534e;">
          <span style="font-weight:700; color:#9a3412;">Telegram Bot: @qiuzs_bot</span>
          <span style="font-weight:600; color:#78350f;">Master Quiz KH</span>
        </div>
      </div>
    `;

    host.appendChild(card);

    const canvas = await html2canvas(card, {
      scale: 2,
      backgroundColor: isTikTok ? '#7c2d12' : '#f7f2e6',
      useCORS: true,
      logging: false,
    });

    return canvas.toDataURL('image/png');
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

/**
 * Format clean Khmer social caption for a Question card
 */
export function formatQuestionSocialCaption(q: Question, index?: number): string {
  const header = index
    ? `📝 សំណួរទី ${toKhmerNum(index)} · ${q.subject || 'ចំណេះដឹងទូទៅ'}`
    : `📝 ${q.subject || 'សំណួរចំណេះដឹងទូទៅ'}`;

  let lines = [header, '', q.question.trim()];

  if (q.type === 'mcq' && q.options && q.options.length > 0) {
    lines.push('');
    q.options.forEach((opt, idx) => {
      const label = getOptionLabel(idx, q.subject);
      const clean = opt.replace(/^[ក-ឃA-D]\.\s*/, '').trim();
      lines.push(`${label}. ${clean}`);
    });
  }

  lines.push('');
  lines.push('👇 តើអ្នកជ្រើសរើសចម្លើយមួយណា? ខមិនចម្លើយខាងក្រោម!');
  lines.push('🤖 ហ្វឹកហាត់សំណួរបន្ថែមលើ Telegram: @qiuzs_bot');
  lines.push('#MasterQuizKH #ប្រឡងក្របខ័ណ្ឌរដ្ឋ #ចំណេះដឹងទូទៅ');

  return lines.join('\n');
}

/**
 * Format clean Khmer social caption for a Quiz Result card
 */
export function formatResultSocialCaption(params: ResultCardParams): string {
  return [
    `🏆 លទ្ធផលការធ្វើតេស្តរបស់ខ្ញុំ — ${params.title}`,
    `🎯 ពិន្ទុ៖ ${toKhmerNum(params.percentage)}% (ឆ្លើយត្រូវ ${toKhmerNum(params.correctCount)}/${toKhmerNum(params.totalQuestions)} សំណួរ)`,
    `✨ ${params.medalTitle}`,
    '',
    '🤖 ចូលរួមហ្វឹកហាត់ត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋលើ Telegram: @qiuzs_bot',
    '#MasterQuizKH #ប្រឡងក្របខ័ណ្ឌរដ្ឋ',
  ].join('\n');
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const blob = await dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: 'image/png' });
}

export function canNativeShareFile(file: File): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function shareImageNative(
  dataUrl: string,
  filename: string,
  title: string,
  text: string
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  try {
    const file = await dataUrlToFile(dataUrl, filename);
    if (!canNativeShareFile(file)) {
      return 'unsupported';
    }
    await navigator.share({
      title,
      text,
      files: [file],
    });
    return 'shared';
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
}

export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.clipboard ||
      typeof navigator.clipboard.write !== 'function' ||
      typeof ClipboardItem === 'undefined'
    ) {
      return false;
    }
    const blob = await dataUrlToBlob(dataUrl);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function downloadImageDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export interface HostedShareInfo {
  id: string;
  shareUrl: string;
  imageUrl: string;
}

export async function publishShareCard(params: {
  imageDataUrl: string;
  title: string;
  caption: string;
  format: ShareImageFormat;
}): Promise<HostedShareInfo | null> {
  try {
    const res = await fetch('/api/share-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: params.imageDataUrl,
        title: params.title,
        caption: params.caption,
        format: params.format,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data.shareUrl || !data.imageUrl) return null;
    return {
      id: data.id,
      shareUrl: data.shareUrl,
      imageUrl: data.imageUrl,
    };
  } catch {
    return null;
  }
}

export async function updateShareCardCaption(id: string, caption: string): Promise<void> {
  try {
    await fetch(`/api/share-card/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption }),
    });
  } catch {
    // Non-critical
  }
}

export function isInsideIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

export function buildFacebookShareUrl(quoteText: string, hostedShareUrl?: string): string {
  const targetUrl = hostedShareUrl || TELEGRAM_BOT_URL;
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}&quote=${encodeURIComponent(quoteText)}`;
}

export function buildTelegramShareUrl(text: string, hostedShareUrl?: string): string {
  const targetUrl = hostedShareUrl || TELEGRAM_BOT_URL;
  return `https://t.me/share/url?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(text)}`;
}
