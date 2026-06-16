import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { isLoggedIn } from '@/lib/auth';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { NIKON_YELLOW } from '@/constants/config';

export default function RootLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    isLoggedIn().then((loggedIn) => {
      setChecking(false);
      if (!loggedIn) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(tabs)');
      }
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: NIKON_YELLOW }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
