import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/src/theme';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  back?: boolean;
  right?: ReactNode;
};

export function ScreenHeader({ title, subtitle, eyebrow, back = true, right }: Props) {
  return (
    <View style={styles.row}>
      {back && (
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" color={colors.ink} size={21} />
        </Pressable>
      )}
      <View style={styles.copy}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  eyebrow: { color: colors.coralDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 2 },
  title: { color: colors.ink, ...typography.title },
  subtitle: { color: colors.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
});
