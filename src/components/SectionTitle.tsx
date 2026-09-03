import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';

export function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action && <Pressable onPress={onPress}><Text style={styles.action}>{action}</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  action: { color: colors.green, fontSize: 14, fontWeight: '700' },
});

