import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme';

export function Toggle({ value, onValueChange, label, disabled = false }: { value: boolean; onValueChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[styles.track, value && styles.trackActive, disabled && styles.disabled]}
    >
      <View style={[styles.thumb, value && styles.thumbActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 48, height: 29, borderRadius: 15, backgroundColor: colors.lineStrong, padding: 3, justifyContent: 'center' },
  trackActive: { backgroundColor: colors.green },
  thumb: { width: 23, height: 23, borderRadius: 12, backgroundColor: colors.white, shadowColor: colors.ink, shadowOpacity: 0.16, shadowRadius: 3, elevation: 2 },
  thumbActive: { alignSelf: 'flex-end' },
  disabled: { opacity: 0.45 },
});
