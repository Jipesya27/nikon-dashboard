import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { NIKON_YELLOW, NIKON_BLACK } from '@/constants/config';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: NIKON_BLACK,
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: NIKON_YELLOW },
        headerTitleStyle: { fontWeight: '800', color: NIKON_BLACK },
        headerTintColor: NIKON_BLACK,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarLabel: 'Beranda',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
          headerTitle: 'NIKON Dashboard',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Pesan WA',
          tabBarLabel: 'Pesan',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
          headerTitle: 'Pesan WhatsApp',
        }}
      />
      <Tabs.Screen
        name="thread"
        options={{
          href: null, // Hidden from tab bar, opened programmatically
          headerTitle: 'Chat',
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Event',
          tabBarLabel: 'Event',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎫" focused={focused} />,
          headerTitle: 'Validasi Event',
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Absensi',
          tabBarLabel: 'Absensi',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📷" focused={focused} />,
          headerTitle: 'Scan QR Absensi',
        }}
      />
    </Tabs>
  );
}
