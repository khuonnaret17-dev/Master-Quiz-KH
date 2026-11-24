import { BotActionButton, BotCommandConfig } from '../types';

export type { BotActionButton, BotCommandConfig };

export interface BotCommandMeta {
  command: string;
  titleKh: string;
  descriptionKh: string;
}

export interface BotCommandReply {
  command: string;
  title: string;
  lines: string[];
  imageUrl?: string;
  imageAlt?: string;
  actions: BotActionButton[];
}

export const TELEGRAM_BOT_LINK = 'https://t.me/qiuzs_bot';
export const ADMIN_TELEGRAM_LINK = 'https://t.me/qcm_and_q_a';
export const TELEGRAM_GROUP_LINK = 'https://t.me/qcm_and_q_a';
export const PAYWAY_PAYMENT_LINK = 'https://link.payway.com.kh/ABAPAYox450999g';
export const KHQR_IMAGE_PATH = '/assets/aistudio/image_13971c05.png';

export const DEFAULT_BOT_COMMANDS: BotCommandConfig[] = [
  {
    command: '/start',
    titleKh: 'ចាប់ផ្ដើម',
    descriptionKh: 'សារស្វាគមន៍ និងមឺនុយណែនាំប្រើប្រាស់កម្មវិធី',
    title: '🙏 សូមស្វាគមន៍មកកាន់ Master Quiz KH Command Bot!',
    body: [
      'ខ្ញុំជាជំនួយការស្វ័យប្រវត្តិសម្រាប់ណែនាំការចុះឈ្មោះ និងការប្រើប្រាស់កម្មវិធីត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋកម្ពុជា។',
      '',
      'សូមជ្រើសរើស ឬវាយ Command ខាងក្រោម៖',
      '• /register — ណែនាំជំហានចុះឈ្មោះប្រើប្រាស់កម្មវិធី',
      '• /passcode — របៀបស្នើសុំលេខសម្ងាត់ពី Admin',
      '• /payment — ការបង់ប្រាក់ KHQR ប្រើប្រាស់ពេញមួយជីវិត',
      '• /contact — ទំនាក់ទំនង Admin (@qcm_and_q_a)',
      '• /help — មើលបញ្ជី Command ទាំងអស់',
    ].join('\n'),
    actions: [
      { label: '📝 ណែនាំចុះឈ្មោះ (/register)', type: 'command', value: '/register' },
      { label: '🔐 ស្នើសុំលេខសម្ងាត់ (/passcode)', type: 'command', value: '/passcode' },
      { label: '💎 បង់ប្រាក់ (/payment)', type: 'command', value: '/payment' },
    ],
  },
  {
    command: '/register',
    titleKh: 'ណែនាំការចុះឈ្មោះ',
    descriptionKh: 'ជំហានចុះឈ្មោះ និងចូលប្រើប្រាស់ Master Quiz KH',
    title: '📝 ការណែនាំចុះឈ្មោះប្រើប្រាស់កម្មវិធី Master Quiz KH',
    body: [
      'ដើម្បីចុះឈ្មោះ និងចូលធ្វើតេស្តលើកម្មវិធី សូមអនុវត្តតាម ៤ ជំហានងាយៗ៖',
      '',
      '១. បើកគេហទំព័រ Master Quiz KH រួចចុចជ្រើសរើសកាត «សមាជិក (Member)»។',
      '២. បំពេញ «ឈ្មោះអ្នកប្រើប្រាស់ (Username)» របស់អ្នក (ឧ. Dara ឬ សុខា)។',
      '៣. បញ្ចូល «លេខសម្ងាត់សមាជិក (Passcode)» ដែលអ្នកទទួលបានពី Admin។ (ប្រសិនបើមិនទាន់មាន សូមទាក់ទង @qcm_and_q_a)',
      '៤. ចុចប៊ូតុង «ផ្ទៀងផ្ទាត់ និងចូលធ្វើតេស្ត» ដើម្បីចាប់ផ្ដើមហ្វឹកហាត់សំណួរ QCM, Q&A និងពន្យល់ពាក្យភ្លាមៗ!',
      '',
      '✨ កំណត់សម្គាល់៖',
      '• អ្នកអាចសាកល្បងធ្វើតេស្តឥតគិតថ្លៃ ២៥ សំណួរក្នុងមួយមុខវិជ្ជា។',
      '• សម្រាប់សិទ្ធិពេញមួយជីវិត (គ្រប់មុខវិជ្ជា + Export PDF) សូមវាយ /payment។',
    ].join('\n'),
    actions: [
      { label: 'បើកផ្ទាំងចុះឈ្មោះ/ចូលជាសមាជិក', type: 'open_member_login', value: 'member' },
      { label: 'របៀបស្នើសុំលេខសម្ងាត់ (/passcode)', type: 'command', value: '/passcode' },
      { label: 'ការបង់ប្រាក់ (/payment)', type: 'command', value: '/payment' },
    ],
  },
  {
    command: '/passcode',
    titleKh: 'ស្នើសុំលេខសម្ងាត់',
    descriptionKh: 'របៀបស្នើសុំលេខសម្ងាត់សមាជិកពី Admin',
    title: '🔐 ការស្នើសុំលេខសម្ងាត់សមាជិក (Passcode)',
    body: [
      'ដើម្បីសុវត្ថិភាពគណនី កម្មវិធីមិនបង្ហាញ ឬផ្ដល់ទិន្នន័យអំពីលេខសម្ងាត់ជាសាធារណៈតាម Bot នោះទេ។',
      '',
      '📌 របៀបទទួលបានលេខសម្ងាត់សមាជិក ឬស្នើសុំកូដថ្មី (ពេលភ្លេចកូដ)៖',
      '១. ចុចទាក់ទង Admin តាម Telegram @qcm_and_q_a ខាងក្រោម។',
      '២. ផ្ញើឈ្មោះអ្នកប្រើប្រាស់ (Username) របស់អ្នក ដើម្បីឱ្យ Admin ផ្ដល់សិទ្ធិ និងលេខសម្ងាត់ជូនដោយផ្ទាល់។',
    ].join('\n'),
    actions: [
      { label: 'ទាក់ទង Admin (@qcm_and_q_a) ដើម្បីស្នើសុំកូដ', type: 'url', value: ADMIN_TELEGRAM_LINK },
      { label: 'របៀបចុះឈ្មោះ (/register)', type: 'command', value: '/register' },
    ],
  },
  {
    command: '/payment',
    titleKh: 'ការបង់ប្រាក់ KHQR',
    descriptionKh: 'ដំឡើងសិទ្ធិពេញមួយជីវិត ($10.00)',
    title: '💎 ការចុះឈ្មោះគណនីពេញមួយជីវិត (KHQR / ABA PayWay $10.00)',
    imageUrl: KHQR_IMAGE_PATH,
    imageAlt: 'KHOUN NARET Master QuizKH - KHQR $10.00',
    body: [
      'អត្ថប្រយោជន៍សម្រាប់សមាជិកផ្លូវការ (ប្រើប្រាស់ពេញមួយជីវិត)៖',
      '✅ ធ្វើតេស្ត QCM, Q&A និងពន្យល់ពាក្យគ្មានដែនកំណត់',
      '✅ ទាញយកឯកសារវិញ្ញាសា PDF (មានក្របខ្មែរ & តារាងចម្លើយ) ដោយសេរី',
      '✅ ចូលរួមក្រុមពិភាក្សាវិញ្ញាសាថ្មីៗជាប្រចាំ',
      '',
      '📌 ព័ត៌មានទូទាត់ ($10.00 USD)៖',
      '• គណនីទទួល៖ KHOUN NARET Master QuizKH',
      '• ស្កេន KHQR ខាងក្រោម ឬចុចប៊ូតុង «បើក Link បង់ប្រាក់ ABA PayWay»',
      '• បន្ទាប់ពីបង់ប្រាក់រួច សូមផ្ញើវិក្កយបត្រទៅ @qcm_and_q_a ឬបញ្ជាក់ក្នុងផ្ទាំង KHQR ក្នុងកម្មវិធី!',
    ].join('\n'),
    actions: [
      { label: '💳 បើក Link បង់ប្រាក់ ABA PayWay ($10.00)', type: 'url', value: PAYWAY_PAYMENT_LINK },
      { label: '📞 ផ្ញើវិក្កយបត្រទៅ @qcm_and_q_a', type: 'url', value: ADMIN_TELEGRAM_LINK },
      { label: '📝 ជំហានចុះឈ្មោះ (/register)', type: 'command', value: '/register' },
    ],
  },
  {
    command: '/contact',
    titleKh: 'ទំនាក់ទំនង Admin',
    descriptionKh: 'ឆាតសួរនាំ Admin និងចូលក្រុម Telegram',
    title: '📞 ទំនាក់ទំនង Admin និងបណ្ដាញ Telegram',
    body: [
      'ប្រសិនបើអ្នកត្រូវការជំនួយបន្ថែម ឬស្នើសុំវិញ្ញាសាថ្មីៗ៖',
      '• ទំនាក់ទំនង & ក្រុមសិក្សា QCM & Q&A៖ @qcm_and_q_a',
      '• Telegram Bot ផ្លូវការ៖ @qiuzs_bot',
    ].join('\n'),
    actions: [
      { label: '💬 ទាក់ទង Admin & ចូលក្រុម @qcm_and_q_a', type: 'url', value: TELEGRAM_GROUP_LINK },
      { label: '🤖 បើក Bot @qiuzs_bot', type: 'url', value: TELEGRAM_BOT_LINK },
    ],
  },
  {
    command: '/help',
    titleKh: 'ជំនួយ & Commands',
    descriptionKh: 'បង្ហាញបញ្ជី Command ទាំងអស់',
    title: '📚 បញ្ជី Command Bot ទាំងអស់',
    body: [
      'អ្នកអាចវាយ ឬចុច Command ខាងក្រោមដើម្បីទទួលបានការណែនាំភ្លាមៗ៖',
      '• /start — សារស្វាគមន៍ និងមឺនុយណែនាំប្រើប្រាស់កម្មវិធី',
      '• /register — ជំហានចុះឈ្មោះ និងចូលប្រើប្រាស់ Master Quiz KH',
      '• /passcode — របៀបស្នើសុំលេខសម្ងាត់សមាជិកពី Admin',
      '• /payment — ដំឡើងសិទ្ធិពេញមួយជីវិត ($10.00)',
      '• /contact — ឆាតសួរនាំ Admin និងចូលក្រុម Telegram',
      '• /help — បង្ហាញបញ្ជី Command ទាំងអស់',
    ].join('\n'),
    actions: [
      { label: '/register (ចុះឈ្មោះ)', type: 'command', value: '/register' },
      { label: '/passcode (លេខសម្ងាត់)', type: 'command', value: '/passcode' },
      { label: '/payment (បង់ប្រាក់)', type: 'command', value: '/payment' },
      { label: '/contact (ទាក់ទង)', type: 'command', value: '/contact' },
    ],
  },
];

