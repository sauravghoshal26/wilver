import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '@/src/theme';

function localInputValue(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function DateTimeField({ value, onChange, minimumDate, label }: { value: Date; onChange: (value: Date) => void; minimumDate?: Date; label: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>{label.toUpperCase()}</Text>
      {createElement('input', {
        'aria-label': label,
        type: 'datetime-local',
        value: localInputValue(value),
        min: minimumDate ? localInputValue(minimumDate) : undefined,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          const next = new Date(event.target.value);
          if (!Number.isNaN(next.getTime())) onChange(next);
        },
        style: {
          width: '100%', boxSizing: 'border-box', border: 0, outline: 'none', color: colors.ink,
          backgroundColor: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 9, minHeight: 58, justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, paddingHorizontal: 12 },
  caption: { color: colors.inkMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7, marginBottom: 5 },
});
