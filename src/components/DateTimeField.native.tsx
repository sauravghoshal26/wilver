import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '@/src/theme';

type PickerMode = 'date' | 'time';

export function DateTimeField({ value, onChange, minimumDate, label }: { value: Date; onChange: (value: Date) => void; minimumDate?: Date; label: string }) {
  const [mode, setMode] = useState<PickerMode | null>(null);
  const update = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setMode(null);
    if (event.type !== 'dismissed' && next) onChange(next);
  };

  return (
    <View>
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()} date`} onPress={() => setMode('date')} style={styles.control}>
          <Feather name="calendar" size={16} color={colors.coral} />
          <View><Text style={styles.caption}>DATE</Text><Text style={styles.value}>{value.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()} time`} onPress={() => setMode('time')} style={styles.control}>
          <Feather name="clock" size={16} color={colors.green} />
          <View><Text style={styles.caption}>TIME</Text><Text style={styles.value}>{value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text></View>
        </Pressable>
      </View>
      {mode && <View style={styles.pickerWrap}><DateTimePicker value={value} mode={mode} minimumDate={minimumDate} onChange={update} display={Platform.OS === 'ios' ? 'spinner' : 'default'} /><Pressable onPress={() => setMode(null)} style={styles.done}><Text style={styles.doneText}>Done</Text></Pressable></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', gap: 8, paddingVertical: 9 },
  control: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, borderRadius: radii.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  caption: { color: colors.inkMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  value: { color: colors.ink, fontSize: 11, fontWeight: '700', marginTop: 2 },
  pickerWrap: { alignItems: 'flex-end', paddingBottom: 8 },
  done: { minWidth: 64, alignItems: 'center', paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.greenSoft },
  doneText: { color: colors.green, fontSize: 11, fontWeight: '900' },
});
