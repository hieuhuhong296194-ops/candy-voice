# 🍬 Candy Voice Assistant

Trợ lý giọng nói đa chức năng cho Android. Nghe lệnh, phân tích bằng Gemini AI, thực thi ngay.

---

## ✨ Tính năng

| Lệnh | Ví dụ |
|---|---|
| 📞 Gọi điện | "Gọi cho mẹ" |
| 💬 Nhắn tin | "Nhắn cho anh Tuấn: tôi đến muộn" |
| 📱 Mở app | "Mở YouTube" / "Mở Zalo" |
| ⏰ Báo thức | "Đặt báo thức 7 giờ sáng" |
| ⏱️ Hẹn giờ | "Hẹn giờ 10 phút" |
| 🔍 Tìm kiếm | "Tìm thời tiết Hà Nội" |
| 🤖 Hỏi AI | "Giải thích lỗi này cho tôi..." |
| 🌐 Mở AI khác | "Mở ChatGPT" / "Mở Gemini" |

**Kích hoạt:**
- 🔘 Bấm nút mic để nghe 1 lần
- 👂 Bật "Luôn bật" → nói "Hey Candy" bất kỳ lúc nào

---

## 🚀 Cài đặt & Build

### 1. Clone và cài dependencies
```bash
git clone https://github.com/YOUR_USERNAME/candy-voice.git
cd candy-voice
npm install
```

### 2. Lấy Gemini API Key
- Vào [aistudio.google.com](https://aistudio.google.com)
- Tạo API key miễn phí
- Nhập vào app khi mở lần đầu (⚙️ Cài đặt)

### 3. Build APK với EAS (cloud, không cần máy tính)

**Bước 1: Tạo tài khoản Expo**
```
https://expo.dev → Sign up (miễn phí)
```

**Bước 2: Login EAS trên terminal/Termux**
```bash
npm install -g eas-cli
eas login
eas build:configure  # chọn Android
```

**Bước 3: Build APK**
```bash
eas build --platform android --profile preview
```
→ EAS sẽ build trên cloud, gửi link tải APK qua email (~15-20 phút)

---

## 🤖 Auto Build qua GitHub Actions

### Setup secret EXPO_TOKEN:
1. Vào [expo.dev](https://expo.dev) → Account Settings → Access Tokens
2. Tạo token mới, copy
3. GitHub repo → Settings → Secrets → New secret
   - Name: `EXPO_TOKEN`
   - Value: paste token

### Chạy build:
- **Auto**: Push code lên branch `main` → tự động build preview APK
- **Manual**: GitHub → Actions → Build Candy APK → Run workflow

---

## 📁 Cấu trúc project

```
candy-voice/
├── app/
│   ├── _layout.tsx          # Expo Router layout
│   └── index.tsx            # Màn hình chính
├── src/
│   └── services/
│       ├── gemini.ts        # Parse lệnh bằng Gemini AI
│       └── commands.ts      # Thực thi lệnh (gọi, SMS, mở app...)
├── .github/workflows/
│   └── build.yml            # GitHub Actions auto-build
├── app.json                 # Expo config + Android permissions
├── eas.json                 # EAS Build profiles
└── package.json
```

---

## 🛠️ Phát triển thêm

- **Wake word offline**: Tích hợp [Picovoice Porcupine](https://picovoice.ai) (free tier)
- **Đọc thông báo**: Cần `NotificationListenerService` (native module)
- **Phân tích dữ liệu**: Upload file → Gemini phân tích
- **Background service**: `expo-task-manager` + foreground notification

---

## 📋 Permissions cần cấp

Khi mở app lần đầu, cấp quyền:
- 🎙️ Microphone (bắt buộc)
- 📒 Danh bạ (để gọi/nhắn tin theo tên)
- 🔔 Thông báo (báo thức)
