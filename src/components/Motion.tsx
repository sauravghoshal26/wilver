import { PropsWithChildren, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';

type FadeInViewProps = PropsWithChildren<{
  delay?: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function FadeInView({ children, delay = 0, offset = 12, style }: FadeInViewProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(offset));

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted) return;
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 360, delay, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, delay, damping: 18, stiffness: 145, mass: 0.8, useNativeDriver: false }),
      ]).start();
    });
    return () => { mounted = false; };
  }, [delay, offset, opacity, translateY]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

type MotionPressableProps = PropsWithChildren<{
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
  disabled?: boolean;
  testID?: string;
}>;

export function MotionPressable({
  children,
  onPress,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
  disabled,
  testID,
}: MotionPressableProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const animate = (value: number) => Animated.spring(scale, {
    toValue: value,
    damping: 18,
    stiffness: 280,
    mass: 0.55,
    useNativeDriver: false,
  }).start();

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        testID={testID}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        style={{ flex: 1 }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function PulseRing({ style }: { style?: StyleProp<ViewStyle> }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(progress, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    }));
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.5] }) }],
        },
      ]}
    />
  );
}
