import html2canvas from 'html2canvas-pro';
import { Question } from '../types';
import { toKhmerNum, getOptionLabel } from '../utils/khmer';

/**
 * Escapes characters for Telegram HTML parse mode
 */
export function escapeTgHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Test Telegram bot connection and get bot info (uses provided token or server-configured token)
 */
export async function testTelegramBot(botToken: string) {
  const res = await fetch('/api/telegram/bot/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ botToken: (botToken || '').trim() }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'មិនអាចតភ្ជាប់ទៅកាន់ Telegram Bot បានទេ');
  }
  return data.result;
}

/**
 * Send a single formatted HTML message to Telegram (with automatic flood-wait retry)
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: 'HTML' | '' = 'HTML',
  attempt = 0
): Promise<any> {
  const res = await fetch('/api/telegram/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      text,
      parse_mode: parseMode,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    if (data.retry_after && attempt < 2) {
      await sleep((Number(data.retry_after) + 1) * 1000);
      return sendTelegramMessage(botToken, chatId, text, parseMode, attempt + 1);
    }
    throw new Error(data.error || 'បរាជ័យក្នុងការផ្ញើសារទៅកាន់ Telegram');
  }
  return data.result;
}

/**
 * Send a single Quiz Poll to Telegram (with A. B. C. D. options, Explain branding + ref, and anonymous voting)
 */
export async function sendTelegramPoll(
  botToken: string,
  chatId: string,
  q: Question,
  attempt = 0,
  examTitle?: string
): Promise<any> {
  if (q.type !== 'mcq' || !q.options || q.options.length < 2) {
    throw new Error('សំណួរនេះមិនមែនជាប្រភេទ QCM ឬគ្មានជម្រើសចម្លើយគ្រប់គ្រាន់ទេ');
  }

  // Format options explicitly as "A. ...", "B. ...", "C. ...", "D. ..."
  const latinLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const labeledOptions = q.options.map((o, idx) => {
    const clean = o.replace(/^[ក-ឃA-Ja-j1-9០-៩][.)]\s*/, '').trim();
    const prefix = latinLabels[idx] || String.fromCharCode(65 + idx);
    return `${prefix}. ${clean}`;
  });

  // Build Explain text: "<a href='https://t.me/qiuzs_bot'>Master Quiz KH</a> | ចំណងជើងវិញ្ញាសា" + optional ref within Telegram's 200 visible-char limit
  const brandVisible = 'Master Quiz KH';
  const brandHtml = '<a href="https://t.me/qiuzs_bot">Master Quiz KH</a>';
  const rawSubject = (q.subject || examTitle || 'វិញ្ញាសាទូទៅ').trim();
  const maxTotalVisible = 200;

  let safeSubject = rawSubject;
  const maxSubjectLen = maxTotalVisible - brandVisible.length - 3; // room for " | "
  if (safeSubject.length > maxSubjectLen) {
    safeSubject = safeSubject.slice(0, maxSubjectLen - 3) + '...';
  }

  const visibleHeader = `${brandVisible} | ${safeSubject}`;
  const rawRef = (q.answer || '')
    .replace(/^(?:ចម្លើយបកស្រាយ|ការបកស្រាយ|បកស្រាយ|ឯកសារយោង|ចម្លើយ)\s*[:៖]\s*/i, '')
    .replace(/\s*\n+\s*/g, ' ')
    .trim();

  let htmlExplanation = `${brandHtml} | ${escapeTgHtml(safeSubject)}`;
  if (rawRef && visibleHeader.length < maxTotalVisible - 12) {
    const remainingVisible = maxTotalVisible - visibleHeader.length - 1; // 1 for '\n'
    const safeRef =
      rawRef.length <= remainingVisible
        ? rawRef
        : rawRef.slice(0, Math.max(1, remainingVisible - 3)) + '...';
    htmlExplanation += `\n${escapeTgHtml(safeRef)}`;
  }

  const res = await fetch('/api/telegram/send-poll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      question: q.question,
      options: labeledOptions,
      correct_option_id: typeof q.correct === 'number' ? q.correct : 0,
      explanation: htmlExplanation,
      explanation_parse_mode: 'HTML',
      is_anonymous: true,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    if (data.retry_after && attempt < 2) {
      await sleep((Number(data.retry_after) + 1) * 1000);
      return sendTelegramPoll(botToken, chatId, q, attempt + 1, examTitle);
    }
    throw new Error(data.error || 'បរាជ័យក្នុងការបាញ់ Quiz Poll ទៅកាន់ Telegram');
  }
  return data.result;
}

