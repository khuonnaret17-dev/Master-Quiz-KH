import crypto from 'crypto';
import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

interface StoredShareCard {
  id: string;
  buffer: Buffer;
  mimeType: string;
  title: string;
  caption: string;
  format: 'card' | 'tiktok';
  createdAt: number;
}

const SHARE_CARD_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_STORED_SHARE_CARDS = 150;
const sharedCardsStore = new Map<string, StoredShareCard>();

function pruneSharedCards() {
  const now = Date.now();
  for (const [id, entry] of sharedCardsStore.entries()) {
    if (now - entry.createdAt > SHARE_CARD_TTL_MS) {
      sharedCardsStore.delete(id);
    }
  }
  while (sharedCardsStore.size > MAX_STORED_SHARE_CARDS) {
    const oldestKey = sharedCardsStore.keys().next().value;
    if (!oldestKey) break;
    sharedCardsStore.delete(oldestKey);
  }
}

function escapeServerHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBaseOrigin(req: express.Request): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.get('host');
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol || 'https';
  if (host) {
    return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`;
  }
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  return `http://localhost:${PORT}`;
}

// Endpoint: Publish temporary share card image & metadata for Facebook Open Graph & TikTok mobile handoff
app.post('/api/share-card', (req, res) => {
  try {
    const { imageBase64, title, caption, format } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing imageBase64' });
    }

    const matches = imageBase64.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid image data URL' });
    }

    const mimeType = matches[1] === 'image/jpg' ? 'image/jpeg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 12 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'Image too large' });
    }

    pruneSharedCards();

    const id = crypto.randomBytes(6).toString('base64url');
    const safeFormat: 'card' | 'tiktok' = format === 'tiktok' ? 'tiktok' : 'card';

    sharedCardsStore.set(id, {
      id,
      buffer,
      mimeType,
      title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 180) : 'Master Quiz KH',
      caption: typeof caption === 'string' ? caption.trim().slice(0, 1800) : '',
      format: safeFormat,
      createdAt: Date.now(),
    });

    const origin = getBaseOrigin(req);
    const sharePath = `/s/${id}`;
    const imagePath = `/api/share-card/${id}.png`;

    res.json({
      success: true,
      id,
      sharePath,
      imagePath,
      shareUrl: `${origin}${sharePath}`,
      imageUrl: `${origin}${imagePath}`,
    });
  } catch (err: any) {
    console.error('Error storing share card:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Update caption on an existing temporary share card
app.put('/api/share-card/:id', (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }
  const entry = sharedCardsStore.get(id);
  if (!entry) {
    return res.status(404).json({ success: false, error: 'Share card not found' });
  }
  const { caption } = req.body || {};
  if (typeof caption === 'string') {
    entry.caption = caption.trim().slice(0, 1800);
  }
  res.json({ success: true });
});

// Endpoint: Serve hosted PNG image for Open Graph crawlers & direct download
app.get('/api/share-card/:id.png', (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(id)) {
    return res.status(400).send('Invalid ID');
  }
  pruneSharedCards();
  const entry = sharedCardsStore.get(id);
  if (!entry) {
    return res.status(404).send('Share card expired or not found');
  }
  res.setHeader('Content-Type', entry.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(entry.buffer);
});

// Endpoint: Standalone Open Graph Share Page (enables Facebook link preview + top-level native mobile Share to TikTok/FB)
app.get('/s/:id', (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(id)) {
    return res.status(400).send('Invalid share link');
  }
  pruneSharedCards();
  const entry = sharedCardsStore.get(id);
  if (!entry) {
    return res.status(404).send(`<!DOCTYPE html>
<html lang="km">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Master Quiz KH</title></head>
<body style="font-family:sans-serif;background:#f7f2e6;color:#1c1917;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center;">
  <div style="background:#fffdf8;border:2px solid #b45309;border-radius:18px;padding:32px;max-width:460px;">
    <h1 style="color:#9a3412;margin-top:0;">តំណភ្ជាប់រូបភាពផុតកំណត់</h1>
    <p>សូមចូលទៅកាន់កម្មវិធី Master Quiz KH ដើម្បីបង្កើតរូបភាពសំណួរ ឬលទ្ធផលថ្មី។</p>
    <a href="/" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#9a3412;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">បើក Master Quiz KH</a>
  </div>
</body></html>`);
  }

  const origin = getBaseOrigin(req);
  const shareUrl = `${origin}/s/${entry.id}`;
  const imageUrl = `${origin}/api/share-card/${entry.id}.png`;
  const safeTitle = escapeServerHtml(entry.title);
  const plainDesc = (entry.caption || 'ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋកម្ពុជា — @qiuzs_bot').replace(/\s+/g, ' ').slice(0, 260);
  const safeDesc = escapeServerHtml(plainDesc);
  const safeFullCaption = escapeServerHtml(entry.caption || '');
  const imgWidth = entry.format === 'tiktok' ? '1440' : '1560';
  const imgHeight = entry.format === 'tiktok' ? '2560' : '1100';
  const fbShareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(entry.caption || entry.title)}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — Master Quiz KH</title>
  <meta name="description" content="${safeDesc}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Master Quiz KH" />
  <meta property="og:url" content="${escapeServerHtml(shareUrl)}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${escapeServerHtml(imageUrl)}" />
  <meta property="og:image:type" content="${escapeServerHtml(entry.mimeType)}" />
  <meta property="og:image:width" content="${imgWidth}" />
  <meta property="og:image:height" content="${imgHeight}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${escapeServerHtml(imageUrl)}" />
  <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@500;700&family=Moul&display=swap" rel="stylesheet">
</head>
<body style="margin:0;background:#f7f2e6;color:#1c1917;font-family:'Kantumruy Pro',sans-serif;padding:24px 16px;">
  <main style="max-width:640px;margin:0 auto;background:#fffdf8;border:2px solid #b45309;border-radius:20px;padding:24px;box-shadow:0 12px 32px rgba(154,52,18,0.12);">
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-family:'Moul',serif;font-size:18px;color:#9a3412;">MASTER QUIZ KH</div>
      <h1 style="font-size:16px;margin:6px 0 0;color:#44403c;">${safeTitle}</h1>
    </div>

    <div style="background:#efe7d5;border-radius:14px;padding:12px;text-align:center;margin-bottom:18px;">
      <img src="${escapeServerHtml(imageUrl)}" alt="${safeTitle}" style="max-width:100%;max-height:540px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.12);" />
    </div>

    <div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:16px;">
      <button id="nativeShareBtn" type="button" style="padding:13px 18px;border:none;border-radius:12px;background:#9a3412;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">
        📤 ចែករំលែកផ្ទាល់ (រូបភាព + អត្ថបទ ទៅ TikTok / Facebook)
      </button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <a href="${escapeServerHtml(fbShareHref)}" target="_blank" rel="noopener noreferrer" style="padding:11px 14px;border-radius:12px;background:#1877F2;color:#fff;text-decoration:none;font-size:13px;font-weight:700;text-align:center;">
          បង្ហោះលើ Facebook
        </a>
        <a href="https://www.tiktok.com/upload" target="_blank" rel="noopener noreferrer" id="tiktokLink" style="padding:11px 14px;border-radius:12px;background:#1c1917;color:#fff;text-decoration:none;font-size:13px;font-weight:700;text-align:center;">
          បង្ហោះលើ TikTok
        </a>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <a href="${escapeServerHtml(imageUrl)}" download="MasterQuiz_${escapeServerHtml(entry.id)}.png" style="padding:10px 14px;border-radius:12px;background:#efe7d5;color:#1c1917;border:1px solid #d5c5a3;text-decoration:none;font-size:13px;font-weight:700;text-align:center;">
          ⬇️ ទាញយករូបភាព PNG
        </a>
        <button id="copyCaptionBtn" type="button" style="padding:10px 14px;border-radius:12px;background:#efe7d5;color:#1c1917;border:1px solid #d5c5a3;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">
          📋 ចម្លងអត្ថបទ Caption
        </button>
      </div>
    </div>

    <div id="statusMsg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:10px;background:#fef3c7;border:1px solid #d5c5a3;font-size:13px;color:#78350f;"></div>

    <pre id="captionText" style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.65;background:#faf5e8;border:1px solid #d5c5a3;border-radius:12px;padding:12px;margin:0 0 16px;">${safeFullCaption}</pre>

    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:13px;border-top:1px solid #d5c5a3;padding-top:12px;">
      <a href="/" style="color:#9a3412;font-weight:700;text-decoration:none;">← ចូលលេងតេស្តលើ Master Quiz KH</a>
      <a href="https://t.me/qiuzs_bot" target="_blank" rel="noopener noreferrer" style="color:#0088cc;font-weight:700;text-decoration:none;">🤖 Telegram Bot @qiuzs_bot</a>
    </div>
  </main>
  <script>
    (function(){
      var imgUrl = ${JSON.stringify(imageUrl)};
      var shareTitle = ${JSON.stringify(entry.title)};
      var captionText = ${JSON.stringify(entry.caption || '')};
      var statusEl = document.getElementById('statusMsg');
      function showStatus(msg) {
        statusEl.textContent = msg;
        statusEl.style.display = 'block';
      }
      document.getElementById('copyCaptionBtn').addEventListener('click', function() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(captionText).then(function(){
            showStatus('បានចម្លងអត្ថបទ Caption រួចរាល់!');
          });
        }
      });
      document.getElementById('tiktokLink').addEventListener('click', function() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(captionText).catch(function(){});
        }
        var a = document.createElement('a');
        a.href = imgUrl;
        a.download = 'MasterQuiz_TikTok.png';
        a.click();
      });
      document.getElementById('nativeShareBtn').addEventListener('click', async function() {
        try {
          var resp = await fetch(imgUrl);
          var blob = await resp.blob();
          var file = new File([blob], 'MasterQuizKH.png', { type: blob.type || 'image/png' });
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: shareTitle, text: captionText });
            showStatus('បានចែករំលែករួចរាល់!');
            return;
          }
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(captionText).catch(function(){});
        }
        showStatus('កម្មវិធីរុករកលើកុំព្យូទ័រមិនអនុញ្ញាត Share File ផ្ទាល់ទេ — សូមចុច "ទាញយករូបភាព PNG" ឬ "បង្ហោះលើ Facebook / TikTok" ខាងក្រោម!');
      });
    })();
  </script>
