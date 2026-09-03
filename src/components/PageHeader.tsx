import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';

type PageHeaderProps = { eyebrow?: string; title: string; actionIcon?: keyof typeof Feather.glyphMap; actionLabel?: string; onAction?: () => void };

export function PageHeader({ eyebrow, title, actionIcon, actionLabel, onAction }: PageHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionIcon && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel} style={styles.action}>
          <Feather name={actionIcon} color={colors.ink} size={21} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  copy: { flex: 1 },
  eyebrow: { color: colors.coral, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  title: { color: colors.ink, fontSize: 29, lineHeight: 34, fontWeight: '800', letterSpacing: -0.9 },
  action: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
});
