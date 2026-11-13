import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Button, Footer } from './components/UI';
import { pageEnter } from './components/motion';
import NotificationBanner from './components/NotificationBanner';
import AssessmentScreen from './screens/Assessment';
import HomeScreen from './screens/HomeScreen';
import LearningScreen from './screens/LearningScreen';
import { MarketScreen } from './screens/MarketScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import { contentVersion, lessonAvailable } from './progress';
import type { LessonId, LessonResult } from './domain';
import { useStudy } from './hooks/useStudy';
import { shareStudyData } from './services/export';
import { colors, styles } from './styles';

export default function App() {
  const { height } = useWindowDimensions();
  return (
    <GestureHandlerRootView
      style={
        Platform.OS === 'web'
          ? { height, width: '100%', backgroundColor: colors.cream }
          : styles.root
      }
    >
      <SafeAreaProvider>
        <Sprout />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Sprout() {
  const study = useStudy();
  const { session, progress, loading, busy, error, syncMessage } = study;
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const scrollContent = useRef<ComponentRef<typeof View>>(null);
  const enteredAt = useRef(Date.now());

  function showFeedback(target: ComponentRef<typeof View> | null) {
    if (!target || !scrollContent.current) return;
    target.measureLayout(
      scrollContent.current,
      (_x, y) => {
        scroll.current?.scrollTo({ y: Math.max(0, y - 16), animated: false });
      },
      () => {},
    );
  }

  useEffect(() => {
    enteredAt.current = Date.now();
    scroll.current?.scrollTo({ y: 0, animated: false });
    study.event('screen_entered', { screen: progress.screen, lessonId: progress.activeLesson });
    return () => {
      study.event('screen_exited', {
        screen: progress.screen,
        durationMs: Date.now() - enteredAt.current,
      });
    };
  }, [progress.screen, progress.activeLesson, study.event]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  function reset() {
    const message =
      'Start a new learning session? Previous study records are preserved, and your practice portfolio starts fresh.';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) void study.reset();
    } else
      Alert.alert('Start fresh?', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset progress',
          style: 'destructive',
          onPress: () => {
            void study.reset();
          },
        },
      ]);
  }

  function learn(id: LessonId) {
    if (!lessonAvailable(progress, id)) {
      setNotice('Complete lesson 1 to unlock lesson 2.');
      return;
    }
    study.event('lesson_started', { lessonId: id, review: Boolean(progress.lessons[id]) });
    void study.save({ screen: 'learn', activeLesson: id });
  }

  function finish(id: LessonId, result: LessonResult) {
    if (progress.lessons[id]) {
      const lessonDrafts = { ...progress.lessonDrafts };
      delete lessonDrafts[id];
      study.event('lesson_review_completed', { lessonId: id });
      void study.save({ screen: 'market', activeLesson: id, practiceLesson: id, lessonDrafts });
    } else void study.finish(id, { ...result, contentVersion });
  }

  async function exportData() {
    if (exporting) return;
    setExporting(true);
    try {
      if (!(await study.sync()))
        throw new Error('Reconnect to sync all responses before exporting.');
      await shareStudyData();
      setNotice('Study data exported.');
    } catch (cause) {
      setNotice(
        cause instanceof Error ? cause.message : 'Export needs a connection. Please try again.',
      );
    } finally {
      setExporting(false);
    }
  }

  if (loading)
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.green} />
        <Text style={styles.body}>Opening your learning space…</Text>
      </SafeAreaView>
    );
  if (!session)
    return (
      <SafeAreaView style={[styles.root, styles.centered]}>
        <Text style={styles.brand}>♧ sprout</Text>
        <Text style={styles.heading}>Let’s get connected.</Text>
        {Boolean(error) && <Text style={styles.small}>{error}</Text>}
        <Button
          title="Try again"
          onPress={() => {
            void study.load();
          }}
        />
      </SafeAreaView>
    );

  function screen() {
    switch (progress.screen) {
      case 'welcome':
        return (
          <>
            <View style={styles.hero}>
              <Text style={styles.plant}>🌱</Text>
              <Text style={styles.eyebrow}>Small lessons. Real understanding.</Text>
            </View>
            <Text style={styles.title}>Grow your investing knowledge.</Text>
            <Text style={styles.body}>
              Learn investing. Practice with virtual money and real market prices.
            </Text>
            <View style={styles.card}>
              <Text style={styles.heading}>Learn → Apply → Reflect</Text>
              <Text style={styles.small}>
                Your answers and practice activity are saved under an anonymous study code.
              </Text>
            </View>
            <Footer>
              <Button
                title="Begin Onboarding Quiz"
                onPress={() => {
                  study.event('study_started');
                  void study.save({ screen: 'onboarding' });
                }}
                disabled={busy}
              />
              <Text style={styles.small}>Virtual money only. No real-money trades.</Text>
            </Footer>
          </>
        );
      case 'onboarding':
        return (
          <AssessmentScreen
            onStepChange={() => scroll.current?.scrollTo({ y: 0, animated: false })}
            busy={busy}
            onEvent={study.event}
            onComplete={(assessment) => {
              const baseline = { ...assessment, contentVersion };
              study.event('onboarding_completed', { assessment: baseline });
              void study.save({
                assessment: baseline,
                activeLesson: 'ownership',
                screen: 'home',
              });
            }}
          />
        );
      case 'home':
        return (
          <HomeScreen
            sessionId={session!.id}
            progress={progress}
            busy={busy || exporting}
            onLearn={learn}
            onPortfolio={() => {
              void study.save({ screen: 'portfolio', practiceLesson: null });
            }}
            onExport={() => {
              void exportData();
            }}
          />
        );
      case 'learn':
        return (
          <LearningScreen
            onFeedbackShown={showFeedback}
            onStepChange={() => scroll.current?.scrollTo({ y: 0, animated: false })}
            key={`${session!.id}-${progress.activeLesson}`}
            draft={progress.lessonDrafts?.[progress.activeLesson]}
            onDraftChange={(draft) => study.saveDraft(progress.activeLesson, draft)}
            lessonId={progress.activeLesson}
            busy={busy}
            onComplete={(result) => finish(progress.activeLesson, result)}
            onExit={() => {
              void study.save({ screen: 'home' });
            }}
            onEvent={(type, payload) =>
              study.event(type, {
                ...payload,
                lessonId: progress.activeLesson,
                review: Boolean(progress.lessons[progress.activeLesson]),
              })
            }
          />
        );
      case 'market':
        if (!progress.practiceLesson) return null;
        return (
          <MarketScreen
            key={`${session!.id}-${progress.practiceLesson || 'practice'}`}
            sessionId={session!.id}
            lessonId={progress.practiceLesson}
            onNextLesson={() => learn('diversification')}
            onPreviousLesson={() => learn('ownership')}
            onViewPortfolio={() => {
              void study.save({ screen: 'portfolio', practiceLesson: null });
            }}
            onBack={() => {
              void study.save({ screen: 'home', practiceLesson: null });
            }}
            onEvent={study.event}
            onReceiptShown={showFeedback}
          />
        );
      case 'portfolio':
        return (
          <PortfolioScreen
            sessionId={session!.id}
            onBack={() => {
              void study.save({ screen: 'home' });
            }}
          />
        );
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View ref={scrollContent} collapsable={false} style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sprout home"
              disabled={busy || !progress.assessment}
              onPress={() => {
                void study.save({ screen: 'home', practiceLesson: null });
              }}
            >
              <Text style={styles.brand}>♧ sprout</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={reset} hitSlop={8}>
              <Text style={styles.link}>Reset prototype</Text>
            </Pressable>
          </View>
          {Boolean(syncMessage) && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void study.sync();
              }}
            >
              <Text style={styles.small}>{syncMessage} Tap to retry.</Text>
            </Pressable>
          )}
          {Boolean(error) && (
            <View style={[styles.softCard, styles.incorrectCard]} accessibilityLiveRegion="polite">
              <Text style={styles.body}>{error}</Text>
            </View>
          )}
          <Animated.View
            key={`${progress.screen}-${progress.activeLesson}`}
            entering={pageEnter}
            style={styles.screen}
          >
            {screen()}
          </Animated.View>
          {(busy || exporting) && (
            <Text style={styles.small} accessibilityLiveRegion="polite">
              {exporting ? 'Preparing your study export…' : 'Saving progress…'}
            </Text>
          )}
        </View>
      </ScrollView>
      <NotificationBanner message={notice} onDismiss={() => setNotice(null)} />
    </SafeAreaView>
  );
}