export const DEFAULT_TG_WEB_BUTTON_REPLY_MARKUP = {
  inline_keyboard: [
    [
      {
        text: '📱Master Quiz KH Web',
        url: 'https://t.me/qiuzs_bot',
      },
    ],
  ],
};

/**
 * Send a rendered Question Card image to Telegram (with automatic flood-wait retry & inline bot button)
 */
export async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  photoBase64: string,
  caption?: string,
  parseMode: 'HTML' | '' = 'HTML',
  attempt = 0
): Promise<any> {
  const res = await fetch('/api/telegram/send-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      photoBase64,
      caption,
      parse_mode: caption ? parseMode : undefined,
      reply_markup: DEFAULT_TG_WEB_BUTTON_REPLY_MARKUP,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    if (data.retry_after && attempt < 2) {
      await sleep((Number(data.retry_after) + 1) * 1000);
      return sendTelegramPhoto(botToken, chatId, photoBase64, caption, parseMode, attempt + 1);
    }
    throw new Error(data.error || 'បរាជ័យក្នុងការផ្ញើរូបភាពទៅកាន់ Telegram');
  }
  return data.result;
}

function escapeCardHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildKhmerCardCornerSvg(pos: 'tl' | 'tr' | 'bl' | 'br'): string {
  const posStyle: Record<'tl' | 'tr' | 'bl' | 'br', string> = {
    tl: 'top:14px; left:14px; transform:rotate(0deg);',
    tr: 'top:14px; right:14px; transform:rotate(90deg);',
    br: 'bottom:14px; right:14px; transform:rotate(180deg);',
    bl: 'bottom:14px; left:14px; transform:rotate(-90deg);',
  };
  return `
    <svg width="42" height="42" viewBox="0 0 96 96" fill="none" style="position:absolute; ${posStyle[pos]} pointer-events:none;">
      <path d="M4 86 L4 4 L86 4" stroke="#b45309" stroke-width="3" stroke-linecap="square" stroke-opacity="0.78"/>
      <path d="M12 80 L12 12 L80 12" stroke="#9a3412" stroke-width="1.5" stroke-linecap="square" stroke-opacity="0.5"/>
      <path d="M16 26 C18 16, 26 15, 36 16 C27 21, 21 27, 16 36 C15 26, 16 26, 16 26 Z" fill="#b45309" fill-opacity="0.22" stroke="#b45309" stroke-width="1.8" stroke-opacity="0.8"/>
      <path d="M19 19 L29 19 L25 25 L19 29 Z" fill="#b45309" fill-opacity="0.8"/>
    </svg>
  `;
}

/**
 * Render a Question Card into a Khmer-styled PNG base64 image for Telegram sendPhoto and Social Share (Card / TikTok 9:16)
 */