</body>
</html>`);
});

// Endpoint: Send Quiz Poll to Telegram Bot
app.post('/api/telegram/send-poll', async (req, res) => {
  try {
    const {
      botToken,
      chatId,
      question,
      options,
      correct_option_id,
      explanation,
      explanation_parse_mode,
      is_anonymous,
    } = req.body;
    const resolvedToken = resolveServerBotToken(botToken);
    if (!resolvedToken || !chatId || !question || !options) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const payload: any = {
      chat_id: chatId,
      question: question.length > 300 ? question.slice(0, 297) + '...' : question,
      options: options.slice(0, 10).map((opt: string) => (opt.length > 100 ? opt.slice(0, 97) + '...' : opt)),
      type: 'quiz',
      correct_option_id: typeof correct_option_id === 'number' ? correct_option_id : 0,
      is_anonymous: is_anonymous === false ? false : true,
    };

    if (explanation) {
      if (explanation_parse_mode) {
        payload.explanation = explanation;
        payload.explanation_parse_mode = explanation_parse_mode;
      } else {
        payload.explanation = explanation.length > 200 ? explanation.slice(0, 197) + '...' : explanation;
      }
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${resolvedToken}/sendPoll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await tgRes.json();
    if (!tgRes.ok || !data.ok) {
      // Fallback: if HTML explanation fails parsing or exceeds 200 chars, strip HTML tags & truncate cleanly
      if (
        payload.explanation_parse_mode &&
        data.description &&
        (data.description.includes("can't parse entities") ||
          data.description.includes('EXPLANATION') ||
          data.description.includes('too long'))
      ) {
        const plainExp = String(explanation).replace(/<[^>]+>/g, '');
        const fallbackPayload = {
          ...payload,
          explanation: plainExp.length > 200 ? plainExp.slice(0, 197) + '...' : plainExp,
        };
        delete fallbackPayload.explanation_parse_mode;

        const retryRes = await fetch(`https://api.telegram.org/bot${resolvedToken}/sendPoll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackPayload),
        });
        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.ok) {
          return res.json({ success: true, result: retryData.result });
        }
      }

      return res.status(tgRes.status === 429 ? 429 : 400).json({
        success: false,
        error: data.description || 'Telegram API error',
        retry_after: data.parameters?.retry_after,
      });
    }

    res.json({ success: true, result: data.result });
  } catch (err: any) {
    console.error('Error sending Telegram poll:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Send Formatted Message to Telegram Channel or Group
app.post('/api/telegram/send-message', async (req, res) => {
  try {
    const { botToken, chatId, text, parse_mode } = req.body;
    const resolvedToken = resolveServerBotToken(botToken);
    if (!resolvedToken || !chatId || !text) {
      return res.status(400).json({ success: false, error: 'Missing required parameters (botToken, chatId, text)' });
    }

    const payload: any = {
      chat_id: chatId,
      text: text,
      disable_web_page_preview: true,
    };
    if (parse_mode) {
      payload.parse_mode = parse_mode;
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${resolvedToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await tgRes.json();
    if (!tgRes.ok || !data.ok) {
      // If HTML parsing failed, attempt plain text fallback
      if (payload.parse_mode && data.description && data.description.includes('can\'t parse entities')) {
        delete payload.parse_mode;
        const retryRes = await fetch(`https://api.telegram.org/bot${resolvedToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.ok) {
          return res.json({ success: true, result: retryData.result });
        }
      }
      return res.status(tgRes.status === 429 ? 429 : 400).json({
        success: false,
        error: data.description || 'Telegram API error',
        retry_after: data.parameters?.retry_after,
      });
    }

    res.json({ success: true, result: data.result });
  } catch (err: any) {
    console.error('Error sending Telegram message:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Send Photo to Telegram Channel
app.post('/api/telegram/send-photo', async (req, res) => {
  try {
    const { botToken, chatId, photoBase64, caption, parse_mode, reply_markup } = req.body;
    const resolvedToken = resolveServerBotToken(botToken);
    if (!resolvedToken || !chatId || !photoBase64) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    // Convert data URL to Blob / FormData
    const matches = photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid base64 photo' });
    }

    const mimeType = matches[1] || 'image/png';
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    const serializedMarkup = reply_markup
      ? typeof reply_markup === 'string'
        ? reply_markup
        : JSON.stringify(reply_markup)
      : undefined;

    const buildMultipartBody = (cap?: string, mode?: string) => {
      const b = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const chunks: Buffer[] = [];
      const addFld = (name: string, value: string) => {
        chunks.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
      };
      addFld('chat_id', chatId);
      if (cap) {
        const finalCap = !mode && cap.length > 1024 ? cap.slice(0, 1020) + '...' : cap;
        addFld('caption', finalCap);
        if (mode) {
          addFld('parse_mode', mode);
        }
      }
      if (serializedMarkup) {
        addFld('reply_markup', serializedMarkup);
      }
      chunks.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="photo"; filename="quiz_card.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
      chunks.push(buffer);
      chunks.push(Buffer.from(`\r\n--${b}--\r\n`));
      return { boundary: b, totalBuffer: Buffer.concat(chunks) };
    };

    const firstBody = buildMultipartBody(caption, parse_mode);
    const tgRes = await fetch(`https://api.telegram.org/bot${resolvedToken}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${firstBody.boundary}`,
      },
      body: firstBody.totalBuffer,
    });

    const data = await tgRes.json();
    if (!tgRes.ok || !data.ok) {
      if (parse_mode && data.description && data.description.includes("can't parse entities") && caption) {
        const plainCaption = caption.replace(/<[^>]+>/g, '');
        const fallbackBody = buildMultipartBody(plainCaption, undefined);
        const retryRes = await fetch(`https://api.telegram.org/bot${resolvedToken}/sendPhoto`, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${fallbackBody.boundary}`,
          },
          body: fallbackBody.totalBuffer,
        });
        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.ok) {
          return res.json({ success: true, result: retryData.result });
        }
      }
      return res.status(tgRes.status === 429 ? 429 : 400).json({
        success: false,
        error: data.description || 'Telegram API photo error',
        retry_after: data.parameters?.retry_after,
      });
    }

    res.json({ success: true, result: data.result });
  } catch (err: any) {
    console.error('Error sending Telegram photo:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// TELEGRAM COMMAND BOT ENGINE (/start, /register, /passcode, /payment, /contact, /help)
// =========================================================================
const TELEGRAM_BOT_COMMANDS = [
  { command: 'start', description: 'ចាប់ផ្ដើម និងបើកមឺនុយណែនាំប្រើប្រាស់កម្មវិធី' },
  { command: 'register', description: 'ណែនាំជំហានចុះឈ្មោះប្រើប្រាស់ Master Quiz KH' },
  { command: 'passcode', description: 'របៀបស្នើសុំលេខសម្ងាត់សមាជិកពី Admin' },
  { command: 'payment', description: 'ណែនាំការបង់ប្រាក់ KHQR ប្រើប្រាស់ពេញមួយជីវិត' },
  { command: 'contact', description: 'ទំនាក់ទំនង Admin និងចូលក្រុម Telegram' },
  { command: 'help', description: 'បង្ហាញបញ្ជី Command ទាំងអស់របស់ Bot' },
];

interface ServerBotActionButton {
  label: string;
  type: 'command' | 'url' | 'open_member_login';
  value: string;
}

interface ServerBotCommandTemplate {
  command: string;
  descriptionKh?: string;
  title: string;
  body: string;
  imageUrl?: string;
  actions?: ServerBotActionButton[];
}

const BOT_COMMANDS_FILE = path.resolve(__dirname, '.tg_bot_commands.json');

function loadCustomBotTemplates(): Record<string, ServerBotCommandTemplate> {
  try {
    if (!fs.existsSync(BOT_COMMANDS_FILE)) return {};
    const raw = fs.readFileSync(BOT_COMMANDS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCustomBotTemplates(templates: Record<string, ServerBotCommandTemplate>) {
  try {
    fs.writeFileSync(BOT_COMMANDS_FILE, JSON.stringify(templates, null, 2), { mode: 0o600 });
  } catch {
    // Ignore filesystem errors
  }
}

function getEffectiveTelegramBotCommands() {
  const custom = loadCustomBotTemplates();
  return TELEGRAM_BOT_COMMANDS.map((c) => {
    const ov = custom[`/${c.command}`];
    const desc = ov?.descriptionKh?.trim();
    return {
      command: c.command,
      description: desc ? desc.slice(0, 250) : c.description,
    };
  });
}

interface BotWorkerState {
  isRunning: boolean;
  botToken: string;
  botUsername: string;
  appUrl: string;
  offset: number;
  commandsRegistered: boolean;
  handledCount: number;
  lastCommandAt: string | null;
  lastCommandText: string | null;
  lastError: string | null;
  abortController: AbortController | null;
}

const botWorker: BotWorkerState = {
  isRunning: false,
  botToken: '',
  botUsername: '',
  appUrl: '',
  offset: 0,
  commandsRegistered: false,
  handledCount: 0,
  lastCommandAt: null,
  lastCommandText: null,
  lastError: null,
  abortController: null,
};

const BOT_STATE_FILE = path.resolve(__dirname, '.tg_bot_state.json');

function saveBotStateFile(state: { isRunning: boolean; botToken: string; appUrl: string }) {
  try {
    fs.writeFileSync(BOT_STATE_FILE, JSON.stringify(state), { mode: 0o600 });
  } catch {
    // Ignore filesystem errors
  }
}

function loadBotStateFile(): { isRunning: boolean; botToken: string; appUrl: string } | null {
  try {
    if (!fs.existsSync(BOT_STATE_FILE)) return null;
    const raw = fs.readFileSync(BOT_STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.botToken === 'string') {
      return {
        isRunning: Boolean(parsed.isRunning),
        botToken: parsed.botToken,
        appUrl: typeof parsed.appUrl === 'string' ? parsed.appUrl : '',
      };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function isValidTelegramHttpsUrl(u: string): boolean {
  if (!u || typeof u !== 'string') return false;
  const trimmed = u.trim();
  if (!trimmed.startsWith('https://')) return false;
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1') || trimmed.includes('0.0.0.0')) {
    return false;
  }
  return /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(trimmed);
}

function resolveServerBotToken(clientToken?: string): string {
  const fromClient = typeof clientToken === 'string' ? clientToken.trim() : '';
  if (fromClient) return fromClient;
  if (botWorker.botToken) return botWorker.botToken;
  const saved = loadBotStateFile();
  if (saved?.botToken) return saved.botToken.trim();
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
}

const PAYWAY_PAYMENT_LINK = 'https://link.payway.com.kh/ABAPAYox450999g';
const KHQR_PHOTO_PATH = path.resolve(__dirname, 'public/assets/aistudio/image_13971c05.png');

function buildTelegramBotReply(
  rawCmd: string,
  appUrl: string
): { text: string; reply_markup: any; photoPath?: string } {
  const cleaned = (rawCmd || '').trim();
  const cmdToken = cleaned.split(/\s+/)[0].toLowerCase().replace(/@[a-z0-9_]+$/i, '');

  const normalized =
    cmdToken === '/register' || cmdToken === '/signup' || cmdToken === '/login' || cmdToken === 'cmd:register' || cleaned.includes('ចុះឈ្មោះ')
      ? 'register'
      : cmdToken === '/passcode' || cmdToken === '/code' || cmdToken === 'cmd:passcode' || cleaned.includes('លេខសម្ងាត់')
      ? 'passcode'
      : cmdToken === '/payment' || cmdToken === '/khqr' || cmdToken === '/vip' || cmdToken === 'cmd:payment' || cleaned.includes('បង់ប្រាក់')
      ? 'payment'
      : cmdToken === '/contact' || cmdToken === '/admin' || cmdToken === 'cmd:contact' || cleaned.includes('ទាក់ទង')
      ? 'contact'
      : cmdToken === '/help' || cmdToken === 'cmd:help' || cleaned.includes('ជំនួយ')
      ? 'help'
      : 'start';

  const envAppUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL' ? process.env.APP_URL : '';
  const candidateUrl = isValidTelegramHttpsUrl(appUrl)
    ? appUrl.trim()
    : isValidTelegramHttpsUrl(envAppUrl)
    ? envAppUrl.trim()
    : 'https://ais-pre-465pdvc3s6xpdxzfakguy4-895267791362.asia-southeast1.run.app';

  const openAppRow = isValidTelegramHttpsUrl(candidateUrl)
    ? [{ text: '📱 បើកកម្មវិធី Master Quiz KH', url: candidateUrl }]
    : [];

  const customTemplates = loadCustomBotTemplates();
  const custom = customTemplates[`/${normalized}`];
  if (custom && typeof custom.title === 'string' && typeof custom.body === 'string') {
    const customButtons: any[] = [];
    for (const act of Array.isArray(custom.actions) ? custom.actions : []) {
      if (!act || !act.label || !act.value) continue;
      if (act.type === 'command') {
        const cleanTarget = act.value.trim().replace(/^\//, '');
        customButtons.push({ text: act.label.slice(0, 64), callback_data: `cmd:${cleanTarget}` });
      } else if (act.type === 'url') {
        if (isValidTelegramHttpsUrl(act.value)) {
          customButtons.push({ text: act.label.slice(0, 64), url: act.value.trim() });
        }
      } else if (act.type === 'open_member_login') {
        if (isValidTelegramHttpsUrl(candidateUrl)) {
          customButtons.push({ text: act.label.slice(0, 64), url: candidateUrl });
        }
      }
    }

    const inlineRows: any[][] = [];
    for (const btn of customButtons) {
      inlineRows.push([btn]);
    }
    if (openAppRow.length > 0 && !customButtons.some((b) => b.url === candidateUrl)) {
      inlineRows.push(openAppRow);
    }

    const bodyText = custom.body.trim();
    const formattedText =
      `<b>${escapeServerHtml(custom.title.trim())}</b>` +
      (bodyText ? `\n\n${escapeServerHtml(bodyText)}` : '');

    return {
      photoPath:
        normalized === 'payment' && custom.imageUrl !== '' && fs.existsSync(KHQR_PHOTO_PATH)
          ? KHQR_PHOTO_PATH
          : undefined,
      text: formattedText,
      reply_markup: inlineRows.length > 0 ? { inline_keyboard: inlineRows } : undefined,
    };
  }

  if (normalized === 'register') {
    return {
      text:
        `<b>📝 ការណែនាំចុះឈ្មោះប្រើប្រាស់ Master Quiz KH</b>\n\n` +
        `ដើម្បីចុះឈ្មោះ និងចូលធ្វើតេស្ត សូមអនុវត្តតាម ៤ ជំហានងាយៗ៖\n` +
        `<b>១.</b> ចុចបើកកម្មវិធី រួចជ្រើសរើសកាត <b>«សមាជិក (Member)»</b>\n` +
        `<b>២.</b> បំពេញ <b>ឈ្មោះអ្នកប្រើប្រាស់ (Username)</b> របស់អ្នក (ឧ. Dara ឬ សុខា)\n` +
        `<b>៣.</b> បញ្ចូល <b>លេខសម្ងាត់សមាជិក (Passcode)</b> ដែលអ្នកបានទទួលពី Admin\n` +
        `<b>៤.</b> ចុច <b>«ផ្ទៀងផ្ទាត់ និងចូលធ្វើតេស្ត»</b> ដើម្បីចាប់ផ្ដើមហ្វឹកហាត់វិញ្ញាសាភ្លាមៗ!\n\n` +
        `✨ <i>សាកល្បងឥតគិតថ្លៃ ២៥ សំណួរ/មុខវិជ្ជា ឬដំឡើងសិទ្ធិពេញមួយជីវិត (/payment)។</i>`,
      reply_markup: {
        inline_keyboard: [
          ...(openAppRow.length > 0 ? [openAppRow] : []),
          [
            { text: '🔐 ស្នើសុំលេខសម្ងាត់', callback_data: 'cmd:passcode' },
            { text: '💎 បង់ប្រាក់ KHQR', callback_data: 'cmd:payment' },
          ],
          [{ text: '📞 ទាក់ទង Admin (@qcm_and_q_a)', url: 'https://t.me/qcm_and_q_a' }],
        ],
      },
    };
  }

  if (normalized === 'passcode') {
    return {
      text:
        `<b>🔐 ការស្នើសុំលេខសម្ងាត់សមាជិក (Passcode)</b>\n\n` +
        `ដើម្បីសុវត្ថិភាពគណនី កម្មវិធីមិនបង្ហាញ ឬផ្ដល់ទិន្នន័យអំពីលេខសម្ងាត់ជាសាធារណៈតាម Bot នោះទេ។\n\n` +
        `<b>📌 របៀបទទួលបានលេខសម្ងាត់ ឬស្នើសុំកូដថ្មី៖</b>\n` +
        `១. ចុចទាក់ទង Admin តាម Telegram ខាងក្រោម (@qcm_and_q_a)\n` +
        `២. ផ្ញើឈ្មោះអ្នកប្រើប្រាស់ (Username) របស់អ្នក ដើម្បីឱ្យ Admin ផ្ដល់កូដសមាជិកជូនដោយផ្ទាល់។`,
      reply_markup: {
        inline_keyboard: [
          ...(openAppRow.length > 0 ? [openAppRow] : []),
          [
            { text: '📞 ទាក់ទង Admin (@qcm_and_q_a)', url: 'https://t.me/qcm_and_q_a' },
            { text: '📝 ជំហានចុះឈ្មោះ', callback_data: 'cmd:register' },
          ],
        ],
      },
    };
  }

  if (normalized === 'payment') {
    return {
      photoPath: fs.existsSync(KHQR_PHOTO_PATH) ? KHQR_PHOTO_PATH : undefined,
      text:
        `<b>💎 ការចុះឈ្មោះគណនីពេញមួយជីវិត (KHQR / ABA PayWay $10.00)</b>\n\n` +
        `✅ ធ្វើតេស្ត QCM, Q&A និងពន្យល់ពាក្យគ្មានដែនកំណត់\n` +
        `✅ ទាញយកឯកសារវិញ្ញាសា PDF (មានក្របខ្មែរ & តារាងចម្លើយ)\n\n` +
        `<b>📌 ព័ត៌មានទូទាត់ ($10.00 USD)៖</b>\n` +
        `• គណនីទទួល៖ <b>KHOUN NARET Master QuizKH</b>\n` +
        `• ស្កេន KHQR ខាងលើ ឬចុចប៊ូតុង <b>«បើក Link បង់ប្រាក់ ABA PayWay»</b>\n` +
        `• រួចរាល់សូមផ្ញើវិក្កយបត្រមកកាន់ @qcm_and_q_a ដើម្បីបើកសិទ្ធិពេញមួយជីវិតភ្លាមៗ!`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 បើក Link បង់ប្រាក់ ABA PayWay ($10)', url: PAYWAY_PAYMENT_LINK }],
          [
            { text: '📞 ផ្ញើវិក្កយបត្រទៅ @qcm_and_q_a', url: 'https://t.me/qcm_and_q_a' },
            { text: '📝 ជំហានចុះឈ្មោះ', callback_data: 'cmd:register' },
          ],
          ...(openAppRow.length > 0 ? [openAppRow] : []),
        ],
      },
    };
  }

  if (normalized === 'contact') {
    return {
      text:
        `<b>📞 ទំនាក់ទំនង Admin និងបណ្ដាញ Telegram</b>\n\n` +
        `• ទំនាក់ទំនង & ក្រុមសិក្សា QCM & Q&A៖ <a href="https://t.me/qcm_and_q_a">@qcm_and_q_a</a>\n` +
        `• Telegram Bot ផ្លូវការ៖ <a href="https://t.me/qiuzs_bot">@qiuzs_bot</a>`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💬 ទាក់ទង @qcm_and_q_a', url: 'https://t.me/qcm_and_q_a' },
            { text: '🤖 Bot @qiuzs_bot', url: 'https://t.me/qiuzs_bot' },
          ],
          ...(openAppRow.length > 0 ? [openAppRow] : []),
        ],
      },
    };
  }

  if (normalized === 'help') {
    return {
      text:
        `<b>📚 បញ្ជី Command របស់ Master Quiz KH Bot</b>\n\n` +
        `/start — មឺនុយស្វាគមន៍ និងការចាប់ផ្ដើម\n` +
        `/register — ណែនាំជំហានចុះឈ្មោះប្រើប្រាស់កម្មវិធី\n` +
        `/passcode — របៀបស្នើសុំលេខសម្ងាត់ពី Admin\n` +
        `/payment — ការបង់ប្រាក់ KHQR ពេញមួយជីវិត\n` +
        `/contact — ទំនាក់ទំនង Admin និងក្រុម Telegram\n` +
        `/help — មើលបញ្ជី Command ទាំងអស់`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📝 /register', callback_data: 'cmd:register' },
            { text: '🔐 /passcode', callback_data: 'cmd:passcode' },
          ],
          [
            { text: '💎 /payment', callback_data: 'cmd:payment' },
            { text: '📞 /contact', callback_data: 'cmd:contact' },
          ],
          ...(openAppRow.length > 0 ? [openAppRow] : []),
        ],
      },
    };
  }

  // Default: /start welcome
  return {
    text:
      `<b>🙏 សូមស្វាគមន៍មកកាន់ Master Quiz KH Bot!</b>\n\n` +
      `ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋកម្ពុជា (QCM, Q&A, ពន្យល់ពាក្យ និង PDF)។\n\n` +
      `ចុចប៊ូតុងខាងក្រោម ឬវាយ Command ដើម្បីទទួលការណែនាំ៖\n` +
      `• /register — ណែនាំជំហានចុះឈ្មោះប្រើប្រាស់\n` +
      `• /passcode — របៀបស្នើសុំលេខសម្ងាត់ពី Admin\n` +
      `• /payment — គណនីពេញមួយជីវិត ($10 KHQR)\n` +
      `• /help — បញ្ជី Command ទាំងអស់`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '📝 ណែនាំចុះឈ្មោះ (/register)', callback_data: 'cmd:register' }],
        [
          { text: '🔐 ស្នើសុំលេខសម្ងាត់ (/passcode)', callback_data: 'cmd:passcode' },
          { text: '💎 បង់ប្រាក់ (/payment)', callback_data: 'cmd:payment' },
        ],
        [
          { text: '📞 ទាក់ទង @qcm_and_q_a', url: 'https://t.me/qcm_and_q_a' },
          { text: '📚 Commands (/help)', callback_data: 'cmd:help' },
        ],
        ...(openAppRow.length > 0 ? [openAppRow] : []),
      ],
    },
  };
}

async function registerCommandsWithTelegram(botToken: string): Promise<boolean> {
  const effectiveCommands = getEffectiveTelegramBotCommands();
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands: effectiveCommands }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'Failed to register Bot Commands');
  }

  // Configure Khmer Bot Description, Short Description, and Chat Menu Button directly on Telegram
  await fetch(`https://api.telegram.org/bot${botToken}/setMyDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description:
        'សូមស្វាគមន៍មកកាន់ Master Quiz KH Bot!\n\n' +
        'ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋកម្ពុជា (QCM, Q&A, ពន្យល់ពាក្យ និង Export PDF)។\n' +
        'ចុច Start ឬវាយ /register ដើម្បីទទួលការណែនាំអំពីការចុះឈ្មោះប្រើប្រាស់កម្មវិធីភ្លាមៗ!',
    }),
  }).catch(() => {});

  await fetch(`https://api.telegram.org/bot${botToken}/setMyShortDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      short_description: 'ជំនួយការស្វ័យប្រវត្តិ Master Quiz KH · ណែនាំចុះឈ្មោះ ការប្រើប្រាស់ និង KHQR',
    }),
  }).catch(() => {});

  await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      menu_button: { type: 'commands' },
    }),
  }).catch(() => {});

  return true;
}

async function processTelegramUpdate(botToken: string, update: any, appUrl: string) {
  if (!update) return;

  let chatId: number | string | null = null;
  let commandInput = '';

  if (update.message && update.message.chat && typeof update.message.text === 'string') {
    const text = update.message.text.trim();
    const isPrivateChat = update.message.chat.type === 'private';
    if (text.startsWith('/') || isPrivateChat) {
      chatId = update.message.chat.id;
      commandInput = text;
    }
  } else if (update.callback_query && update.callback_query.data) {
    const cq = update.callback_query;
    if (String(cq.data).startsWith('cmd:')) {
      chatId = cq.message?.chat?.id ?? cq.from?.id ?? null;
      commandInput = String(cq.data);
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cq.id }),
      }).catch(() => {});
    }
  }

  if (!chatId || !commandInput) return;

  const reply = buildTelegramBotReply(commandInput, appUrl);

  // If reply includes a local photo card (e.g. KHQR payment QR), send via sendPhoto first
  if (reply.photoPath) {
    try {
      const imgBuffer = fs.readFileSync(reply.photoPath);
      const b = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const chunks: Buffer[] = [];
      const addFld = (name: string, value: string) => {
        chunks.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
      };
      addFld('chat_id', String(chatId));
      addFld('caption', reply.text.slice(0, 1020));
      addFld('parse_mode', 'HTML');
      if (reply.reply_markup) {
        addFld('reply_markup', JSON.stringify(reply.reply_markup));
      }
      chunks.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="photo"; filename="khqr_payment.png"\r\nContent-Type: image/png\r\n\r\n`));
      chunks.push(imgBuffer);
      chunks.push(Buffer.from(`\r\n--${b}--\r\n`));

      const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${b}` },
        body: Buffer.concat(chunks),
      });
      const photoData = await photoRes.json().catch(() => ({ ok: false }));
      if (photoRes.ok && photoData.ok) {
        botWorker.lastError = null;
        botWorker.handledCount += 1;
        botWorker.lastCommandAt = new Date().toISOString();
        botWorker.lastCommandText = commandInput.slice(0, 60);
        return;
      }
      botWorker.lastError = photoData?.description || `Telegram sendPhoto error (${photoRes.status})`;
      console.warn('Telegram Command Bot sendPhoto failed, falling back to sendMessage:', botWorker.lastError);
    } catch (photoErr: any) {
      console.warn('Telegram Command Bot photo read/send error, falling back:', photoErr?.message || photoErr);
    }
  }

  const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: reply.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: reply.reply_markup,
    }),
  });
  const sendData = await sendRes.json().catch(() => ({ ok: false }));

  if (!sendRes.ok || !sendData.ok) {
    botWorker.lastError = sendData?.description || `Telegram sendMessage error (${sendRes.status})`;
    console.warn('Telegram Command Bot primary sendMessage failed:', botWorker.lastError);
    // Fallback retry without inline keyboard URL buttons / HTML in case Telegram rejected a button URL
    const fallbackRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply.text.replace(/<[^>]+>/g, ''),
        disable_web_page_preview: true,
      }),
    });
    const fallbackData = await fallbackRes.json().catch(() => ({ ok: false }));
    if (!fallbackRes.ok || !fallbackData.ok) {
      return;
    }
  }

  botWorker.lastError = null;
  botWorker.handledCount += 1;
  botWorker.lastCommandAt = new Date().toISOString();
  botWorker.lastCommandText = commandInput.slice(0, 60);
}

async function startCommandBotWorker(cleanToken: string, origin: string) {
  const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
  const meData = await meRes.json();
  if (!meRes.ok || !meData.ok) {
    throw new Error(meData.description || 'មិនអាចតភ្ជាប់ទៅ Telegram Bot Token នេះបានទេ');
  }

  // Clear webhook so getUpdates polling runs without 409 conflicts
  await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drop_pending_updates: false }),
  });

  await registerCommandsWithTelegram(cleanToken);

  if (botWorker.abortController) {
    botWorker.abortController.abort();
    botWorker.abortController = null;
  }

  botWorker.isRunning = true;
  botWorker.botToken = cleanToken;
  botWorker.botUsername = meData.result?.username || '';
  botWorker.appUrl = origin;
  botWorker.commandsRegistered = true;
  botWorker.lastError = null;

  saveBotStateFile({
    isRunning: true,
    botToken: cleanToken,
    appUrl: origin,
  });

  runTelegramPollingLoop(cleanToken, origin).catch((err) => {
    console.error('Telegram polling loop stopped:', err);
  });
}

async function runTelegramPollingLoop(botToken: string, appUrl: string) {
  while (botWorker.isRunning && botWorker.botToken === botToken) {
    try {
      const controller = new AbortController();
      botWorker.abortController = controller;
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?offset=${botWorker.offset}&timeout=20&allowed_updates=${encodeURIComponent(
          JSON.stringify(['message', 'callback_query'])
        )}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        botWorker.lastError = data.description || 'Polling error';
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      botWorker.lastError = null;
      const updates: any[] = Array.isArray(data.result) ? data.result : [];
      for (const upd of updates) {
        if (typeof upd.update_id === 'number') {
          botWorker.offset = Math.max(botWorker.offset, upd.update_id + 1);
        }
        await processTelegramUpdate(botToken, upd, appUrl).catch((err) => {
          console.error('Error handling Telegram update:', err);
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') break;
      botWorker.lastError = err?.message || 'Polling network error';
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// Endpoint: Test Telegram Bot Connection (supports client token or server-configured token)
app.post('/api/telegram/bot/test', async (req, res) => {
  try {
    const cleanToken = resolveServerBotToken(req.body?.botToken);
    if (!cleanToken) {
      return res.status(400).json({ success: false, error: 'សូមបញ្ចូល Telegram Bot Token ជាមុនសិន!' });
    }
    const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await meRes.json();
    if (!meRes.ok || !meData.ok) {
      return res.status(400).json({
        success: false,
        error: meData.description || 'មិនអាចតភ្ជាប់ទៅកាន់ Telegram Bot បានទេ',
      });
    }
    res.json({ success: true, result: meData.result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Register Telegram Bot Slash Commands menu (setMyCommands + Bot profile description)
app.post('/api/telegram/bot/set-commands', async (req, res) => {
  try {
    const cleanToken = resolveServerBotToken(req.body?.botToken);
    if (!cleanToken) {
      return res.status(400).json({ success: false, error: 'Missing botToken' });
    }
    await registerCommandsWithTelegram(cleanToken);
    botWorker.commandsRegistered = true;
    res.json({ success: true, commands: getEffectiveTelegramBotCommands() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Endpoint: Read or Update Custom Command Bot Reply Templates
app.get('/api/telegram/bot/templates', (_req, res) => {
  res.json({ success: true, templates: loadCustomBotTemplates() });
});

app.post('/api/telegram/bot/templates', async (req, res) => {
  try {
    const incoming = req.body?.templates;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return res.status(400).json({ success: false, error: 'Invalid templates payload' });
    }
    saveCustomBotTemplates(incoming);
    if (botWorker.isRunning && botWorker.botToken) {
      await registerCommandsWithTelegram(botWorker.botToken).catch(() => {});
    }
    res.json({ success: true, templates: incoming });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Start Telegram Command Bot Auto-Reply Worker (Long Polling + setMyCommands)
app.post('/api/telegram/bot/start', async (req, res) => {
  try {
    const { botToken, appUrl } = req.body || {};
    const cleanToken = resolveServerBotToken(botToken);
    if (!cleanToken) {
      return res.status(400).json({ success: false, error: 'សូមបញ្ចូល Telegram Bot Token ជាមុនសិន!' });
    }

    const origin =
      typeof appUrl === 'string' && isValidTelegramHttpsUrl(appUrl)
        ? appUrl.trim().replace(/\/+$/, '')
        : getBaseOrigin(req);

    await startCommandBotWorker(cleanToken, origin);

    res.json({
      success: true,
      isRunning: true,
      botUsername: botWorker.botUsername,
      hasServerToken: true,
      commands: TELEGRAM_BOT_COMMANDS,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Endpoint: Stop Telegram Command Bot Auto-Reply Worker
app.post('/api/telegram/bot/stop', (_req, res) => {
  botWorker.isRunning = false;
  if (botWorker.abortController) {
    botWorker.abortController.abort();
    botWorker.abortController = null;
  }
  if (botWorker.botToken) {
    saveBotStateFile({
      isRunning: false,
      botToken: botWorker.botToken,
      appUrl: botWorker.appUrl,
    });
  }
  res.json({ success: true, isRunning: false });
});

// Endpoint: Check Telegram Command Bot Status (never leaks secret token)
app.get('/api/telegram/bot/status', (_req, res) => {
  res.json({
    isRunning: botWorker.isRunning,
    botUsername: botWorker.botUsername,
    hasServerToken: Boolean(resolveServerBotToken()),
    commandsRegistered: botWorker.commandsRegistered,
    handledCount: botWorker.handledCount,
    lastCommandAt: botWorker.lastCommandAt,
    lastCommandText: botWorker.lastCommandText,
    lastError: botWorker.lastError,
    commands: TELEGRAM_BOT_COMMANDS,
  });
});

// Endpoint: Optional Webhook Receiver for Telegram Bot Commands
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const token =
      (req.headers['x-telegram-bot-token'] as string) ||
      botWorker.botToken ||
      process.env.TELEGRAM_BOT_TOKEN ||
      '';
    if (token && req.body) {
      await processTelegramUpdate(token, req.body, getBaseOrigin(req));
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    res.json({ ok: true });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Master Quiz KH' });
});

// Mount Vite or static dist in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Master Quiz KH server running on http://0.0.0.0:${PORT}`);

    // Auto-resume Telegram Command Bot if token was previously saved or set via env
    const savedState = loadBotStateFile();
    const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
    const tokenToResume =
      savedState && savedState.isRunning && savedState.botToken
        ? savedState.botToken
        : envToken;
    const resumeAppUrl =
      (savedState?.appUrl && isValidTelegramHttpsUrl(savedState.appUrl) ? savedState.appUrl : '') ||
      (process.env.APP_URL && isValidTelegramHttpsUrl(process.env.APP_URL) ? process.env.APP_URL : '');

    if (tokenToResume) {
      startCommandBotWorker(tokenToResume, resumeAppUrl).catch((err) => {
        console.warn('Could not auto-resume Telegram Command Bot:', err?.message || err);
      });
    }
  });
}

startServer();
