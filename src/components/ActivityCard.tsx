import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/Avatar';
import { colors, radii } from '@/src/theme';
import { Activity } from '@/src/types/models';

export function ActivityCard({ activity, joined, onJoin, onOpen }: { activity: Activity; joined: boolean; onJoin: () => void; onOpen?: () => void }) {
  return (
    <View style={[styles.card, { backgroundColor: activity.accent }]}>
      <View style={styles.top}>
        <View style={styles.type}><Text style={styles.typeText}>{activity.type}</Text></View>
        <Text style={styles.date}>{activity.dateLabel}</Text>
      </View>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`View ${activity.title}`}>
        <Text style={styles.title}>{activity.title}</Text>
        <View style={styles.location}><Feather name="map-pin" color={colors.inkMuted} size={14} /><Text style={styles.locationText}>{activity.locationLabel} · approximate area</Text><Feather name="arrow-up-right" color={colors.green} size={14} /></View>
      </Pressable>
      <View style={styles.bottom}>
        <View style={styles.host}><Avatar uri={activity.host.avatarUrl} size={28} verified={activity.host.verified} /><Text style={styles.people}>{activity.attendees}/{activity.capacity} going</Text></View>
        <Pressable onPress={onJoin} style={[styles.join, joined && styles.joined]} accessibilityRole="button">
          <Text style={[styles.joinText, joined && styles.joinedText]}>{joined ? 'Joined' : 'Join'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 264, padding: 17, borderRadius: radii.lg, marginRight: 12, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.72)' },
  typeText: { color: colors.greenDark, fontSize: 11, fontWeight: '800' },
  date: { color: colors.inkMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  title: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 8 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { color: colors.inkMuted, fontSize: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  host: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  people: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  join: { minWidth: 62, paddingVertical: 9, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: colors.green, alignItems: 'center' },
  joined: { backgroundColor: colors.white },
  joinText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  joinedText: { color: colors.green },
});
