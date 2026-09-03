import AsyncStorage from '@react-native-async-storage/async-storage';

// Web fallback. Metro resolves authStorage.native.ts on iOS and Android.
export const authStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

