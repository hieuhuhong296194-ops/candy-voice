// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#0A0A0F" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