export const BOT_COMMANDS_LIST: BotCommandMeta[] = DEFAULT_BOT_COMMANDS.map((c) => ({
  command: c.command,
  titleKh: c.titleKh,
  descriptionKh: c.descriptionKh,
}));

export function getMergedBotCommands(
  customCommands?: Record<string, BotCommandConfig>
): BotCommandConfig[] {
  return DEFAULT_BOT_COMMANDS.map((def) => {
    const custom = customCommands?.[def.command];
    if (!custom) return def;
    return {
      ...def,
      ...custom,
      command: def.command,
      actions: Array.isArray(custom.actions) ? custom.actions : def.actions,
    };
  });
}

export function resolveBotCommand(
  rawInput: string,
  customCommands?: Record<string, BotCommandConfig>
): BotCommandReply {
  const trimmed = (rawInput || '').trim();
  const token = trimmed.split(/\s+/)[0].toLowerCase().replace(/@[a-z0-9_]+$/i, '');

  const normalized =
    token === '/register' ||
    token === '/signup' ||
    token === '/login' ||
    token === 'register' ||
    trimmed.includes('ចុះឈ្មោះ')
      ? '/register'
      : token === '/passcode' ||
        token === '/code' ||
        token === 'passcode' ||
        trimmed.includes('លេខសម្ងាត់') ||
        trimmed.includes('កូដ')
      ? '/passcode'
      : token === '/payment' ||
        token === '/khqr' ||
        token === '/vip' ||
        token === 'payment' ||
        trimmed.includes('បង់ប្រាក់') ||
        trimmed.includes('khqr')
      ? '/payment'
      : token === '/contact' ||
        token === '/admin' ||
        token === 'contact' ||
        trimmed.includes('ទាក់ទង') ||
        trimmed.includes('admin')
      ? '/contact'
      : token === '/help' || token === 'help' || trimmed.includes('ជំនួយ')
      ? '/help'
      : token === '/start' || token === 'start' || trimmed === ''
      ? '/start'
      : 'unknown';

  if (normalized === 'unknown') {
    return {
      command: rawInput,
      title: '❓ មិនស្គាល់ Command នេះទេ',
      lines: [
        `សូមអភ័យទោស ខ្ញុំមិនទាន់ស្គាល់ពាក្យបញ្ជា «${trimmed}» ទេ។`,
        'សូមសាកល្បងប្រើ Command ខាងក្រោមវិញ៖',
        '• /register — ណែនាំអំពីការចុះឈ្មោះប្រើប្រាស់',
        '• /passcode — របៀបស្នើសុំលេខសម្ងាត់ពី Admin',
        '• /payment — របៀបបង់ប្រាក់ KHQR',
        '• /help — មើល Command ទាំងអស់',
      ],
      actions: [
        { label: '📝 ណែនាំចុះឈ្មោះ (/register)', type: 'command', value: '/register' },
        { label: '📚 បញ្ជី Commands (/help)', type: 'command', value: '/help' },
      ],
    };
  }

  const mergedList = getMergedBotCommands(customCommands);
  const found = mergedList.find((c) => c.command === normalized) || DEFAULT_BOT_COMMANDS[0];

  // If /help has not been manually customized, dynamically mirror updated command descriptions
  if (normalized === '/help' && !customCommands?.['/help']) {
    return {
      command: found.command,
      title: found.title,
      lines: [
        'អ្នកអាចវាយ ឬចុច Command ខាងក្រោមដើម្បីទទួលបានការណែនាំភ្លាមៗ៖',
        ...mergedList.map((c) => `• ${c.command} — ${c.descriptionKh}`),
      ],
      actions: found.actions,
    };
  }

  return {
    command: found.command,
    title: found.title,
    lines: (found.body || '').split('\n'),
    imageUrl: found.imageUrl,
    imageAlt: found.imageAlt,
    actions: found.actions || [],
  };
}
