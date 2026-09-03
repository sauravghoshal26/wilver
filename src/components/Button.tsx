import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';

import { colors, radii } from '@/src/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'coral';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const animate = (toValue: number) => Animated.spring(scale, { toValue, damping: 17, stiffness: 320, mass: 0.55, useNativeDriver: true }).start();
  const content = loading ? <ActivityIndicator color={variant === 'secondary' ? colors.green : colors.white} /> : (
    <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel, variant === 'ghost' && styles.ghostLabel]}>{label}</Text>
  );
  return (
    <Animated.View style={[style, { transform: [{ scale }] }, disabled && styles.disabled]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled || loading} onPress={onPress} onPressIn={() => animate(0.965)} onPressOut={() => animate(1)} style={[styles.base, styles[variant]]}>
        {variant === 'primary' ? <LinearGradient colors={['#7758FF', '#A855F7', '#FF5C7A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>{content}</LinearGradient> : content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: colors.green, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 4 },
  gradient: { minHeight: 56, alignSelf: 'stretch', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.green },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent' },
  coral: { backgroundColor: colors.coral },
  label: { color: colors.white, fontSize: 15, fontWeight: '800', letterSpacing: -0.1 },
  secondaryLabel: { color: colors.green },
  ghostLabel: { color: colors.green },
  disabled: { opacity: 0.45 },
});
