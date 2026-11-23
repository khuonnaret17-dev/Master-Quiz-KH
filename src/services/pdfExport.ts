import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Question } from '../types';
import { toKhmerNum, getOptionLabel } from '../utils/khmer';

export type PdfTemplateId =
  | 'royal'
  | 'classic'
  | 'vivid'
  | 'emerald'
  | 'modern_blue'
  | 'khmer_heritage';

export type PdfKhmerFontId =
  | 'Kantumruy Pro'
  | 'Battambang'
  | 'Siemreap'
  | 'Noto Serif Khmer'
  | 'Noto Sans Khmer'
  | 'Hanuman'
  | 'Khmer'
  | 'Moul';

export type PdfTitleFontId = 'Moul' | 'same';
export type PdfFontSizeId = 'small' | 'medium' | 'large';
export type PdfPageBorderId = 'none' | 'single' | 'double';
export type PdfAnswerMode = 'last_page_table' | 'both' | 'inline' | 'none';

export interface PdfHeaderConfig {
  showHeader: boolean;
  showNationalMotto: boolean;
  line1: string;
  line2: string;
  organization: string;
  documentTitle: string;
  showCandidateBox: boolean;
  runningHeader: string;
}

export interface PdfFooterConfig {
  showFooter: boolean;
  leftText: string;
  rightText: string;
  showPageNumbers: boolean;
}

export interface PdfExportSettings {
  template: PdfTemplateId;
  bodyFont: PdfKhmerFontId;
  titleFont: PdfTitleFontId;
  fontSize: PdfFontSizeId;
  pageBorder: PdfPageBorderId;
  includeCoverPage?: boolean;
  answerMode?: PdfAnswerMode;
  header: PdfHeaderConfig;
  footer: PdfFooterConfig;
}

export const DEFAULT_PDF_SETTINGS: PdfExportSettings = {
  template: 'royal',
  bodyFont: 'Kantumruy Pro',
  titleFont: 'Moul',
  fontSize: 'medium',
  pageBorder: 'none',
  includeCoverPage: true,
  answerMode: 'last_page_table',
  header: {
    showHeader: true,
    showNationalMotto: true,
    line1: 'ព្រះរាជាណាចក្រកម្ពុជា',
    line2: 'ជាតិ · សាសនា · ព្រះមហាក្សត្រ',
    organization: 'ប្រព័ន្ធគ្រប់គ្រង និងធ្វើតេស្ត Master Quiz KH',
    documentTitle: 'វិញ្ញាសាត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ',
    showCandidateBox: false,
    runningHeader: '',
  },
  footer: {
    showFooter: true,
    leftText: 'Master Quiz KH · ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ',
    rightText: '',
    showPageNumbers: true,
  },
};

export interface PdfTemplateMeta {
  id: PdfTemplateId;
  nameKhmer: string;
  descKhmer: string;
  pageBg: string;
  accent: string;
  heading: string;
  kingdom: string;
  divider: string;
  answerBg: string;
  answerBorder: string;
  answerText: string;
  correctBg: string;
  correctText: string;
  correctBorder: string;
  defaultBorder: PdfPageBorderId;
}

export const PDF_TEMPLATES: PdfTemplateMeta[] = [
  {
    id: 'royal',
    nameKhmer: 'Royal Navy & Gold',
    descKhmer: 'ផ្លូវការ ខៀវរាជ & មាស',
    pageBg: '#ffffff',
    accent: '#1e3a8a',
    heading: '#0f172a',
    kingdom: '#b45309',
    divider: '#d97706',
    answerBg: '#eff6ff',
    answerBorder: '#93c5fd',
    answerText: '#1e3a8a',
    correctBg: '#ecfdf5',
    correctText: '#065f46',
    correctBorder: '#6ee7b7',
    defaultBorder: 'none',
  },
  {
    id: 'classic',
    nameKhmer: 'Classic B&W (ស-ខ្មៅ)',
    descKhmer: 'សាមញ្ញ ច្បាស់ សន្សំទឹកថ្នាំ',
    pageBg: '#ffffff',
    accent: '#0f172a',
    heading: '#0f172a',
    kingdom: '#1e293b',
    divider: '#475569',
    answerBg: '#f8fafc',
    answerBorder: '#cbd5e1',
    answerText: '#1e293b',
    correctBg: '#f1f5f9',
    correctText: '#0f172a',
    correctBorder: '#94a3b8',
    defaultBorder: 'none',
  },
  {
    id: 'vivid',
    nameKhmer: 'Admin Maroon',
    descKhmer: 'កម្រាលរដ្ឋបាល ក្រហមឈាមជ្រូក',
    pageBg: '#ffffff',
    accent: '#881337',
    heading: '#4c0519',
    kingdom: '#b45309',
    divider: '#be123c',
    answerBg: '#fff1f2',
    answerBorder: '#fda4af',
    answerText: '#881337',
    correctBg: '#ecfdf5',
    correctText: '#065f46',
    correctBorder: '#6ee7b7',
    defaultBorder: 'none',
  },
  {
    id: 'emerald',
    nameKhmer: 'Emerald Academy',
    descKhmer: 'បៃតងមរកត ត្រជាក់ភ្នែក',
    pageBg: '#ffffff',
    accent: '#065f46',
    heading: '#022c22',
    kingdom: '#047857',
    divider: '#10b981',
    answerBg: '#ecfdf5',
    answerBorder: '#6ee7b7',
    answerText: '#065f46',
    correctBg: '#f0fdf4',
    correctText: '#166534',
    correctBorder: '#86efac',
    defaultBorder: 'none',
  },
  {
    id: 'modern_blue',
    nameKhmer: 'Modern Sky Minimal',
    descKhmer: 'ទំនើប ស្រឡះ បន្ទាត់ស្អាត',
    pageBg: '#ffffff',
    accent: '#0369a1',
    heading: '#0c4a6e',
    kingdom: '#0284c7',
    divider: '#38bdf8',
    answerBg: '#f0f9ff',
    answerBorder: '#bae6fd',
    answerText: '#075985',
    correctBg: '#ecfdf5',
    correctText: '#065f46',
    correctBorder: '#6ee7b7',
    defaultBorder: 'none',
  },
  {
    id: 'khmer_heritage',
    nameKhmer: 'Khmer Heritage Frame',
    descKhmer: 'ក្រដាសមាសបុរាណ & ស៊ុមពីរជាន់',
    pageBg: '#fffdf7',
    accent: '#78350f',
    heading: '#451a03',
    kingdom: '#b45309',
    divider: '#d97706',
    answerBg: '#fef3c7',
    answerBorder: '#fcd34d',
    answerText: '#78350f',
    correctBg: '#ecfdf5',
    correctText: '#065f46',
    correctBorder: '#6ee7b7',
    defaultBorder: 'double',
  },
];