export async function renderQuestionCardImage(
  q: Question,
  index: number,
  options?: { showAnswer?: boolean; format?: 'card' | 'tiktok' }
): Promise<string> {
  const showAnswer = options?.showAnswer ?? true;
  const format = options?.format ?? 'card';

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore
    }
  }

  const isTikTok = format === 'tiktok';
  const cardWidth = isTikTok ? 720 : 780;

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-12000px';
  host.style.top = '0';
  host.style.width = `${cardWidth}px`;
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  try {
    const typeLabel =
      q.type === 'mcq'
        ? 'ពហុជ្រើសរើស (QCM)'
        : q.type === 'explanation'
        ? 'ពន្យល់ពាក្យ'
        : 'សំណួរ-ចម្លើយខ្លី';

    const questionLen = (q.question || '').length;
    const tiktokQFontSize = questionLen > 240 ? 20 : questionLen > 140 ? 23 : 26;
    const tiktokOptFontSize = questionLen > 220 ? 17 : 19;

    let optionsHtml = '';
    if (q.type === 'mcq' && q.options && q.options.length > 0) {
      const optionBoxes = q.options
        .map((opt, oIdx) => {
          const isCorrect = showAnswer && oIdx === q.correct;
          const label = getOptionLabel(oIdx, q.subject);
          const cleanOpt = opt.replace(/^[ក-ឃA-D]\.\s*/, '');
          const boxBg = isCorrect ? '#ecfdf5' : '#f7f2e6';
          const boxBorder = isCorrect ? '#059669' : '#d5c5a3';
          const badgeBg = isCorrect ? '#059669' : '#9a3412';
          const textColor = isCorrect ? '#064e3b' : '#1c1917';
          return `
            <div style="display:flex; align-items:flex-start; gap:${isTikTok ? '14px' : '12px'}; padding:${isTikTok ? '14px 16px' : '12px 15px'}; border-radius:12px; background:${boxBg}; border:1.5px solid ${boxBorder};">
              <div style="min-width:${isTikTok ? '34px' : '30px'}; height:${isTikTok ? '34px' : '30px'}; border-radius:8px; background:${badgeBg}; color:#ffffff; font-family:'Kantumruy Pro', sans-serif; font-weight:700; font-size:${isTikTok ? '16px' : '15px'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${escapeCardHtml(label)}
              </div>
              <div style="font-family:'Kantumruy Pro', 'Noto Sans Khmer', sans-serif; font-size:${isTikTok ? `${tiktokOptFontSize}px` : '16px'}; line-height:1.65; font-weight:${isCorrect ? '700' : '500'}; color:${textColor}; flex:1; word-break:break-word;">
                ${escapeCardHtml(cleanOpt)}${isCorrect ? ' ✓' : ''}
              </div>
            </div>
          `;
        })
        .join('');

      optionsHtml = `<div style="display:flex; flex-direction:column; gap:${isTikTok ? '12px' : '10px'}; margin-top:${isTikTok ? '22px' : '18px'};">${optionBoxes}</div>`;
    }

    let answerHtml = '';
    if (showAnswer && q.answer && q.answer.trim()) {
      const answerText = q.answer.trim();
      const maxAnsLen = isTikTok ? 520 : 900;
      const safeAnswerText =
        answerText.length > maxAnsLen ? answerText.slice(0, maxAnsLen - 3) + '...' : answerText;
      answerHtml = `
        <div style="margin-top:${isTikTok ? '22px' : '18px'}; padding:${isTikTok ? '16px 18px' : '14px 16px'}; border-radius:12px; background:#faf5e8; border:1.5px solid #d5c5a3;">
          <div style="font-family:'Moul', serif; font-size:${isTikTok ? '13px' : '12px'}; color:#92400e; margin-bottom:6px; line-height:1.7;">
            ${q.type === 'mcq' ? 'ឯកសារយោង / ការបកស្រាយ' : 'ចម្លើយត្រឹមត្រូវ'}
          </div>
          <div style="font-family:'Siemreap', 'Kantumruy Pro', sans-serif; font-size:${isTikTok ? '16px' : '15px'}; line-height:1.72; color:#1c1917; white-space:pre-line; word-break:break-word;">
            ${escapeCardHtml(safeAnswerText)}
          </div>
        </div>
      `;
    }

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
      card.innerHTML = `
        <div style="position:relative; flex:1; display:flex; flex-direction:column; justify-content:space-between; background:linear-gradient(180deg, #fffdf8 0%, #f7f2e6 100%); border:2.5px solid #d97706; border-radius:22px; padding:42px 38px 34px 38px; box-shadow: inset 0 0 0 5px #fffdf8, inset 0 0 0 7px rgba(180,83,9,0.32); overflow:hidden;">
          ${buildKhmerCardCornerSvg('tl')}
          ${buildKhmerCardCornerSvg('tr')}
          ${buildKhmerCardCornerSvg('bl')}
          ${buildKhmerCardCornerSvg('br')}

          <!-- Top Branding & Header -->
          <div>
            <div style="text-align:center; padding-bottom:18px; border-bottom:1.5px solid #d5c5a3;">
              <div style="font-family:'Moul', serif; font-size:20px; color:#9a3412; line-height:1.7;">
                MASTER QUIZ KH
              </div>
              <div style="font-family:'Kantumruy Pro', sans-serif; font-size:14px; font-weight:600; color:#78350f; margin-top:2px;">
                ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋកម្ពុជា
              </div>
            </div>

            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:20px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-family:'Moul', serif; font-size:17px; color:#9a3412; line-height:1.7;">
                  សំណួរទី ${toKhmerNum(index)}
                </span>
                <span style="color:#a8a29e;">·</span>
                <span style="font-family:'Kantumruy Pro', sans-serif; font-size:15px; font-weight:700; color:#44403c;">
                  ${escapeCardHtml(q.subject || 'វិញ្ញាសាទូទៅ')}
                </span>
              </div>
              <div style="font-family:'Kantumruy Pro', sans-serif; font-size:13px; font-weight:700; color:#92400e; background:#fef3c7; border:1px solid #d5c5a3; padding:5px 12px; border-radius:8px;">
                ${escapeCardHtml(typeLabel)}
              </div>
            </div>
          </div>

          <!-- Center Main Content -->
          <div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:18px 0;">
            <div style="font-family:'Kantumruy Pro', 'Noto Sans Khmer', sans-serif; font-size:${tiktokQFontSize}px; font-weight:700; line-height:1.68; color:#1c1917; word-break:break-word;">
              ${escapeCardHtml(q.question)}
            </div>

            ${optionsHtml}
            ${answerHtml}
            ${
              !showAnswer
                ? `<div style="margin-top:24px; padding:14px 18px; border-radius:12px; background:#fef3c7; border:1.5px dashed #b45309; text-align:center; font-family:'Kantumruy Pro', sans-serif; font-size:16px; font-weight:700; color:#92400e;">
                    តើអ្នកជ្រើសរើសចម្លើយមួយណា? ខមិនចម្លើយខាងក្រោម! 👇
                  </div>`
                : ''
            }
          </div>

          <!-- Footer Callout -->
          <div style="padding-top:16px; border-top:1.5px solid #d5c5a3; display:flex; align-items:center; justify-content:space-between; font-family:'Kantumruy Pro', sans-serif; font-size:14px; color:#57534e;">
            <span style="font-weight:700; color:#9a3412;">Telegram Bot: @qiuzs_bot</span>
            <span style="font-weight:600; color:#78350f;">ចែករំលែកចំណេះដឹងខ្មែរ</span>
          </div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div style="position:relative; background:#fffdf8; border:2px solid #b45309; border-radius:18px; padding:34px 36px 28px 36px; box-shadow: inset 0 0 0 4px #fffdf8, inset 0 0 0 5.5px rgba(180,83,9,0.28);">
          ${buildKhmerCardCornerSvg('tl')}
          ${buildKhmerCardCornerSvg('tr')}
          ${buildKhmerCardCornerSvg('bl')}
          ${buildKhmerCardCornerSvg('br')}

          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:14px; border-bottom:1.5px solid #d5c5a3; margin-bottom:18px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-family:'Moul', serif; font-size:15px; color:#9a3412; line-height:1.7;">
                សំណួរទី ${toKhmerNum(index)}
              </span>
              <span style="color:#a8a29e;">·</span>
              <span style="font-family:'Kantumruy Pro', sans-serif; font-size:14px; font-weight:700; color:#44403c;">
                ${escapeCardHtml(q.subject || 'វិញ្ញាសាទូទៅ')}
              </span>
            </div>
            <div style="font-family:'Kantumruy Pro', sans-serif; font-size:12px; font-weight:700; color:#92400e; background:#fef3c7; border:1px solid #d5c5a3; padding:4px 10px; border-radius:8px;">
              ${escapeCardHtml(typeLabel)}
            </div>
          </div>

          <div style="font-family:'Kantumruy Pro', 'Noto Sans Khmer', sans-serif; font-size:20px; font-weight:700; line-height:1.7; color:#1c1917; word-break:break-word;">
            ${escapeCardHtml(q.question)}
          </div>

          ${optionsHtml}
          ${answerHtml}

          <div style="margin-top:22px; padding-top:12px; border-top:1px solid #d5c5a3; display:flex; align-items:center; justify-content:space-between; font-family:'Kantumruy Pro', sans-serif; font-size:12px; color:#57534e;">
            <span style="font-weight:700; color:#9a3412;">MASTER QUIZ KH</span>
            <span>ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋកម្ពុជា · @qiuzs_bot</span>
          </div>
        </div>
      `;
    }

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
 * Format Telegram Photo caption matching the exact requested structure:
 * - Type heading (e.g. សំណួរពហុចម្លើយជ្រើសរើស)
 * - Question text
 * - Choices (ក. / ខ. / គ. / ឃ. or A. / B. / C. / D.)
 * - Hidden correct answer: ចម្លើយត្រឹមត្រូវ ៖ <tg-spoiler>ក</tg-spoiler>
 * (Button 📱Master Quiz KH Web -> @qiuzs_bot is attached via inline_keyboard)
 */
