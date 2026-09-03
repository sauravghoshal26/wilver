import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Href, router } from 'expo-router';
import { Platform } from 'react-native';

import { customerDataError } from '@/src/lib/customerErrors';
import { supabase } from '@/src/lib/supabase';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const safeRoutes = [/^\/notifications$/, /^\/lost-found$/, /^\/connections$/, /^\/post\/[0-9a-f-]+$/i, /^\/chat\/[0-9a-f-]+$/i, /^\/activities\/[0-9a-f-]+$/i];

export function isSafeNotificationRoute(value: unknown): value is Href {
  return typeof value === 'string' && safeRoutes.some((pattern) => pattern.test(value));
}

export async function getPushPermissionStatus() {
  if (Platform.OS === 'web') return 'unsupported' as const;
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted ? 'enabled' as const : settings.canAskAgain ? 'available' as const : 'blocked' as const;
}

export async function enablePushNotifications() {
  if (Platform.OS === 'web') throw new Error('Push registration is currently available in the iOS and Android apps.');
  if (!Device.isDevice) throw new Error('Remote push notifications require a physical device.');
  if (!supabase) throw new Error('Notifications are temporarily unavailable.');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('community', {
      name: 'Community updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#236B5B',
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are disabled. Enable them for Wilver in system settings.');

  const projectId = Constants.easConfig?.projectId
    ?? (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
    ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) throw new Error('Notifications are not available in this preview build yet.');

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc('register_device_token', { push_token: token, device_platform: Platform.OS });
  if (error) throw new Error(customerDataError(error, 'We couldn’t enable notifications. Please try again.'));
  return token;
}

export async function disablePushNotificationsForThisDevice() {
  if (Platform.OS === 'web' || !supabase || !Device.isDevice) return;
  const projectId = Constants.easConfig?.projectId
    ?? (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
    ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await supabase.rpc('disable_my_device_token', { push_token: token });
}

export function listenForNotificationNavigation() {
  if (Platform.OS === 'web') return () => undefined;
  const open = (data: Record<string, unknown> | undefined) => {
    const route = data?.route;
    if (isSafeNotificationRoute(route)) router.push(route);
    else router.push('/notifications');
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) open(last.notification.request.content.data);
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => open(response.notification.request.content.data));
  return () => subscription.remove();
}
