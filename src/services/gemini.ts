// src/services/gemini.ts
// Phân tích lệnh thoại bằng Gemini API

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export type ActionType =
  | 'call'
  | 'sms'
  | 'open_app'
  | 'set_alarm'
  | 'set_timer'
  | 'search'
  | 'ai_chat'
  | 'read_notifications'
  | 'analyze_data'
  | 'control_ai'
  | 'unknown';

export interface Intent {
  action: ActionType;
  params: {
    contact?: string;
    phone?: string;
    message?: string;
    app?: string;
    time?: string;
    duration?: string;
    query?: string;
    data?: string;
    ai_target?: string;
    ai_command?: string;
  };
  response: string;
  confidence: number;
}

const SYSTEM_PROMPT = `Bạn là AI phân tích lệnh thoại tiếng Việt cho trợ lý giọng nói "Candy".
Phân tích câu lệnh người dùng và trả về JSON với cấu trúc sau:

{
  "action": "call|sms|open_app|set_alarm|set_timer|search|ai_chat|read_notifications|analyze_data|control_ai|unknown",
  "params": {
    "contact": "tên người (nếu gọi/nhắn tin)",
    "phone": "số điện thoại (nếu có)",
    "message": "nội dung tin nhắn",
    "app": "tên ứng dụng cần mở",
    "time": "thời gian (HH:mm hoặc mô tả)",
    "duration": "thời lượng hẹn giờ (ví dụ: 5 phút, 1 giờ)",
    "query": "nội dung tìm kiếm hoặc câu hỏi",
    "data": "dữ liệu cần phân tích",
    "ai_target": "tên AI cần điều khiển (ChatGPT, Gemini, Copilot...)",
    "ai_command": "lệnh cần thực hiện trên AI đó"
  },
  "response": "câu trả lời ngắn gọn bằng tiếng Việt, thân thiện",
  "confidence": 0.0 đến 1.0
}

Quy tắc:
- Chỉ trả về JSON thuần, không markdown, không text ngoài.
- Nếu không chắc action nào, dùng "ai_chat" và trả lời trong "response".
- Với gọi điện: contact là tên, phone là số (nếu người dùng nói số).
- Với hẹn giờ: duration là thời lượng (ví dụ "5 phút").
- Với báo thức: time là giờ cụ thể (ví dụ "7:00").
- response phải ngắn, tự nhiên như người thật.`;

export async function parseIntent(text: string, apiKey: string): Promise<Intent> {
  if (!apiKey) {
    return {
      action: 'unknown',
      params: {},
      response: 'Chưa có API key. Vào Cài đặt để thêm Gemini API key.',
      confidence: 0,
    };
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Lệnh: "${text}"` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      action: parsed.action || 'unknown',
      params: parsed.params || {},
      response: parsed.response || 'Xong rồi.',
      confidence: parsed.confidence || 0.5,
    };
  } catch (e: any) {
    console.error('Gemini error:', e.message);
    return {
      action: 'unknown',
      params: { query: text },
      response: 'Xin lỗi, tôi không kết nối được. Kiểm tra mạng và API key.',
      confidence: 0,
    };
  }
}

// Chat thường với Gemini (không cần parse JSON)
export async function chatWithGemini(
  text: string,
  apiKey: string,
  history: { role: string; text: string }[] = []
): Promise<string> {
  if (!apiKey) return 'Chưa có API key.';

  try {
    const messages = [
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      { role: 'user', parts: [{ text }] },
    ];

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: 'Bạn là Candy, trợ lý AI thân thiện. Trả lời ngắn gọn bằng tiếng Việt.' }],
        },
        contents: messages,
        generationConfig: { maxOutputTokens: 300 },
      }),
    });

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi.';
  } catch {
    return 'Lỗi kết nối Gemini.';
  }
}