export const PDF_KHMER_FONTS: Array<{
  id: PdfKhmerFontId;
  label: string;
  note: string;
}> = [
  { id: 'Kantumruy Pro', label: 'Kantumruy Pro', note: 'ទំនើប ច្បាស់លាស់ (ស្ដង់ដារ)' },
  { id: 'Battambang', label: 'Battambang', note: 'បាត់ដំបង — ពេញនិយមសម្រាប់វិញ្ញាសា' },
  { id: 'Siemreap', label: 'Siemreap', note: 'សៀមរាប — ទន់ភ្លន់ ងាយអាន' },
  { id: 'Noto Serif Khmer', label: 'Noto Serif Khmer', note: 'សៀវភៅ & ឯកសារច្បាប់' },
  { id: 'Noto Sans Khmer', label: 'Noto Sans Khmer', note: 'សាមញ្ញ ស្អាតគ្រប់ទំហំ' },
  { id: 'Hanuman', label: 'Hanuman', note: 'ហនុមាន — ក្រាស់ មុតច្បាស់ពេល Print' },
  { id: 'Khmer', label: 'Khmer', note: 'ពុម្ពអក្សរខ្មែរប្រពៃណីរដ្ឋបាល' },
  { id: 'Moul', label: 'Moul (មូល)', note: 'អក្សរមូលប្រពៃណី' },
];

export const PDF_FONT_SIZES: Record<
  PdfFontSizeId,
  { label: string; qPx: number; optPx: number; ansPx: number; spacingPx: number }
> = {
  small: { label: 'តូច (សន្សំទំព័រ)', qPx: 11.5, optPx: 10.5, ansPx: 10.5, spacingPx: 10 },
  medium: { label: 'មធ្យម (ស្ដង់ដារ)', qPx: 13, optPx: 12, ansPx: 12, spacingPx: 14 },
  large: { label: 'ធំ (ច្បាស់ល្អ)', qPx: 15, optPx: 13.5, ansPx: 13.5, spacingPx: 16 },
};

