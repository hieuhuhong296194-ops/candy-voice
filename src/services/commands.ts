// src/services/commands.ts
// Thực thi các lệnh sau khi parse intent

import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import * as Notifications from 'expo-notifications';
import { Intent } from './gemini';

export interface CommandResult {
  success: boolean;
  message: string;
}

type Contact = {
  id: string;
  name?: string;
  phoneNumbers?: { number: string; label?: string }[];
};

// ─── Router chính ───────────────────────────────────────────────────────────
export async function executeCommand(
  intent: Intent,
  contacts: Contact[]
): Promise<CommandResult> {
  switch (intent.action) {
    case 'call':
      return handleCall(intent.params.contact, intent.params.phone, contacts);
    case 'sms':
      return handleSMS(intent.params.contact, intent.params.message, contacts);
    case 'open_app':
      return handleOpenApp(intent.params.app);
    case 'set_alarm':
      return handleSetAlarm(intent.params.time);
    case 'set_timer':
      return handleSetTimer(intent.params.duration);
    case 'search':
      return handleSearch(intent.params.query);
    case 'ai_chat':
      return { success: true, message: intent.response };
    case 'control_ai':
      return handleControlAI(intent.params.ai_target, intent.params.ai_command);
    case 'read_notifications':
      return { success: true, message: 'Tính năng đọc thông báo cần quyền Accessibility. Vào Cài đặt > Trợ năng để bật.' };
    case 'analyze_data':
      return { success: true, message: intent.response };
    default:
      return { success: false, message: intent.response || 'Tôi không hiểu lệnh này.' };
  }
}

// ─── Gọi điện ────────────────────────────────────────────────────────────────
async function handleCall(
  contactName?: string,
  directPhone?: string,
  contacts: Contact[] = []
): Promise<CommandResult> {
  let number = directPhone?.replace(/\s/g, '');

  if (!number && contactName) {
    const found = findContact(contactName, contacts);
    number = found?.phoneNumbers?.[0]?.number?.replace(/\s/g, '');
  }

  if (number) {
    const canOpen = await Linking.canOpenURL(`tel:${number}`);
    if (canOpen) {
      await Linking.openURL(`tel:${number}`);
      return { success: true, message: `Đang gọi ${contactName || number}` };
    }
  }

  return {
    success: false,
    message: contactName
      ? `Không tìm thấy số điện thoại của ${contactName}`
      : 'Vui lòng cho biết tên hoặc số cần gọi',
  };
}

// ─── Nhắn tin ────────────────────────────────────────────────────────────────
async function handleSMS(
  contactName?: string,
  message?: string,
  contacts: Contact[] = []
): Promise<CommandResult> {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) return { success: false, message: 'SMS không khả dụng trên thiết bị này' };

  let number: string | undefined;
  const found = contactName ? findContact(contactName, contacts) : undefined;
  number = found?.phoneNumbers?.[0]?.number?.replace(/\s/g, '');

  if (number) {
    await SMS.sendSMSAsync([number], message || '');
    return { success: true, message: `Đang gửi tin nhắn đến ${contactName}` };
  }

  return {
    success: false,
    message: `Không tìm thấy số của ${contactName || 'người nhận'}`,
  };
}

// ─── Mở app ──────────────────────────────────────────────────────────────────
const APP_SCHEMES: Record<string, string> = {
  youtube: 'vnd.youtube://',
  facebook: 'fb://',
  messenger: 'fb-messenger://',
  zalo: 'zalo://',
  tiktok: 'snssdk1233://',
  instagram: 'instagram://',
  chrome: 'googlechrome://',
  maps: 'comgooglemaps://',
  gmail: 'googlegmail://',
  camera: 'content://media/internal/images/media',
  settings: 'android.settings.SETTINGS',
  phone: 'tel:',
  contacts: 'content://contacts/people/',
  whatsapp: 'whatsapp://',
  telegram: 'tg://',
  spotify: 'spotify://',
};

async function handleOpenApp(appName?: string): Promise<CommandResult> {
  if (!appName) return { success: false, message: 'Không biết app nào cần mở' };

  const lower = appName.toLowerCase();
  const matchedKey = Object.keys(APP_SCHEMES).find((k) => lower.includes(k));

  if (matchedKey) {
    const scheme = APP_SCHEMES[matchedKey];
    const canOpen = await Linking.canOpenURL(scheme);
    if (canOpen) {
      await Linking.openURL(scheme);
      return { success: true, message: `Đang mở ${appName}` };
    }
  }

  // Fallback: tìm trên Play Store
  const playUrl = `https://play.google.com/store/search?q=${encodeURIComponent(appName)}`;
  await Linking.openURL(playUrl);
  return { success: true, message: `Đang tìm ${appName} trên Play Store` };
}