export function formatPhotoCaption(
  q: Question,
  _index?: number,
  _showAnswerInImage?: boolean
): string {
  const typeTitle =
    q.type === 'mcq'
      ? 'សំណួរពហុចម្លើយជ្រើសរើស'
      : q.type === 'explanation'
      ? 'ពន្យល់ពាក្យ'
      : 'សំណួរ-ចម្លើយខ្លី';

  const ansPrefix = 'ចម្លើយត្រឹមត្រូវ ៖ ';

  const rawQuestion = (q.question || '').trim();
  const cleanOptions =
    q.type === 'mcq' && q.options && q.options.length > 0
      ? q.options.map((opt, oIdx) => ({
          label: getOptionLabel(oIdx, q.subject),
          text: opt.replace(/^[ក-ឃA-D]\.\s*/, '').trim(),
        }))
      : [];

  let answerContent = '';
  if (q.type === 'mcq' && typeof q.correct === 'number' && q.options?.[q.correct]) {
    answerContent = getOptionLabel(q.correct, q.subject);
  } else {
    answerContent = (q.answer || 'គ្មានចម្លើយ').trim();
  }

  // Telegram strict caption limit is 1024 visible characters
  const MAX_VISIBLE = 980;
  let safeQuestion = rawQuestion;
  let safeOptions = cleanOptions.map((o) => ({ ...o }));
  let safeAnswer = answerContent;

  const measureVisibleLength = () => {
    const optsLen = safeOptions.reduce(
      (acc, o) => acc + o.label.length + 2 + o.text.length + 1,
      0
    );
    return (
      typeTitle.length +
      1 +
      safeQuestion.length +
      1 +
      optsLen +
      ansPrefix.length +
      safeAnswer.length
    );
  };

  if (measureVisibleLength() > MAX_VISIBLE && safeAnswer.length > 220) {
    safeAnswer = safeAnswer.slice(0, 217) + '...';
  }
  if (measureVisibleLength() > MAX_VISIBLE && safeQuestion.length > 160) {
    const excess = measureVisibleLength() - MAX_VISIBLE;
    const targetLen = Math.max(160, safeQuestion.length - excess);
    safeQuestion = safeQuestion.slice(0, targetLen - 3) + '...';
  }
  if (measureVisibleLength() > MAX_VISIBLE && safeOptions.length > 0) {
    const excess = measureVisibleLength() - MAX_VISIBLE;
    const perOptTrim = Math.ceil(excess / safeOptions.length);
    safeOptions = safeOptions.map((o) =>
      o.text.length > 35
        ? { ...o, text: o.text.slice(0, Math.max(25, o.text.length - perOptTrim - 3)) + '...' }
        : o
    );
  }
  if (measureVisibleLength() > MAX_VISIBLE && safeAnswer.length > 60) {
    const excess = measureVisibleLength() - MAX_VISIBLE;
    safeAnswer = safeAnswer.slice(0, Math.max(50, safeAnswer.length - excess - 3)) + '...';
  }

  let caption = `<b>${escapeTgHtml(typeTitle)}</b>\n`;
  caption += `${escapeTgHtml(safeQuestion)}\n`;

  if (safeOptions.length > 0) {
    for (const o of safeOptions) {
      caption += `${escapeTgHtml(o.label)}. ${escapeTgHtml(o.text)}\n`;
    }
  }

  caption += `${escapeTgHtml(ansPrefix)}<tg-spoiler>${escapeTgHtml(safeAnswer)}</tg-spoiler>`;

  return caption;
}

