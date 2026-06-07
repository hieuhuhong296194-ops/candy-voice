// app/index.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseIntent } from '../src/services/gemini';
import { executeCommand } from '../src/services/commands';

// ─── Hằng số ───────────────────────────────────────────────────────────────
const WAKE_WORDS = ['hey candy', 'này candy', 'ơi candy', 'candy ơi', 'candy'];
const API_KEY_STORAGE = 'gemini_api_key';
const ALWAYS_ON_STORAGE = 'always_on';

type Mode = 'off' | 'wake' | 'active' | 'processing';

type LogEntry = {
  id: number;
  time: string;
  text: string;
  type: 'info' | 'user' | 'candy' | 'error';
};

// ─── Component chính ──────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [mode, setMode] = useState<Mode>('off');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('Xin chào! Tôi là Candy 🍬');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [logIdCounter, setLogIdCounter] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.3)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentMode = useRef<Mode>('off');

  currentMode.current = mode;

  // ─── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadSettings();
    loadContacts();
    return () => {
      if (restartTimer.current) clearTimeout(restartTimer.current);
      ExpoSpeechRecognitionModule.stop();
    };
  }, []);

  // ─── Pulse animation ──────────────────────────────────────────────────────
  useEffect(() => {
    pulseLoop.current?.stop();
    if (mode === 'off') {
      pulseAnim.setValue(1);
      ringOpacity.setValue(0.15);
      return;
    }
    const speed = mode === 'active' ? 600 : mode === 'wake' ? 1800 : 400;
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: speed, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.6, duration: speed, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: speed, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.15, duration: speed, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoop.current.start();
  }, [mode]);

  // ─── Speech events ────────────────────────────────────────────────────────
  useSpeechRecognitionEvent('result', (event) => {
    const text = (event.results[0]?.transcript || '').trim();
    if (!text) return;
    setTranscript(text);

    if (currentMode.current === 'wake') {
      const lower = text.toLowerCase();
      if (WAKE_WORDS.some((w) => lower.includes(w))) {
        setMode('active');
        addLog(`👂 Wake word: "${text}"`, 'info');
        speakOut('Tôi đây!');
      }
    } else if (currentMode.current === 'active') {
      handleVoiceCommand(text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    const m = currentMode.current;
    if (m === 'wake' || (m === 'active' && alwaysOn)) {
      restartTimer.current = setTimeout(() => startSTT(), 600);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'no-speech') {
      // Bình thường, restart im lặng
      const m = currentMode.current;
      if (m === 'wake' || m === 'active') {
        restartTimer.current = setTimeout(() => startSTT(), 800);
      }
      return;
    }
    addLog(`⚠️ ${event.error}`, 'error');
    const m = currentMode.current;
    if (m === 'wake' || m === 'active') {
      restartTimer.current = setTimeout(() => startSTT(), 1500);
    }
  });

  // ─── Core functions ───────────────────────────────────────────────────────
  const startSTT = useCallback(async () => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        addLog('❌ Chưa cấp quyền microphone', 'error');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'vi-VN',
        continuous: false,
        partialResults: true,
        requiresOnDeviceRecognition: false,
      });
    } catch (e) {
      // Ignore start errors (already running)
    }
  }, []);

  const stopSTT = useCallback(() => {
    if (restartTimer.current) clearTimeout(restartTimer.current);
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
  }, []);

  const toggleMic = () => {
    if (mode === 'off') {
      setMode('active');
      setTranscript('');
      startSTT();
      addLog('🎙️ Bật mic', 'info');
    } else if (mode !== 'processing') {
      stopSTT();
      setMode('off');
      setTranscript('');
      addLog('🔇 Tắt mic', 'info');
    }
  };

  const toggleAlwaysOn = async (val: boolean) => {
    setAlwaysOn(val);
    await AsyncStorage.setItem(ALWAYS_ON_STORAGE, val ? '1' : '0');
    if (val) {
      setMode('wake');
      setTranscript('');
      startSTT();
      addLog('👂 Chế độ luôn lắng nghe: BẬT', 'info');
      setReply('Tôi đang nghe... Nói "Hey Candy" để kích hoạt 🍬');
    } else {
      stopSTT();
      setMode('off');
      setTranscript('');
      addLog('💤 Chế độ luôn lắng nghe: TẮT', 'info');
    }
  };

  const handleVoiceCommand = useCallback(
    async (text: string) => {
      if (!text || mode === 'processing') return;
      setMode('processing');
      stopSTT();
      addLog(`🗣️ "${text}"`, 'user');

      try {
        const intent = await parseIntent(text, apiKey);
        const result = await executeCommand(intent, contacts);
        const msg = result.message || intent.response || 'Xong rồi.';
        setReply(msg);
        speakOut(msg);
        addLog(`🍬 ${msg}`, 'candy');
      } catch (e) {
        const err = 'Xin lỗi, có lỗi xảy ra.';
        setReply(err);
        speakOut(err);
        addLog(`❌ Lỗi: ${e}`, 'error');
      } finally {
        setTranscript('');
        if (alwaysOn) {
          setMode('wake');
          setTimeout(() => startSTT(), 1200);
        } else {
          setMode('off');
        }
      }
    },
    [mode, apiKey, contacts, alwaysOn]
  );

  const speakOut = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'vi-VN', rate: 1.05, pitch: 1.0 });
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const addLog = useCallback((text: string, type: LogEntry['type']) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLogIdCounter((c) => {
      const id = c + 1;
      setLogs((prev) => [{ id, time, text, type }, ...prev.slice(0, 79)]);
      return id;
    });
  }, []);

  const loadSettings = async () => {
    const key = await AsyncStorage.getItem(API_KEY_STORAGE);
    const ao = await AsyncStorage.getItem(ALWAYS_ON_STORAGE);
    if (key) setApiKey(key);
    if (ao === '1') {
      setAlwaysOn(true);
      // Không auto-start, để user bật thủ công sau khi load xong
    }
  };

  const loadContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      setContacts(data);
      addLog(`📒 Tải ${data.length} liên hệ`, 'info');
    }
  };

  const saveApiKey = async () => {
    await AsyncStorage.setItem(API_KEY_STORAGE, tempKey);
    setApiKey(tempKey);
    setShowSettings(false);
    addLog('✅ Đã lưu API key', 'info');
  };

  // ─── UI helpers ───────────────────────────────────────────────────────────
  const modeColor = {
    off: '#3A3A4A',
    wake: '#4ECDC4',
    active: '#FF6B6B',
    processing: '#FFD93D',
  }[mode];

  const modeLabel = {
    off: 'TẮT',
    wake: 'CHỜ "HEY CANDY"',
    active: 'ĐANG NGHE',
    processing: 'ĐANG XỬ LÝ...',
  }[mode];

  const micEmoji = { off: '🎙️', wake: '👂', active: '🔴', processing: '⚡' }[mode];

  const logColor = { info: '#555', user: '#4ECDC4', candy: '#FFD93D', error: '#FF6B6B' };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>🍬 CANDY</Text>
        <View style={styles.headerRight}>
          <View style={styles.alwaysRow}>
            <Text style={styles.alwaysLabel}>Luôn bật</Text>
            <Switch
              value={alwaysOn}
              onValueChange={toggleAlwaysOn}
              trackColor={{ false: '#2A2A3A', true: '#4ECDC4' }}
              thumbColor="#fff"
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
            />
          </View>
          <TouchableOpacity onPress={() => { setTempKey(apiKey); setShowSettings(true); }}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mic area */}
      <View style={styles.micArea}>
        {/* Outer ring */}
        <Animated.View
          style={[
            styles.outerRing,
            {
              borderColor: modeColor,
              opacity: ringOpacity,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        {/* Inner ring */}
        <View style={[styles.innerRing, { borderColor: modeColor }]} />
        {/* Button */}
        <TouchableOpacity
          style={[styles.micButton, { backgroundColor: modeColor }]}
          onPress={toggleMic}
          disabled={mode === 'processing' || alwaysOn}
          activeOpacity={0.85}
        >
          <Text style={styles.micEmoji}>{micEmoji}</Text>
        </TouchableOpacity>
      </View>

      {/* Mode label */}
      <Text style={[styles.modeLabel, { color: modeColor }]}>{modeLabel}</Text>

      {/* Transcript */}
      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>TÔI NGHE ĐƯỢC</Text>
          <Text style={styles.transcriptText}>"{transcript}"</Text>
        </View>
      ) : null}

      {/* Reply */}
      <View style={styles.replyBox}>
        <Text style={styles.replyLabel}>CANDY NÓI</Text>
        <Text style={styles.replyText}>{reply}</Text>
      </View>

      {/* Logs */}
      <View style={styles.logBox}>
        <Text style={styles.logTitle}>NHẬT KÝ HOẠT ĐỘNG</Text>
        <ScrollView
          ref={scrollRef}
          style={styles.logScroll}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {logs.map((l) => (
            <Text key={l.id} style={[styles.logEntry, { color: logColor[l.type] }]}>
              <Text style={styles.logTime}>{l.time} </Text>
              {l.text}
            </Text>
          ))}
        </ScrollView>
      </View>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowSettings(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>⚙️ Cài đặt</Text>

            <Text style={styles.inputLabel}>Gemini API Key</Text>
            <TextInput
              style={styles.textInput}
              value={tempKey}
              onChangeText={setTempKey}
              placeholder="Dán API key vào đây..."
              placeholderTextColor="#444"
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.inputHint}>
              Lấy miễn phí tại aistudio.google.com
            </Text>

            <TouchableOpacity style={styles.saveBtn} onPress={saveApiKey}>
              <Text style={styles.saveBtnText}>Lưu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    paddingTop: 52,
    paddingHorizontal: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alwaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alwaysLabel: {
    color: '#666',
    fontSize: 12,
  },
  settingsIcon: {
    fontSize: 20,
  },
  // Mic
  micArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    marginBottom: 12,
  },
  outerRing: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 1.5,
  },
  innerRing: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 69,
    borderWidth: 1,
    opacity: 0.4,
  },
  micButton: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  micEmoji: {
    fontSize: 42,
  },
  modeLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 20,
  },
  // Transcript
  transcriptBox: {
    backgroundColor: '#12121E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#FF6B6B',
  },
  transcriptLabel: {
    color: '#444',
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 4,
  },
  transcriptText: {
    color: '#bbb',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Reply
  replyBox: {
    backgroundColor: '#0F1A24',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 2,
    borderLeftColor: '#4ECDC4',
  },
  replyLabel: {
    color: '#4ECDC4',
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 5,
    opacity: 0.7,
  },
  replyText: {
    color: '#e8e8e8',
    fontSize: 14,
    lineHeight: 21,
  },
  // Logs
  logBox: {
    flex: 1,
    minHeight: 80,
  },
  logTitle: {
    color: '#333',
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 6,
  },
  logScroll: {
    flex: 1,
    backgroundColor: '#080810',
    borderRadius: 8,
    padding: 10,
  },
  logEntry: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 18,
    marginBottom: 1,
  },
  logTime: {
    color: '#2A2A3A',
    fontSize: 10,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#12121E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#888',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1E1E2E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  inputHint: {
    color: '#444',
    fontSize: 11,
    marginTop: 6,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#555',
    fontSize: 14,
  },
});
