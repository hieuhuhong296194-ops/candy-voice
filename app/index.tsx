import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Modal, TextInput, Pressable } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseIntent } from '../src/services/gemini';
import { executeCommand } from '../src/services/commands';

const API_KEY_STORAGE = 'gemini_api_key';

export default function HomeScreen() {
  const [isListening, setIsListening] = useState(false);
  const [reply, setReply] = useState('Xin chào! Tôi là Candy 🍬');
  const [logs, setLogs] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const recording = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(API_KEY_STORAGE).then(k => k && setApiKey(k));
    Contacts.requestPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name] })
          .then(({ data }) => setContacts(data));
      }
    });
  }, []);

  const addLog = (msg: string) => {
    const t = new Date().toLocaleTimeString('vi-VN');
    setLogs(prev => [`[${t}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'vi-VN', rate: 1.0 });
  };

  const handleCommand = async (text: string) => {
    if (!text.trim()) return;
    addLog(`🗣️ "${text}"`);
    try {
      const intent = await parseIntent(text, apiKey);
      const result = await executeCommand(intent, contacts);
      const msg = result.message || intent.response || 'Xong rồi.';
      setReply(msg);
      speak(msg);
      addLog(`🍬 ${msg}`);
    } catch (e) {
      setReply('Có lỗi xảy ra.');
      addLog('❌ Lỗi xử lý');
    }
  };

  const toggleMic = async () => {
    if (isListening) {
      setIsListening(false);
      addLog('🔇 Dừng ghi âm');
      setShowInput(true);
    } else {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recording.current = rec;
        setIsListening(true);
        addLog('🎙️ Đang ghi âm...');
      } catch (e) {
        addLog('❌
cat > app/index.tsx << 'ENDOFFILE'
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Modal, TextInput, Pressable } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseIntent } from '../src/services/gemini';
import { executeCommand } from '../src/services/commands';

const API_KEY_STORAGE = 'gemini_api_key';

export default function HomeScreen() {
  const [isListening, setIsListening] = useState(false);
  const [reply, setReply] = useState('Xin chào! Tôi là Candy 🍬');
  const [logs, setLogs] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const recording = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(API_KEY_STORAGE).then(k => k && setApiKey(k));
    Contacts.requestPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name] })
          .then(({ data }) => setContacts(data));
      }
    });
  }, []);

  const addLog = (msg: string) => {
    const t = new Date().toLocaleTimeString('vi-VN');
    setLogs(prev => [`[${t}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'vi-VN', rate: 1.0 });
  };

  const handleCommand = async (text: string) => {
    if (!text.trim()) return;
    addLog(`🗣️ "${text}"`);
    try {
      const intent = await parseIntent(text, apiKey);
      const result = await executeCommand(intent, contacts);
      const msg = result.message || intent.response || 'Xong rồi.';
      setReply(msg);
      speak(msg);
      addLog(`🍬 ${msg}`);
    } catch (e) {
      setReply('Có lỗi xảy ra.');
      addLog('❌ Lỗi xử lý');
    }
  };

  const toggleMic = async () => {
    if (isListening) {
      setIsListening(false);
      addLog('🔇 Dừng ghi âm');
      setShowInput(true);
    } else {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recording.current = rec;
        setIsListening(true);
        addLog('🎙️ Đang ghi âm...');
      } catch (e) {
        addLog('❌ Lỗi microphone');
        setShowInput(true);
      }
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>🍬 CANDY</Text>
        <TouchableOpacity onPress={() => { setTempKey(apiKey); setShowSettings(true); }}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.micArea}>
        <TouchableOpacity style={[styles.micBtn, { backgroundColor: isListening ? '#FF6B6B' : '#4ECDC4' }]} onPress={toggleMic}>
          <Text style={styles.micIcon}>{isListening ? '🔴' : '🎙️'}</Text>
        </TouchableOpacity>
        <Text style={[styles.modeLabel, { color: isListening ? '#FF6B6B' : '#4ECDC4' }]}>
          {isListening ? 'ĐANG GHI ÂM' : 'NHẤN ĐỂ NÓI'}
        </Text>
      </View>

      <View style={styles.replyBox}>
        <Text style={styles.replyLabel}>CANDY NÓI</Text>
        <Text style={styles.replyText}>{reply}</Text>
      </View>

      <View style={styles.logBox}>
        <Text style={styles.logTitle}>NHẬT KÝ</Text>
        <ScrollView style={styles.logScroll}>
          {logs.map((l, i) => <Text key={i} style={styles.logText}>{l}</Text>)}
        </ScrollView>
      </View>

      <Modal visible={showInput} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowInput(false)}>
          <Pressable style={styles.inputCard} onPress={() => {}}>
            <Text style={styles.inputTitle}>Nhập lệnh thủ công</Text>
            <TextInput style={styles.textInput} value={manualInput} onChangeText={setManualInput}
              placeholder="Ví dụ: Gọi cho mẹ..." placeholderTextColor="#444" autoFocus />
            <TouchableOpacity style={styles.sendBtn} onPress={() => { handleCommand(manualInput); setManualInput(''); setShowInput(false); }}>
              <Text style={styles.sendText}>Gửi</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showSettings} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowSettings(false)}>
          <Pressable style={styles.inputCard} onPress={() => {}}>
            <Text style={styles.inputTitle}>⚙️ Cài đặt</Text>
            <Text style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Gemini API Key</Text>
            <TextInput style={styles.textInput} value={tempKey} onChangeText={setTempKey}
              placeholder="AIza..." placeholderTextColor="#444" secureTextEntry autoCapitalize="none" />
            <TouchableOpacity style={styles.sendBtn} onPress={async () => { await AsyncStorage.setItem(API_KEY_STORAGE, tempKey); setApiKey(tempKey); setShowSettings(false); }}>
              <Text style={styles.sendText}>Lưu</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0F', paddingTop: 52, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 5 },
  micArea: { alignItems: 'center', marginVertical: 30 },
  micBtn: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', elevation: 10 },
  micIcon: { fontSize: 42 },
  modeLabel: { marginTop: 14, fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  replyBox: { backgroundColor: '#0F1A24', borderRadius: 10, padding: 14, marginBottom: 14, borderLeftWidth: 2, borderLeftColor: '#4ECDC4' },
  replyLabel: { color: '#4ECDC4', fontSize: 9, letterSpacing: 2, marginBottom: 5, opacity: 0.7 },
  replyText: { color: '#e8e8e8', fontSize: 14, lineHeight: 21 },
  logBox: { flex: 1 },
  logTitle: { color: '#333', fontSize: 9, letterSpacing: 2, marginBottom: 6 },
  logScroll: { flex: 1, backgroundColor: '#080810', borderRadius: 8, padding: 10 },
  logText: { color: '#555', fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  inputCard: { backgroundColor: '#12121E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  inputTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  textInput: { backgroundColor: '#1E1E2E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2A2A3A', marginBottom: 12 },
  sendBtn: { backgroundColor: '#4ECDC4', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sendText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