// ─── Báo thức ─────────────────────────────────────────────────────────────────
async function handleSetAlarm(timeStr?: string): Promise<CommandResult> {
  if (!timeStr) return { success: false, message: 'Vui lòng nói giờ báo thức' };

  // Parse giờ từ string (ví dụ "7 giờ", "7:30", "7h30")
  const parsed = parseTime(timeStr);
  const alarmUrl = parsed
    ? `android.intent.action.SET_ALARM#Intent;S.android.intent.extra.alarm.MESSAGE=Candy;I.android.intent.extra.alarm.HOUR=${parsed.hour};I.android.intent.extra.alarm.MINUTES=${parsed.minute};end`
    : 'android.intent.action.SET_ALARM';

  try {
    await Linking.openURL(alarmUrl);
    return {
      success: true,
      message: parsed
        ? `Đã đặt báo thức lúc ${parsed.hour}:${String(parsed.minute).padStart(2, '0')}`
        : `Đang mở ứng dụng báo thức`,
    };
  } catch {
    // Fallback: mở app đồng hồ
    await Linking.openURL('android.intent.action.SET_ALARM');
    return { success: true, message: 'Đang mở ứng dụng báo thức' };
  }
}

// ─── Hẹn giờ ─────────────────────────────────────────────────────────────────
async function handleSetTimer(durationStr?: string): Promise<CommandResult> {
  if (!durationStr) return { success: false, message: 'Vui lòng nói thời lượng hẹn giờ' };

  const seconds = parseDuration(durationStr);
  const timerUrl = seconds
    ? `android.intent.action.SET_TIMER#Intent;S.android.intent.extra.timer.MESSAGE=Candy;I.android.intent.extra.timer.LENGTH=${seconds};end`
    : 'android.intent.action.SET_TIMER';

  try {
    await Linking.openURL(timerUrl);
    return { success: true, message: `Đã đặt hẹn giờ ${durationStr}` };
  } catch {
    return { success: true, message: 'Đang mở ứng dụng hẹn giờ' };
  }
}

// ─── Tìm kiếm ─────────────────────────────────────────────────────────────────
async function handleSearch(query?: string): Promise<CommandResult> {
  if (!query) return { success: false, message: 'Vui lòng cho biết nội dung tìm kiếm' };
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  await Linking.openURL(url);
  return { success: true, message: `Đang tìm kiếm: ${query}` };
}

// ─── Điều khiển AI khác ────────────────────────────────────────────────────
async function handleControlAI(
  aiTarget?: string,
  command?: string
): Promise<CommandResult> {
  const aiApps: Record<string, string> = {
    chatgpt: 'https://chat.openai.com',
    gemini: 'https://gemini.google.com',
    copilot: 'https://copilot.microsoft.com',
    claude: 'https://claude.ai',
    perplexity: 'https://perplexity.ai',
  };

  const lower = (aiTarget || '').toLowerCase();
  const url = Object.entries(aiApps).find(([k]) => lower.includes(k))?.[1];

  if (url) {
    await Linking.openURL(url);
    return {
      success: true,
      message: `Đang mở ${aiTarget}${command ? `. Lệnh: ${command}` : ''}`,
    };
  }

  return { success: false, message: `Không tìm thấy AI: ${aiTarget}` };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function findContact(name: string, contacts: Contact[]): Contact | undefined {
  const lower = name.toLowerCase().trim();
  return contacts.find((c) =>
    c.name?.toLowerCase().includes(lower)
  );
}

function parseTime(str: string): { hour: number; minute: number } | null {
  // Match patterns: "7:30", "7h30", "7 giờ 30", "7 giờ"
  const patterns = [
    /(\d{1,2}):(\d{2})/,
    /(\d{1,2})h(\d{2})/i,
    /(\d{1,2})\s*giờ\s*(\d{1,2})/i,
    /(\d{1,2})\s*giờ/i,
  ];

  for (const p of patterns) {
    const m = str.match(p);
    if (m) {
      return {
        hour: parseInt(m[1]),
        minute: m[2] ? parseInt(m[2]) : 0,
      };
    }
  }
  return null;
}

function parseDuration(str: string): number | null {
  let total = 0;
  const hours = str.match(/(\d+)\s*(giờ|tiếng|h)/i);
  const minutes = str.match(/(\d+)\s*(phút|p|min)/i);
  const seconds = str.match(/(\d+)\s*(giây|s|sec)/i);

  if (hours) total += parseInt(hours[1]) * 3600;
  if (minutes) total += parseInt(minutes[1]) * 60;
  if (seconds) total += parseInt(seconds[1]);

  return total > 0 ? total : null;
}