/**
 * Format a single question as a rich HTML card for Telegram (safely under 4096 chars)
 */
export function formatQuestionCard(q: Question, index: number): string {
  const numKh = toKhmerNum(index);
  const typeLabel =
    q.type === 'mcq'
      ? 'ពហុជ្រើសរើស (QCM)'
      : q.type === 'explanation'
      ? 'ពន្យល់ពាក្យ'
      : 'សំណួរ-ចម្លើយខ្លី';

  let header = `<b>📝 សំណួរទី ${numKh}</b> [${escapeTgHtml(typeLabel)}]\n`;
  header += `<b>មុខវិជ្ជា៖</b> ${escapeTgHtml(q.subject || 'ទូទៅ')}\n\n`;
  header += `❓ <b>សំណួរ៖</b> ${escapeTgHtml(q.question)}\n\n`;

  if (q.type === 'mcq' && q.options && q.options.length > 0) {
    header += `<b>ជម្រើសចម្លើយ៖</b>\n`;
    const labels = ['ក', 'ខ', 'គ', 'ឃ', 'ង', 'ច'];
    q.options.forEach((opt, idx) => {
      const isCorrect = idx === q.correct;
      const clean = opt.replace(/^[ក-ឃA-D]\.\s*/, '');
      header += `${isCorrect ? '✅' : '⚪'} <b>${labels[idx] || idx + 1}.</b> ${escapeTgHtml(clean)}\n`;
    });
    header += `\n`;
  }

  let footer = '';
  if (q.type === 'mcq' && typeof q.correct === 'number' && q.options && q.options[q.correct]) {
    const labels = ['ក', 'ខ', 'គ', 'ឃ', 'ង', 'ច'];
    footer += `(ជម្រើសត្រឹមត្រូវគឺ៖ <b>${labels[q.correct]}</b>)\n`;
  }
  footer += `\n<i>━━━━━━━━━━━━━━━━━━━━\n📚 <a href="https://t.me/qiuzs_bot">Master Quiz KH</a> — វិញ្ញាសាត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ</i>`;

  const answerTitle = `🎯 <b>ចម្លើយត្រឹមត្រូវ៖</b>\n`;
  const maxAnswerChars = Math.max(200, 3900 - header.length - footer.length - answerTitle.length);
  const rawAnswer = q.answer || 'គ្មានចម្លើយជាក់លាក់';
  const safeAnswer =
    rawAnswer.length > maxAnswerChars
      ? escapeTgHtml(rawAnswer.slice(0, maxAnswerChars - 3) + '...')
      : escapeTgHtml(rawAnswer);

  return `${header}${answerTitle}${safeAnswer}\n${footer}`;
}

