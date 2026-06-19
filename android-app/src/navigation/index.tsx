import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import ClaimsScreen from '../screens/ClaimsScreen';
import GaransiScreen from '../screens/GaransiScreen';
import ServiceScreen from '../screens/ServiceScreen';
import ExpenseClaimsScreen from '../screens/ExpenseClaimsScreen';
import PeminjamanScreen from '../screens/PeminjamanScreen';
import ProfileScreen from '../screens/ProfileScreen';

// ── Param lists ───────────────────────────────────────────────────────────────

export type ChatStackParamList = {
  ChatList: undefined;
  ChatDetail: { nomorWa: string; nama: string };
};

export type EventsStackParamList = {
  EventsList: undefined;
  EventDetail: { eventId: string; title: string };
};

export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
  Events: undefined;
  Claims: undefined;
  Profile: undefined;
  // Extra screens accessible from Home quick menu
  Garansi: undefined;
  Service: undefined;
  ExpenseClaims: undefined;
  Peminjaman: undefined;
};

export type RootTabParamList = MainTabParamList;

// ── Stacks ────────────────────────────────────────────────────────────────────

const ChatStack = createNativeStackNavigator<ChatStackParamList>();
function ChatNavigator() {
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1A1A1A' },
        headerTintColor: '#FFE500',
        headerTitleStyle: { fontWeight: '700', color: '#fff' },
      }}
    >
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Pesan WhatsApp' }} />
      <ChatStack.Screen name="ChatDetail" component={ChatDetailScreen} options={({ route }) => ({ title: route.params.nama })} />
    </ChatStack.Navigator>
  );
}

const EventsStack = createNativeStackNavigator<EventsStackParamList>();
function EventsNavigator() {
  return (
    <EventsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1A1A1A' },
        headerTintColor: '#FFE500',
        headerTitleStyle: { fontWeight: '700', color: '#fff' },
      }}
    >
      <EventsStack.Screen name="EventsList" component={EventsScreen} options={{ title: 'Events' }} />
      <EventsStack.Screen name="EventDetail" component={EventDetailScreen} options={({ route }) => ({ title: route.params.title })} />
    </EventsStack.Navigator>
  );
}

// ── Root stack (wraps tabs + extra screens) ───────────────────────────────────

type RootStackParamList = {
  Tabs: undefined;
  Garansi: undefined;
  Service: undefined;
  ExpenseClaims: undefined;
  Peminjaman: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, icon, focused }: { label: string; icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1A1A1A' },
        headerTintColor: '#FFE500',
        headerTitleStyle: { fontWeight: '700', color: '#fff' },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#EEF0F2', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#FFE500',
        tabBarInactiveTintColor: '#9aa0a6',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon label="Home" icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          title: 'Chat WA',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon label="Chat" icon="💬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsNavigator}
        options={{
          title: 'Events',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon label="Events" icon="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Claims"
        component={ClaimsScreen}
        options={{
          title: 'Klaim',
          tabBarIcon: ({ focused }) => <TabIcon label="Klaim" icon="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon label="Profil" icon="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1A1A1A' },
        headerTintColor: '#FFE500',
        headerTitleStyle: { fontWeight: '700', color: '#fff' },
      }}
    >
      <RootStack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <RootStack.Screen name="Garansi" component={GaransiScreen} options={{ title: 'Garansi' }} />
      <RootStack.Screen name="Service" component={ServiceScreen} options={{ title: 'Service' }} />
      <RootStack.Screen name="ExpenseClaims" component={ExpenseClaimsScreen} options={{ title: 'Klaim Biaya' }} />
      <RootStack.Screen name="Peminjaman" component={PeminjamanScreen} options={{ title: 'Peminjaman Barang' }} />
    </RootStack.Navigator>
  );
}

// ── Auth navigator ────────────────────────────────────────────────────────────

type AuthStackParamList = { Login: undefined };
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { isLoggedIn } = useAuth();
  return (
    <NavigationContainer>
      {isLoggedIn ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
