import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { noticeEnter, noticeExit } from './motion';
import { styles } from '../styles';

export default function NotificationBanner({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const gesture = usePanGesture({
    activeOffsetY: -8,
    failOffsetX: [-30, 30],
    runOnJS: true,
    onDeactivate: (event) => {
      if (!event.canceled && (event.translationY < -24 || event.velocityY < -300)) onDismiss();
    },
  });
  return (
    <View pointerEvents="box-none" style={[styles.noticeLayer, { top: insets.top + 8 }]}>
      <GestureDetector gesture={gesture} touchAction="none">
        <View collapsable={false} style={styles.noticeSlot}>
          {message && (
            <Animated.View
              entering={noticeEnter}
              exiting={noticeExit}
              style={styles.notice}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              accessibilityHint="Swipe up to dismiss"
              accessibilityActions={[{ name: 'dismiss', label: 'Dismiss notification' }]}
              onAccessibilityAction={onDismiss}
              onAccessibilityEscape={onDismiss}
            >
              <Text style={styles.noticeIcon}>🌱</Text>
              <View style={styles.noticeContent}>
                <Text style={styles.eyebrow}>Sprout · Now</Text>
                <Text style={styles.noticeTitle}>{message}</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </GestureDetector>
    </View>
  );
}
