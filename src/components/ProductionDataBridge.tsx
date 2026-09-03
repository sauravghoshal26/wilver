import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { productionRepository } from '@/src/data/productionRepository';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

export function ProductionDataBridge() {
  const userId = useAppStore((state) => state.sessionUserId);
  const applySnapshot = useAppStore((state) => state.applyProductionSnapshot);
  const setDataLoading = useAppStore((state) => state.setDataLoading);
  const setDataError = useAppStore((state) => state.setDataError);

  const query = useQuery({
    queryKey: ['production-snapshot', userId],
    queryFn: () => productionRepository.bootstrapProductionSnapshot(userId!),
    enabled: Boolean(userId),
  });
  const refetch = query.refetch;

  useEffect(() => { setDataLoading(query.isLoading || query.isFetching); }, [query.isFetching, query.isLoading, setDataLoading]);
  useEffect(() => { if (query.data) applySnapshot(query.data); }, [applySnapshot, query.data]);
  useEffect(() => { setDataError(query.error instanceof Error ? query.error.message : null); }, [query.error, setDataError]);

  useEffect(() => {
    if (!userId) return;
    let unsubscribe: (() => void) | undefined;
    void productionRepository.subscribeToProductionChanges(userId, () => { void refetch(); }).then((cleanup) => { unsubscribe = cleanup; });
    return () => unsubscribe?.();
  }, [refetch, userId]);

  if (!userId || !query.error || !query.data) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerText}>You’re offline. Showing your last loaded Wilver.</Text>
      <Pressable onPress={() => { void refetch(); }} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', zIndex: 100, top: 52, left: 14, right: 14, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink, borderRadius: radii.md, paddingHorizontal: 13, paddingVertical: 9 },
  bannerText: { flex: 1, color: colors.white, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  retry: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.white },
  retryText: { color: colors.green, fontSize: 9, fontWeight: '900' },
});
