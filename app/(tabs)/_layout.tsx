import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { colors } from '@/src/theme';
import { useAppStore } from '@/src/store/useAppStore';

const icons: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'home', discover: 'compass', create: 'plus', messages: 'message-circle', profile: 'user',
};

export default function TabsLayout() {
  const unread = useAppStore((state) => state.conversations.reduce((total, conversation) => total + conversation.unread, 0));
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.green,
      tabBarInactiveTintColor: colors.inkSoft,
      tabBarLabelStyle: styles.label,
      tabBarStyle: styles.bar,
      tabBarItemStyle: styles.item,
      tabBarIcon: ({ color, focused }) => route.name === 'create'
        ? <LinearGradient colors={['#7758FF', '#A855F7', '#FF5C7A']} style={styles.createButton}><Feather name="plus" color={colors.white} size={25} /></LinearGradient>
        : <Feather name={icons[route.name] ?? 'circle'} color={color} size={focused ? 23 : 22} strokeWidth={focused ? 2.6 : 2} />,
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarBadge: unread || undefined, tabBarBadgeStyle: styles.badge }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { height: Platform.OS === 'ios' ? 90 : 74, paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 22 : 10, backgroundColor: 'rgba(255,255,255,0.98)', borderTopColor: colors.line, shadowColor: colors.green, shadowOffset: { width: 0, height: -7 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 10 },
  item: { paddingTop: 1 },
  label: { fontSize: 10, fontWeight: '700' },
  createButton: { width: 50, height: 50, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginTop: -19, shadowColor: colors.green, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.3, shadowRadius: 13, elevation: 7, borderWidth: 3, borderColor: colors.white },
  badge: { backgroundColor: colors.coral, fontSize: 9, minWidth: 17, height: 17, lineHeight: 17 },
});