export interface ExportPdfOptions {
  subjectTitle: string;
  questions: Question[];
  template?: PdfTemplateId;
  includeCoverPage?: boolean;
  answerMode?: PdfAnswerMode;
  includeAnswerKey?: boolean;
  settings?: Partial<PdfExportSettings>;
  filename?: string;
  onProgress?: (currentPage: number, totalPages: number) => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFontCss(fontName: PdfKhmerFontId | 'Moul'): string {
  return `'${fontName}', 'Kantumruy Pro', sans-serif`;
}

function resolveSettings(options: ExportPdfOptions): PdfExportSettings {
  const s = options.settings || {};
  let resolvedAnswerMode: PdfAnswerMode =
    options.answerMode || s.answerMode || DEFAULT_PDF_SETTINGS.answerMode || 'last_page_table';
  if (!options.answerMode && !s.answerMode && typeof options.includeAnswerKey === 'boolean') {
    resolvedAnswerMode = options.includeAnswerKey ? 'both' : 'none';
  }
  return {
    template: options.template || s.template || DEFAULT_PDF_SETTINGS.template,
    bodyFont: s.bodyFont || DEFAULT_PDF_SETTINGS.bodyFont,
    titleFont: s.titleFont || DEFAULT_PDF_SETTINGS.titleFont,
    fontSize: s.fontSize || DEFAULT_PDF_SETTINGS.fontSize,
    pageBorder: s.pageBorder ?? DEFAULT_PDF_SETTINGS.pageBorder,
    includeCoverPage:
      options.includeCoverPage ?? s.includeCoverPage ?? DEFAULT_PDF_SETTINGS.includeCoverPage ?? true,
    answerMode: resolvedAnswerMode,
    header: {
      ...DEFAULT_PDF_SETTINGS.header,
      ...(s.header || {}),
    },
    footer: {
      ...DEFAULT_PDF_SETTINGS.footer,
      ...(s.footer || {}),
    },
  };
}

function buildKhmerCornerSvg(accent: string, divider: string): string {
  return `
    <svg width="88" height="88" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 90 L4 4 L90 4" stroke="${accent}" stroke-width="2.2" stroke-linecap="square"/>
      <path d="M11 86 L11 11 L86 11" stroke="${divider}" stroke-width="1.2" stroke-linecap="square"/>
      <path d="M15 24 C17 15, 24 14, 34 15 C25 20, 20 25, 15 34 C14 24, 15 24, 15 24 Z" fill="${divider}" fill-opacity="0.22" stroke="${accent}" stroke-width="1.5"/>
      <path d="M18 18 L28 18 L24 24 L18 28 Z" fill="${accent}"/>
      <path d="M35 15 C45 10, 54 16, 62 11 C57 18, 49 20, 41 19" stroke="${accent}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M62 11 C69 8, 76 11, 80 15 C74 17, 68 16, 63 14" stroke="${divider}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M15 35 C10 45, 16 54, 11 62 C18 57, 20 49, 19 41" stroke="${accent}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M11 62 C8 69, 11 76, 15 80 C17 74, 16 68, 14 63" stroke="${divider}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <circle cx="84" cy="11" r="2.2" fill="${divider}"/>
      <circle cx="11" cy="84" r="2.2" fill="${divider}"/>
    </svg>
  `;
}

function buildKhmerLotusCrestSvg(accent: string, divider: string): string {
  return `
    <svg width="116" height="56" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 4 C65 16, 68 26, 60 40 C52 26, 55 16, 60 4 Z" fill="${divider}" fill-opacity="0.25" stroke="${accent}" stroke-width="1.8"/>
      <path d="M60 12 C62.5 20, 63.5 27, 60 36 C56.5 27, 57.5 20, 60 12 Z" fill="${accent}"/>
      <path d="M54 36 C45 26, 38 19, 28 21 C34 29, 41 36, 50 40" fill="${divider}" fill-opacity="0.18" stroke="${accent}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M66 36 C75 26, 82 19, 92 21 C86 29, 79 36, 70 40" fill="${divider}" fill-opacity="0.18" stroke="${accent}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M46 42 C33 38, 22 33, 14 38 C21 44, 31 46, 44 45" stroke="${divider}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M74 42 C87 38, 98 33, 106 38 C99 44, 89 46, 76 45" stroke="${divider}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M26 49 L94 49" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M40 53 L80 53" stroke="${divider}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M60 44 L65 49 L60 54 L55 49 Z" fill="${divider}" stroke="${accent}" stroke-width="1.2"/>
    </svg>
  `;
}

function buildKhmerDividerSvg(accent: string, divider: string): string {
  return `
    <svg width="260" height="24" viewBox="0 0 260 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="8" y1="12" x2="104" y2="12" stroke="${divider}" stroke-width="1.4"/>
      <line x1="28" y1="15" x2="98" y2="15" stroke="${accent}" stroke-width="0.8" stroke-opacity="0.6"/>
      <line x1="156" y1="12" x2="252" y2="12" stroke="${divider}" stroke-width="1.4"/>
      <line x1="162" y1="15" x2="232" y2="15" stroke="${accent}" stroke-width="0.8" stroke-opacity="0.6"/>
      <path d="M130 3 L139 12 L130 21 L121 12 Z" fill="${divider}" fill-opacity="0.25" stroke="${accent}" stroke-width="1.5"/>
      <path d="M130 7 L135 12 L130 17 L125 12 Z" fill="${accent}"/>
      <path d="M116 12 C112 7, 107 8, 104 12 C107 16, 112 17, 116 12 Z" stroke="${accent}" stroke-width="1.2" fill="${divider}" fill-opacity="0.2"/>
      <path d="M144 12 C148 7, 153 8, 156 12 C153 16, 148 17, 144 12 Z" stroke="${accent}" stroke-width="1.2" fill="${divider}" fill-opacity="0.2"/>
    </svg>
  `;
}

export function getPdfQuestionTypeSummary(questions: Question[]): string {
  const hasMcq = questions.some((q) => q.type === 'mcq');
  const hasWritten = questions.some((q) => q.type === 'short' || q.type === 'explanation');
  if (hasMcq && hasWritten) return 'ចម្រុះ (QCM និងសរសេរ)';
  if (hasMcq) return 'ពហុជ្រើសរើស (QCM)';
  return 'សំណួរ-ចម្លើយ និងពន្យល់';
}

export function getPdfAnswerModeSummary(answerMode: PdfAnswerMode): string {
  switch (answerMode) {
    case 'last_page_table':
      return 'តារាងចម្លើយទំព័រចុងក្រោយ';
    case 'both':
      return 'ចម្លើយពេញលេញ & តារាងចុងក្រោយ';
    case 'inline':
      return 'ចម្លើយបកស្រាយក្រោមសំណួរ';
    case 'none':
      return 'វិញ្ញាសាប្រឡង (គ្មានចម្លើយ)';
  }
}

function buildCoverPageHtml(
  subjectTitle: string,
  questions: Question[],
  colors: PdfTemplateMeta,
  cfg: PdfExportSettings,
  answerMode: PdfAnswerMode
): string {
  const bodyFontCss = getFontCss(cfg.bodyFont);
  const titleFontCss = cfg.titleFont === 'Moul' ? "'Moul', serif" : bodyFontCss;
  const cornerSvg = buildKhmerCornerSvg(colors.accent, colors.divider);
  const crestSvg = buildKhmerLotusCrestSvg(colors.accent, colors.divider);
  const dividerSvg = buildKhmerDividerSvg(colors.accent, colors.divider);

  const docCategory =
    cfg.header.documentTitle.trim() || 'វិញ្ញាសាត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ';
  const orgText =
    cfg.header.organization.trim() || 'ប្រព័ន្ធគ្រប់គ្រង និងធ្វើតេស្ត Master Quiz KH';
  const typeSummary = getPdfQuestionTypeSummary(questions);
  const answerSummary = getPdfAnswerModeSummary(answerMode);

  const mottoBlock = cfg.header.showNationalMotto
    ? `
      <div style="text-align:center;">
        ${
          cfg.header.line1.trim()
            ? `<div style="font-family:${titleFontCss}; font-size:19px; color:${colors.kingdom}; line-height:1.95;">${escapeHtml(cfg.header.line1.trim())}</div>`
            : ''
        }
        ${
          cfg.header.line2.trim()
            ? `<div style="font-family:${bodyFontCss}; font-size:13.5px; font-weight:700; color:#334155; letter-spacing:1.4px; margin-top:2px;">${escapeHtml(cfg.header.line2.trim())}</div>`
            : ''
        }
        <div style="margin:10px auto 6px; display:flex; justify-content:center;">${dividerSvg}</div>
      </div>
    `
    : '';

  const candidateCoverBlock = cfg.header.showCandidateBox
    ? `
      <div style="margin-top:24px; padding:14px 20px; border:1.5px solid ${colors.divider}; border-radius:10px; background:#ffffff; font-family:${bodyFontCss}; font-size:12.5px; color:#1e293b; text-align:left; line-height:2.1;">
        <div style="display:flex; justify-content:space-between; gap:16px;">
          <span style="flex:1;"><strong>ឈ្មោះបេក្ខជន៖</strong> ..................................................</span>
          <span><strong>លេខតុ / បន្ទប់៖</strong> ........................</span>
        </div>
        <div style="display:flex; justify-content:space-between; gap:16px; margin-top:4px;">
          <span style="flex:1;"><strong>កាលបរិច្ឆេទ៖</strong> ..................................................</span>
          <span><strong>ពិន្ទុសរុប៖</strong> .............................</span>
        </div>
      </div>
    `
    : '';

  const footerNote =
    cfg.footer.rightText.trim() || 'ឯកសារជំនួយការសិក្សា និងត្រៀមប្រឡងផ្លូវការ';
  const footerBrand =
    cfg.footer.leftText.trim() || 'Master Quiz KH · ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ';

  return `
    <div style="position:relative; width:100%; height:100%; box-sizing:border-box; padding:54px 58px; display:flex; flex-direction:column; justify-content:space-between; background:${colors.pageBg}; overflow:hidden;">
      <!-- Double Regal Khmer Frame -->
      <div style="position:absolute; inset:18px; border:2.5px solid ${colors.accent}; border-radius:10px; pointer-events:none;"></div>
      <div style="position:absolute; inset:25px; border:1px solid ${colors.divider}; border-radius:7px; pointer-events:none;"></div>

      <!-- 4 Traditional Khmer Kbach Corner Ornaments -->
      <div style="position:absolute; top:14px; left:14px; pointer-events:none;">${cornerSvg}</div>
      <div style="position:absolute; top:14px; right:14px; transform:rotate(90deg); pointer-events:none;">${cornerSvg}</div>
      <div style="position:absolute; bottom:14px; right:14px; transform:rotate(180deg); pointer-events:none;">${cornerSvg}</div>
      <div style="position:absolute; bottom:14px; left:14px; transform:rotate(270deg); pointer-events:none;">${cornerSvg}</div>

      <!-- Top National Motto & Institution -->
      <div style="position:relative; z-index:1; text-align:center; padding-top:8px;">
        ${mottoBlock}
        <div style="font-family:${bodyFontCss}; font-size:13.5px; font-weight:700; color:${colors.accent}; margin-top:6px;">
          ${escapeHtml(orgText)}
        </div>
      </div>

      <!-- Center Hero Cartouche -->
      <div style="position:relative; z-index:1; text-align:center; margin:auto 0;">
        <div style="padding:32px 28px; border-radius:16px; border:2px solid ${colors.accent}; background:${colors.answerBg}; box-shadow:inset 0 0 0 4px ${colors.pageBg}, inset 0 0 0 5px ${colors.divider};">
          <div style="display:flex; justify-content:center; margin-bottom:12px;">
            ${crestSvg}
          </div>

          <div style="font-family:${bodyFontCss}; font-size:14px; font-weight:700; color:${colors.accent}; letter-spacing:0.4px; margin-bottom:8px;">
            ${escapeHtml(docCategory)}
          </div>

          <div style="font-family:${titleFontCss}; font-size:24px; color:${colors.heading}; line-height:1.95; padding:4px 8px;">
            ${escapeHtml(subjectTitle)}
          </div>

          <div style="margin:14px auto; display:flex; justify-content:center;">
            ${dividerSvg}
          </div>

          <!-- Summary Metadata Cards -->
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:16px; font-family:${bodyFontCss};">
            <div style="background:#ffffff; border:1px solid ${colors.divider}; border-radius:10px; padding:10px 8px;">
              <div style="font-size:10.5px; color:#64748b; font-weight:600;">ចំនួនសំណួរ</div>
              <div style="font-size:13.5px; color:${colors.accent}; font-weight:700; margin-top:2px;">
                ${toKhmerNum(questions.length)} សំណួរ
              </div>
            </div>
            <div style="background:#ffffff; border:1px solid ${colors.divider}; border-radius:10px; padding:10px 8px;">
              <div style="font-size:10.5px; color:#64748b; font-weight:600;">ប្រភេទវិញ្ញាសា</div>
              <div style="font-size:12px; color:${colors.heading}; font-weight:700; margin-top:3px;">
                ${escapeHtml(typeSummary)}
              </div>
            </div>
            <div style="background:#ffffff; border:1px solid ${colors.divider}; border-radius:10px; padding:10px 8px;">
              <div style="font-size:10.5px; color:#64748b; font-weight:600;">ទម្រង់ចម្លើយ</div>
              <div style="font-size:11.5px; color:${colors.correctText}; font-weight:700; margin-top:3px;">
                ${escapeHtml(answerSummary)}
              </div>
            </div>
          </div>

          ${candidateCoverBlock}
        </div>
      </div>

      <!-- Bottom Seal & Attribution -->
      <div style="position:relative; z-index:1; text-align:center; padding-bottom:6px;">
        <div style="margin:0 auto 10px; display:flex; justify-content:center;">${dividerSvg}</div>
        <div style="font-family:${bodyFontCss}; font-size:12px; font-weight:700; color:${colors.heading};">
          ${escapeHtml(footerNote)}
        </div>
        <div style="font-family:${bodyFontCss}; font-size:11px; color:#64748b; margin-top:4px;">
          ${escapeHtml(footerBrand)}
        </div>
      </div>
    </div>
  `;
}

function buildCompactExamStartHeaderHtml(
  subjectTitle: string,
  totalCount: number,
  colors: PdfTemplateMeta,
  cfg: PdfExportSettings
): string {
  if (!cfg.header.showHeader) {
    return '';
  }
  const bodyFontCss = getFontCss(cfg.bodyFont);
  const titleFontCss = cfg.titleFont === 'Moul' ? "'Moul', serif" : bodyFontCss;
  const docTitle = cfg.header.documentTitle.trim()
    ? `${cfg.header.documentTitle.trim()}៖ ${subjectTitle}`
    : subjectTitle;

  let html = `<div style="text-align:center; padding-bottom:12px; border-bottom:2px solid ${colors.accent};">`;
  html += `
    <div style="font-family:${titleFontCss}; font-size:15px; color:${colors.heading}; line-height:1.8;">
      ${escapeHtml(docTitle)}
    </div>
    <div style="font-family:${bodyFontCss}; font-size:11px; color:#475569; margin-top:2px;">
      ${escapeHtml(cfg.header.organization.trim() || 'Master Quiz KH')} · សរុប ${toKhmerNum(totalCount)} សំណួរ
    </div>
  `;
  if (cfg.header.showCandidateBox) {
    html += `
      <div style="margin-top:10px; padding:7px 12px; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc; display:flex; justify-content:space-between; gap:12px; font-family:${bodyFontCss}; font-size:11px; color:#1e293b; text-align:left;">
        <span>ឈ្មោះបេក្ខជន៖ ........................................</span>
        <span>កាលបរិច្ឆេទ៖ .........................</span>
        <span>ពិន្ទុ៖ ...........</span>
      </div>
    `;
  }
  html += `</div><div style="height:14px;"></div>`;
  return html;
}

function buildHeaderHtml(
  subjectTitle: string,
  totalCount: number,
  colors: PdfTemplateMeta,
  cfg: PdfExportSettings
): string {
  if (!cfg.header.showHeader) {
    return '';
  }

  const bodyFontCss = getFontCss(cfg.bodyFont);
  const titleFontCss =
    cfg.titleFont === 'Moul' ? "'Moul', serif" : bodyFontCss;
  const docTitle = cfg.header.documentTitle.trim()
    ? `${cfg.header.documentTitle.trim()}៖ ${subjectTitle}`
    : subjectTitle;

  let html = `<div style="text-align:center; padding-bottom:14px; border-bottom:2px solid ${colors.accent};">`;

  if (cfg.header.showNationalMotto) {
    if (cfg.header.line1.trim()) {
      html += `
        <div style="font-family:${titleFontCss}; font-size:15px; color:${colors.kingdom}; line-height:1.8;">
          ${escapeHtml(cfg.header.line1.trim())}
        </div>
      `;
    }
    if (cfg.header.line2.trim()) {
      html += `
        <div style="font-family:${bodyFontCss}; font-size:12px; font-weight:700; color:#334155; letter-spacing:1px; margin-top:2px;">
          ${escapeHtml(cfg.header.line2.trim())}
        </div>
      `;
    }
    html += `<div style="width:96px; height:2px; background:${colors.divider}; margin:8px auto;"></div>`;
  }

  html += `
    <div style="font-family:${titleFontCss}; font-size:16px; color:${colors.heading}; line-height:1.75; margin-top:4px;">
      ${escapeHtml(docTitle)}
    </div>
  `;

  if (cfg.header.organization.trim()) {
    html += `
      <div style="font-family:${bodyFontCss}; font-size:11px; color:#475569; margin-top:4px;">
        ${escapeHtml(cfg.header.organization.trim())} · សរុប ${toKhmerNum(totalCount)} សំណួរ
      </div>
    `;
  }

  if (cfg.header.showCandidateBox) {
    html += `
      <div style="margin-top:12px; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc; display:flex; justify-content:space-between; gap:12px; font-family:${bodyFontCss}; font-size:11px; color:#1e293b; text-align:left;">
        <span>ឈ្មោះបេក្ខជន៖ ........................................</span>
        <span>កាលបរិច្ឆេទ៖ .........................</span>
        <span>ពិន្ទុ៖ ...........</span>
      </div>
    `;
  }

  html += `</div><div style="height:16px;"></div>`;
  return html;
}

function buildRunningHeaderHtml(
  runningHeaderTitle: string,
  organization: string,
  bodyFontCss: string
): string {
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid #cbd5e1; font-family:${bodyFontCss}; font-size:11px; color:#475569;">
      <span><strong>${escapeHtml(runningHeaderTitle)}</strong></span>
      <span>${escapeHtml(organization || 'Master Quiz KH')}</span>
    </div>
    <div style="height:14px;"></div>
  `;
}

function buildFooterHtml(
  cfg: PdfExportSettings,
  bodyFontCss: string,
  pageNumber: number,
  totalPages: number
): string {
  if (!cfg.footer.showFooter) return '';
  const rightParts: string[] = [];
  if (cfg.footer.rightText.trim()) {
    rightParts.push(escapeHtml(cfg.footer.rightText.trim()));
  }
  if (cfg.footer.showPageNumbers) {
    rightParts.push(`ទំព័រទី ${toKhmerNum(pageNumber)} / ${toKhmerNum(totalPages)}`);
  }
  return `
    <div style="flex-shrink:0; padding-top:8px; margin-top:12px; border-top:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center; gap:12px; font-family:${bodyFontCss}; font-size:10px; color:#64748b; line-height:1.5;">
      <span>${escapeHtml(cfg.footer.leftText.trim())}</span>
      <span>${rightParts.join(' · ')}</span>
    </div>
  `;
}

function buildQuestionHtml(
  q: Question,
  index: number,
  showInlineAnswers: boolean,
  colors: PdfTemplateMeta,
  cfg: PdfExportSettings
): string {
  const numKh = toKhmerNum(index + 1);
  const bodyFontCss = getFontCss(cfg.bodyFont);
  const sizeSpec = PDF_FONT_SIZES[cfg.fontSize] || PDF_FONT_SIZES.medium;

  let html = `
    <div style="padding-top:2px; padding-bottom:${sizeSpec.spacingPx + 8}px; border-bottom:1px dashed #e2e8f0; font-family:${bodyFontCss};">
      <div style="font-size:${sizeSpec.qPx}px; font-weight:700; color:#0f172a; line-height:1.75; margin-bottom:6px;">
        <span style="color:${colors.accent};">${numKh}.</span> ${escapeHtml(q.question)}
      </div>
  `;

  if (q.type === 'mcq' && q.options && q.options.length > 0) {
    html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; padding-left:16px; margin-top:4px;">`;
    q.options.forEach((opt, oIdx) => {
      const cleanOpt = opt.replace(/^[ក-ឃA-D]\.\s*/, '');
      const label = getOptionLabel(oIdx, q.subject);
      const isCorrect = showInlineAnswers && oIdx === q.correct;
      html += `
        <div style="font-size:${sizeSpec.optPx}px; line-height:1.65; padding:4px 8px; border-radius:6px; ${
          isCorrect
            ? `background:${colors.correctBg}; color:${colors.correctText}; border:1px solid ${colors.correctBorder}; font-weight:700;`
            : `color:#1e293b; border:1px solid transparent;`
        }">
          <span>${escapeHtml(label)}. ${escapeHtml(cleanOpt)}</span>
        </div>
      `;
    });
    html += `</div>`;
  }

  if (showInlineAnswers && q.answer) {
    html += `
      <div style="margin-top:8px; margin-left:16px; padding:8px 12px; border-radius:8px; background:${colors.answerBg}; border:1px solid ${colors.answerBorder}; font-family:${bodyFontCss}; font-size:${sizeSpec.ansPx}px; line-height:1.75; color:${colors.answerText}; white-space:pre-line;">
        ${escapeHtml(q.answer)}
      </div>
    `;
  }

  html += `</div><div style="height:6px;"></div>`;
  return html;
}

function getCorrectMcqInfo(q: Question): { label: string; text: string } | null {
  if (q.type !== 'mcq' || !q.options || q.options.length === 0) return null;
  const idx = typeof q.correct === 'number' && q.correct >= 0 && q.correct < q.options.length ? q.correct : 0;
  const label = getOptionLabel(idx, q.subject);
  const text = (q.options[idx] || '').replace(/^[ក-ឃA-D]\.\s*/, '');
  return { label, text };
}

function buildAnswerKeyBannerHtml(
  subjectTitle: string,
  totalCount: number,
  colors: PdfTemplateMeta,
  cfg: PdfExportSettings
): string {
  const bodyFontCss = getFontCss(cfg.bodyFont);
  const titleFontCss = cfg.titleFont === 'Moul' ? "'Moul', serif" : bodyFontCss;
  return `
    <div style="text-align:center; padding:10px 14px; border-radius:10px; background:${colors.answerBg}; border:1.5px solid ${colors.accent};">
      <div style="font-family:${titleFontCss}; font-size:15px; color:${colors.accent}; line-height:1.8;">
        តារាងផ្ទៀងផ្ទាត់ចម្លើយផ្លូវការ
      </div>
      <div style="font-family:${bodyFontCss}; font-size:11.5px; color:#334155; margin-top:2px;">
        វិញ្ញាសា៖ <strong>${escapeHtml(subjectTitle)}</strong> · សរុប ${toKhmerNum(totalCount)} សំណួរ
      </div>
    </div>
    <div style="height:14px;"></div>
  `;
}

function buildQuickGridSectionLabelHtml(colors: PdfTemplateMeta, bodyFontCss: string): string {
  return `
    <div style="font-family:${bodyFontCss}; font-size:12px; font-weight:700; color:${colors.heading}; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
      <span style="display:inline-block; width:8px; height:8px; border-radius:2px; background:${colors.accent};"></span>
      <span>តារាងចម្លើយរហ័ស (ពហុជ្រើសរើស)</span>
    </div>
  `;
}

function buildQuickGridRowHtml(
  cells: Array<{ num: number; label: string } | null>,
  colors: PdfTemplateMeta,
  bodyFontCss: string,
  fontPx: number
): string {
  let tds = '';
  for (let c = 0; c < 5; c++) {
    const cell = cells[c] || null;
    if (cell) {
      tds += `
        <td style="border:1px solid #cbd5e1; padding:6px 6px; text-align:center; background:#ffffff; font-family:${bodyFontCss}; font-size:${fontPx}px; vertical-align:middle;">
          <span style="font-weight:700; color:#334155;">${toKhmerNum(cell.num)}.</span>
          <span style="display:inline-block; margin-left:4px; padding:1px 8px; border-radius:4px; background:${colors.correctBg}; color:${colors.correctText}; border:1px solid ${colors.correctBorder}; font-weight:700;">
            ${escapeHtml(cell.label)}
          </span>
        </td>
      `;
    } else {
      tds += `<td style="border:1px solid #e2e8f0; padding:6px 6px; background:#f8fafc;"></td>`;
    }
  }
  return `<tr>${tds}</tr>`;
}

function wrapQuickGridTable(rowsHtml: string): string {
  return `
    <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
      <tbody>${rowsHtml}</tbody>
    </table>
    <div style="height:14px;"></div>
  `;
}

function buildDetailSectionLabelHtml(
  colors: PdfTemplateMeta,
  bodyFontCss: string,
  hasQuickGrid: boolean,
  isContinuation: boolean
): string {
  const title = isContinuation
    ? 'តារាងផ្ទៀងផ្ទាត់ចម្លើយលម្អិត (ត)'
    : hasQuickGrid
      ? 'តារាងផ្ទៀងផ្ទាត់ចម្លើយលម្អិត និងការបកស្រាយ'
      : 'តារាងផ្ទៀងផ្ទាត់ចម្លើយលម្អិត';
  return `
    <div style="font-family:${bodyFontCss}; font-size:12px; font-weight:700; color:${colors.heading}; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
      <span style="display:inline-block; width:8px; height:8px; border-radius:2px; background:${colors.accent};"></span>
      <span>${title}</span>
    </div>
  `;
}

function buildDetailTableHeadHtml(colors: PdfTemplateMeta, bodyFontCss: string, fontPx: number): string {
  return `
    <thead>
      <tr style="background:${colors.accent}; color:#ffffff; font-family:${bodyFontCss}; font-size:${fontPx}px;">
        <th style="border:1px solid ${colors.accent}; padding:7px 6px; text-align:center; font-weight:700;">ល.រ</th>
        <th style="border:1px solid ${colors.accent}; padding:7px 10px; text-align:left; font-weight:700;">សំណួរ</th>
        <th style="border:1px solid ${colors.accent}; padding:7px 10px; text-align:left; font-weight:700;">ចម្លើយត្រឹមត្រូវ / ការបកស្រាយ</th>
      </tr>
    </thead>
  `;
}

function buildDetailRowHtml(
  q: Question,
  index: number,
  colors: PdfTemplateMeta,
  bodyFontCss: string,
  fontPx: number
): string {
  const bg = index % 2 === 1 ? '#f8fafc' : '#ffffff';
  const mcqInfo = getCorrectMcqInfo(q);

  let answerCellHtml = '';
  if (mcqInfo) {
    answerCellHtml += `
      <div style="font-weight:700; color:${colors.correctText}; line-height:1.55;">
        <span style="display:inline-block; padding:0px 6px; border-radius:4px; background:${colors.correctBg}; border:1px solid ${colors.correctBorder}; margin-right:4px;">
          ${escapeHtml(mcqInfo.label)}
        </span>
        ${escapeHtml(mcqInfo.text)}
      </div>
    `;
    if (q.answer && q.answer.trim()) {
      answerCellHtml += `
        <div style="margin-top:4px; color:#334155; font-size:${Math.max(9.5, fontPx - 0.5)}px; line-height:1.55; white-space:pre-line;">
          ${escapeHtml(q.answer.trim())}
        </div>
      `;
    }
  } else {
    answerCellHtml += `
      <div style="color:${colors.answerText}; font-weight:600; line-height:1.6; white-space:pre-line;">
        ${escapeHtml((q.answer || '—').trim())}
      </div>
    `;
  }

  return `
    <tr style="background:${bg}; font-family:${bodyFontCss}; font-size:${fontPx}px;">
      <td style="border:1px solid #cbd5e1; padding:6px 6px; text-align:center; font-weight:700; color:${colors.accent}; vertical-align:top; line-height:1.55;">
        ${toKhmerNum(index + 1)}
      </td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:left; color:#0f172a; vertical-align:top; line-height:1.55;">
        ${escapeHtml(q.question)}
      </td>
      <td style="border:1px solid #cbd5e1; padding:6px 10px; text-align:left; vertical-align:top;">
        ${answerCellHtml}
      </td>
    </tr>
  `;
}

function wrapDetailTable(headHtml: string, rowsHtml: string): string {
  return `
    <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
      <colgroup>
        <col style="width:52px;" />
        <col style="width:42%;" />
        <col />
      </colgroup>
      ${headHtml}
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

interface AnswerPageSpec {
  showBanner: boolean;
  showQuickLabel: boolean;
  quickRows: string[];
  showDetailLabel: boolean;
  isDetailContinuation: boolean;
  detailRows: string[];
}

/**
 * Generates and downloads a multi-page A4 PDF with selectable Khmer fonts,
 * multiple visual templates, customizable Header & Footer, optional Answer Key
 * Table on the final page(s), and strict collision-free page breaks.
 */
export async function exportQuestionsToPDF(options: ExportPdfOptions): Promise<void> {
  const { subjectTitle, questions, filename, onProgress } = options;

  if (!questions || questions.length === 0) {
    throw new Error('មិនមានសំណួរសម្រាប់ទាញយកជា PDF ទេ!');
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const cfg = resolveSettings(options);
  const answerMode = cfg.answerMode || 'last_page_table';
  const showInlineAnswers = answerMode === 'inline' || answerMode === 'both';
  const showLastPageTable = answerMode === 'last_page_table' || answerMode === 'both';

  const colors = PDF_TEMPLATES.find((t) => t.id === cfg.template) || PDF_TEMPLATES[0];
  const bodyFontCss = getFontCss(cfg.bodyFont);
  const sizeSpec = PDF_FONT_SIZES[cfg.fontSize] || PDF_FONT_SIZES.medium;
  const tableFontPx = Math.max(10, sizeSpec.optPx - 0.5);

  // A4 dimensions in px at 96dpi: 794 x 1123
  const PAGE_WIDTH = 794;
  const PAGE_HEIGHT = 1123;
  const PADDING_X = cfg.pageBorder === 'none' ? 44 : 52;
  const PADDING_TOP = cfg.pageBorder === 'none' ? 40 : 48;
  const PADDING_BOTTOM = cfg.pageBorder === 'none' ? 28 : 34;
  const CONTENT_WIDTH = PAGE_WIDTH - PADDING_X * 2;
  const SAFETY_BUFFER = 16;

  const runningHeaderTitle =
    cfg.header.runningHeader.trim() ||
    (cfg.header.documentTitle.trim()
      ? `${cfg.header.documentTitle.trim()}៖ ${subjectTitle}`
      : subjectTitle);

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${PAGE_WIDTH}px`;
  host.style.background = colors.pageBg;
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  try {
    // 1. Measure exact rendered heights in non-collapsing flex container
    const measureBox = document.createElement('div');
    measureBox.style.width = `${CONTENT_WIDTH}px`;
    measureBox.style.display = 'flex';
    measureBox.style.flexDirection = 'column';
    measureBox.style.background = colors.pageBg;
    measureBox.style.color = '#0f172a';

    const useCoverPage = cfg.includeCoverPage !== false;
    const headerEl = document.createElement('div');
    headerEl.innerHTML = useCoverPage
      ? buildCompactExamStartHeaderHtml(subjectTitle, questions.length, colors, cfg)
      : buildHeaderHtml(subjectTitle, questions.length, colors, cfg);
    measureBox.appendChild(headerEl);

    const runningHeaderEl = document.createElement('div');
    if (cfg.header.showHeader) {
      runningHeaderEl.innerHTML = buildRunningHeaderHtml(
        runningHeaderTitle,
        cfg.header.organization.trim(),
        bodyFontCss
      );
    }
    measureBox.appendChild(runningHeaderEl);

    const footerMeasureEl = document.createElement('div');
    footerMeasureEl.innerHTML = buildFooterHtml(cfg, bodyFontCss, 99, 99);
    measureBox.appendChild(footerMeasureEl);

    const questionEls: HTMLDivElement[] = questions.map((q, idx) => {
      const itemEl = document.createElement('div');
      itemEl.innerHTML = buildQuestionHtml(q, idx, showInlineAnswers, colors, cfg);
      measureBox.appendChild(itemEl);
      return itemEl;
    });

    // Prepare Answer Key Table measurement elements when enabled
    const mcqCells: Array<{ num: number; label: string }> = [];
    questions.forEach((q, idx) => {
      const info = getCorrectMcqInfo(q);
      if (info) {
        mcqCells.push({ num: idx + 1, label: info.label });
      }
    });

    const quickRowStrings: string[] = [];
    for (let i = 0; i < mcqCells.length; i += 5) {
      const slice = mcqCells.slice(i, i + 5);
      quickRowStrings.push(buildQuickGridRowHtml(slice, colors, bodyFontCss, tableFontPx));
    }

    const detailRowStrings: string[] = questions.map((q, idx) =>
      buildDetailRowHtml(q, idx, colors, bodyFontCss, tableFontPx)
    );

    const detailHeadHtml = buildDetailTableHeadHtml(colors, bodyFontCss, tableFontPx);

    const answerBannerMeasureEl = document.createElement('div');
    const quickLabelMeasureEl = document.createElement('div');
    const detailLabelMeasureEl = document.createElement('div');
    const detailHeadMeasureEl = document.createElement('div');
    const quickRowMeasureEls: HTMLDivElement[] = [];
    const detailRowMeasureEls: HTMLDivElement[] = [];

    if (showLastPageTable) {
      answerBannerMeasureEl.innerHTML = buildAnswerKeyBannerHtml(
        subjectTitle,
        questions.length,
        colors,
        cfg
      );
      measureBox.appendChild(answerBannerMeasureEl);

      if (quickRowStrings.length > 0) {
        quickLabelMeasureEl.innerHTML = buildQuickGridSectionLabelHtml(colors, bodyFontCss);
        measureBox.appendChild(quickLabelMeasureEl);

        quickRowStrings.forEach((rowHtml) => {
          const el = document.createElement('div');
          el.innerHTML = `<table style="width:100%; border-collapse:collapse; table-layout:fixed;"><tbody>${rowHtml}</tbody></table>`;
          measureBox.appendChild(el);
          quickRowMeasureEls.push(el);
        });
      }

      if (detailRowStrings.length > 0) {
        detailLabelMeasureEl.innerHTML = buildDetailSectionLabelHtml(
          colors,
          bodyFontCss,
          quickRowStrings.length > 0,
          false
        );
        measureBox.appendChild(detailLabelMeasureEl);

        detailHeadMeasureEl.innerHTML = wrapDetailTable(detailHeadHtml, '');
        measureBox.appendChild(detailHeadMeasureEl);

        detailRowStrings.forEach((rowHtml) => {
          const el = document.createElement('div');
          el.innerHTML = wrapDetailTable('', rowHtml);
          measureBox.appendChild(el);
          detailRowMeasureEls.push(el);
        });
      }
    }

    host.appendChild(measureBox);

    const headerHeight = headerEl.getBoundingClientRect().height;
    const runningHeaderHeight = runningHeaderEl.getBoundingClientRect().height;
    const footerHeight = cfg.footer.showFooter
      ? footerMeasureEl.getBoundingClientRect().height + 12 // include margin-top:12px
      : 0;
    const itemHeights = questionEls.map((el) => el.getBoundingClientRect().height);

    const usableHeight = PAGE_HEIGHT - PADDING_TOP - PADDING_BOTTOM - footerHeight - SAFETY_BUFFER;
    const maxPage1BodyHeight = usableHeight - headerHeight;
    const maxContinuationBodyHeight = usableHeight - runningHeaderHeight;

    // 2. Group question indices strictly inside usable body height (zero Footer overlap)
    const questionPages: number[][] = [];
    let currentPage: number[] = [];
    let currentQuestionsHeight = 0;

    for (let i = 0; i < questions.length; i++) {
      const h = itemHeights[i];
      const maxForThisPage =
        questionPages.length === 0 ? maxPage1BodyHeight : maxContinuationBodyHeight;

      if (currentPage.length > 0 && currentQuestionsHeight + h > maxForThisPage) {
        questionPages.push(currentPage);
        currentPage = [i];
        currentQuestionsHeight = h;
      } else {
        currentPage.push(i);
        currentQuestionsHeight += h;
      }
    }
    if (currentPage.length > 0) {
      questionPages.push(currentPage);
    }

    // 3. Paginate Answer Key Table onto dedicated trailing page(s)
    const answerPages: AnswerPageSpec[] = [];
    if (showLastPageTable && (quickRowStrings.length > 0 || detailRowStrings.length > 0)) {
      const bannerH = answerBannerMeasureEl.getBoundingClientRect().height;
      const quickLabelH =
        quickRowStrings.length > 0 ? quickLabelMeasureEl.getBoundingClientRect().height : 0;
      const quickRowHs = quickRowMeasureEls.map((el) => el.getBoundingClientRect().height);
      const detailLabelH =
        detailRowStrings.length > 0 ? detailLabelMeasureEl.getBoundingClientRect().height : 0;
      const detailHeadH =
        detailRowStrings.length > 0 ? detailHeadMeasureEl.getBoundingClientRect().height : 0;
      const detailRowHs = detailRowMeasureEls.map((el) => el.getBoundingClientRect().height);

      let curAnsPage: AnswerPageSpec = {
        showBanner: true,
        showQuickLabel: false,
        quickRows: [],
        showDetailLabel: false,
        isDetailContinuation: false,
        detailRows: [],
      };
      let usedH = bannerH;

      // Section 1: 5-Column MCQ Quick-Check Grid
      if (quickRowStrings.length > 0) {
        curAnsPage.showQuickLabel = true;
        usedH += quickLabelH + 14; // +14px spacing below quick table

        for (let r = 0; r < quickRowStrings.length; r++) {
          const rh = quickRowHs[r];
          if (curAnsPage.quickRows.length > 0 && usedH + rh > maxContinuationBodyHeight) {
            answerPages.push(curAnsPage);
            curAnsPage = {
              showBanner: false,
              showQuickLabel: true,
              quickRows: [quickRowStrings[r]],
              showDetailLabel: false,
              isDetailContinuation: false,
              detailRows: [],
            };
            usedH = quickLabelH + 14 + rh;
          } else {
            curAnsPage.quickRows.push(quickRowStrings[r]);
            usedH += rh;
          }
        }
      }

      // Section 2: Detailed Answer Table
      if (detailRowStrings.length > 0) {
        const firstDetailMinH = detailLabelH + detailHeadH + detailRowHs[0];
        if (
          (curAnsPage.quickRows.length > 0 || curAnsPage.showBanner) &&
          usedH + firstDetailMinH > maxContinuationBodyHeight &&
          curAnsPage.quickRows.length > 0
        ) {
          answerPages.push(curAnsPage);
          curAnsPage = {
            showBanner: false,
            showQuickLabel: false,
            quickRows: [],
            showDetailLabel: true,
            isDetailContinuation: false,
            detailRows: [],
          };
          usedH = detailLabelH + detailHeadH;
        } else {
          curAnsPage.showDetailLabel = true;
          usedH += detailLabelH + detailHeadH;
        }

        for (let r = 0; r < detailRowStrings.length; r++) {
          const rh = detailRowHs[r];
          if (curAnsPage.detailRows.length > 0 && usedH + rh > maxContinuationBodyHeight) {
            answerPages.push(curAnsPage);
            curAnsPage = {
              showBanner: false,
              showQuickLabel: false,
              quickRows: [],
              showDetailLabel: true,
              isDetailContinuation: true,
              detailRows: [detailRowStrings[r]],
            };
            usedH = detailLabelH + detailHeadH + rh;
          } else {
            curAnsPage.detailRows.push(detailRowStrings[r]);
            usedH += rh;
          }
        }
      }

      answerPages.push(curAnsPage);
    }

    host.removeChild(measureBox);

    // 4. Render each A4 page cleanly and add to jsPDF
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    });

    const coverOffset = useCoverPage ? 1 : 0;
    const totalPages = coverOffset + questionPages.length + answerPages.length;

    const createFrameHtml = () => {
      if (cfg.pageBorder === 'single') {
        return `<div style="position:absolute; inset:18px; border:1.5px solid ${colors.accent}; border-radius:6px; pointer-events:none; z-index:0;"></div>`;
      }
      if (cfg.pageBorder === 'double') {
        return `<div style="position:absolute; inset:16px; border:4px double ${colors.divider}; border-radius:6px; pointer-events:none; z-index:0;"></div>`;
      }
      return '';
    };

    const renderPageCanvasAndAppend = async (
      innerHtml: string,
      pageNumber: number
    ) => {
      if (onProgress) onProgress(pageNumber, totalPages);

      const pageEl = document.createElement('div');
      pageEl.style.width = `${PAGE_WIDTH}px`;
      pageEl.style.height = `${PAGE_HEIGHT}px`;
      pageEl.style.boxSizing = 'border-box';
      pageEl.style.padding = `${PADDING_TOP}px ${PADDING_X}px ${PADDING_BOTTOM}px ${PADDING_X}px`;
      pageEl.style.background = colors.pageBg;
      pageEl.style.color = '#0f172a';
      pageEl.style.position = 'relative';
      pageEl.style.display = 'flex';
      pageEl.style.flexDirection = 'column';
      pageEl.style.justifyContent = 'space-between';
      pageEl.style.overflow = 'hidden';

      const footerHtml = buildFooterHtml(cfg, bodyFontCss, pageNumber, totalPages);

      pageEl.innerHTML = `
        ${createFrameHtml()}
        <div style="flex:1; min-height:0; overflow:hidden; position:relative; z-index:1; display:flex; flex-direction:column;">
          ${innerHtml}
        </div>
        <div style="position:relative; z-index:1; flex-shrink:0;">
          ${footerHtml}
        </div>
      `;

      host.appendChild(pageEl);

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        backgroundColor: colors.pageBg,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (pageNumber > 1) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      host.removeChild(pageEl);
    };

    // Render Cover Page as Page 1 when enabled
    if (useCoverPage) {
      if (onProgress) onProgress(1, totalPages);
      const coverEl = document.createElement('div');
      coverEl.style.width = `${PAGE_WIDTH}px`;
      coverEl.style.height = `${PAGE_HEIGHT}px`;
      coverEl.style.boxSizing = 'border-box';
      coverEl.style.background = colors.pageBg;
      coverEl.style.color = '#0f172a';
      coverEl.style.overflow = 'hidden';
      coverEl.innerHTML = buildCoverPageHtml(
        subjectTitle,
        questions,
        colors,
        cfg,
        answerMode
      );

      host.appendChild(coverEl);

      const coverCanvas = await html2canvas(coverEl, {
        scale: 2,
        backgroundColor: colors.pageBg,
        useCORS: true,
        logging: false,
      });
      const coverImgData = coverCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(coverImgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      host.removeChild(coverEl);
    }

    // Render question pages
    for (let pIdx = 0; pIdx < questionPages.length; pIdx++) {
      let inner = '';
      if (pIdx === 0) {
        inner += useCoverPage
          ? buildCompactExamStartHeaderHtml(subjectTitle, questions.length, colors, cfg)
          : buildHeaderHtml(subjectTitle, questions.length, colors, cfg);
      } else if (cfg.header.showHeader) {
        inner += buildRunningHeaderHtml(
          runningHeaderTitle,
          cfg.header.organization.trim(),
          bodyFontCss
        );
      }

      for (const qIdx of questionPages[pIdx]) {
        inner += buildQuestionHtml(questions[qIdx], qIdx, showInlineAnswers, colors, cfg);
      }

      await renderPageCanvasAndAppend(inner, coverOffset + pIdx + 1);
    }

    // Render trailing Answer Key Table pages
    for (let aIdx = 0; aIdx < answerPages.length; aIdx++) {
      const spec = answerPages[aIdx];
      let inner = '';

      if (cfg.header.showHeader) {
        inner += buildRunningHeaderHtml(
          `${runningHeaderTitle} · តារាងចម្លើយ`,
          cfg.header.organization.trim(),
          bodyFontCss
        );
      }

      if (spec.showBanner) {
        inner += buildAnswerKeyBannerHtml(subjectTitle, questions.length, colors, cfg);
      }

      if (spec.showQuickLabel && spec.quickRows.length > 0) {
        inner += buildQuickGridSectionLabelHtml(colors, bodyFontCss);
        inner += wrapQuickGridTable(spec.quickRows.join(''));
      }

      if (spec.showDetailLabel && spec.detailRows.length > 0) {
        inner += buildDetailSectionLabelHtml(
          colors,
          bodyFontCss,
          quickRowStrings.length > 0,
          spec.isDetailContinuation
        );
        inner += wrapDetailTable(detailHeadHtml, spec.detailRows.join(''));
      }

      await renderPageCanvasAndAppend(inner, coverOffset + questionPages.length + aIdx + 1);
    }

    const safeBase = (filename || `${subjectTitle}_MasterQuiz`)
      .replace(/[\\/:*?"<>|]+/g, '_')
      .trim();
    const finalName = safeBase.toLowerCase().endsWith('.pdf') ? safeBase : `${safeBase}.pdf`;

    pdf.save(finalName);
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}
