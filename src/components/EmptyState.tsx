import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { colors, radii } from '@/src/theme';

export function EmptyState({ icon, title, body, actionLabel, onAction }: { icon: keyof typeof Feather.glyphMap; title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}><Feather name={icon} size={23} color={colors.green} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: 28, backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  icon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 12 },
  body: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5, maxWidth: 280 },
  action: { minHeight: 44, marginTop: 16, paddingHorizontal: 18 },
});