/**
 * Format questions of a subject into multiple chunks (messages) so they stay under 3800 chars
 */
export function formatSubjectDigestMessages(
  subjectName: string,
  questions: Question[]
): string[] {
  if (questions.length === 0) return [];

  const chunks: string[] = [];
  const header = `🏛️ <b>វិញ្ញាសាប្រឡងក្របខ័ណ្ឌរដ្ឋ — មុខវិជ្ជា៖ ${escapeTgHtml(
    subjectName
  )}</b>\n📊 <b>សរុប៖</b> ${toKhmerNum(questions.length)} សំណួរ\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  let currentMsg = header;

  questions.forEach((q, idx) => {
    const numKh = toKhmerNum(idx + 1);
    let itemText = `<b>📍 សំណួរទី ${numKh}៖</b> ${escapeTgHtml(q.question)}\n`;

    if (q.type === 'mcq' && q.options && q.options.length > 0) {
      const labels = ['ក', 'ខ', 'គ', 'ឃ'];
      q.options.forEach((opt, optIdx) => {
        const clean = opt.replace(/^[ក-ឃA-D]\.\s*/, '');
        const isCorrect = optIdx === q.correct;
        itemText += `   ${isCorrect ? '✅' : '•'} ${labels[optIdx] || optIdx + 1}. ${escapeTgHtml(clean)}\n`;
      });
    }

    itemText += `👉 <b>ចម្លើយ៖</b> ${escapeTgHtml(q.answer || '')}\n\n`;

    // Telegram hard limit is 4096 characters. Keep safe boundary at 3600 characters
    if (currentMsg.length + itemText.length > 3600) {
      currentMsg += `<i>(មានតនៅសារបន្ទាប់...)</i>`;
      chunks.push(currentMsg);
      currentMsg = `🏛️ <b>មុខវិជ្ជា៖ ${escapeTgHtml(subjectName)} (ត)</b>\n━━━━━━━━━━━━━━━━━━━━\n\n` + itemText;
    } else {
      currentMsg += itemText;
    }
  });

  currentMsg += `━━━━━━━━━━━━━━━━━━━━\n✨ <i><a href="https://t.me/qiuzs_bot">Master Quiz KH</a> — ជូនពរជោគជ័យក្នុងការប្រឡង!</i>`;
  chunks.push(currentMsg);

  return chunks;
}

/**
 * Sleep utility for throttle/rate-limiting
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface CommandBotStatus {
  isRunning: boolean;
  botUsername: string;
  hasServerToken?: boolean;
  commandsRegistered: boolean;
  handledCount: number;
  lastCommandAt: string | null;
  lastCommandText: string | null;
  lastError: string | null;
}

export async function registerTelegramCommands(botToken: string): Promise<any> {
  const res = await fetch('/api/telegram/bot/set-commands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ botToken: botToken.trim() }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'មិនអាចចុះឈ្មោះ Command Bot បានទេ');
  }
  return data;
}

export async function startTelegramCommandBot(
  botToken: string,
  appUrl?: string
): Promise<CommandBotStatus & { success: boolean }> {
  const res = await fetch('/api/telegram/bot/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      botToken: botToken.trim(),
      appUrl: appUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'មិនអាចបើកដំណើរការ Command Bot បានទេ');
  }
  return data;
}

export async function stopTelegramCommandBot(): Promise<void> {
  await fetch('/api/telegram/bot/stop', { method: 'POST' });
}

export async function getTelegramCommandBotStatus(): Promise<CommandBotStatus | null> {
  try {
    const res = await fetch('/api/telegram/bot/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function syncTelegramBotTemplates(templates: Record<string, any>): Promise<void> {
  try {
    await fetch('/api/telegram/bot/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates }),
    });
  } catch {
    // Ignore transient network errors
  }
}
