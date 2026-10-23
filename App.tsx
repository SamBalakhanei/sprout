import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button, Footer } from './components/UI';
import { lessonReward, lessonXP, placementQuestions, reflectionQuestions } from './content';
import { initialProgress, localDate, Progress, score, streak } from './progress';
import Assessment from './screens/Assessment';
import { Lesson, LessonCheck } from './screens/Lesson';
import { money, Practice, TradeResult } from './screens/Practice';
import { progressStorage } from './storage';
import { colors, styles } from './styles';

export default function App() {
  return (
    <SafeAreaProvider>
      <Sprout />
    </SafeAreaProvider>
  );
}

function Sprout() {
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const scroll = useRef<ScrollViewInstance>(null);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      setProgress(await progressStorage.load());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [progress.stage]);

  async function update(changes: Partial<Progress>) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    const next = { ...progress, ...changes };
    try {
      await progressStorage.save(next);
      setProgress(next);
      setLoadError(false);
    } catch {
      Alert.alert('Couldn’t save progress', 'Your progress has not changed. Please try again.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function reset() {
    // React Native Web does not implement Alert.alert.
    if (Platform.OS === 'web') {
      if (window.confirm('Reset your quiz answers, lesson progress, and practice trade?')) {
        void update(initialProgress);
      }
      return;
    }
    Alert.alert(
      'Start fresh?',
      'This clears your quiz answers, lesson progress, and practice trade on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset prototype',
          style: 'destructive',
          onPress: () => {
            void update(initialProgress);
          },
        },
      ],
    );
  }

  if (loading)
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.green} />
        <Text style={styles.body}>Getting your garden ready…</Text>
      </SafeAreaView>
    );
  if (loadError)
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.heading}>We couldn’t open your saved progress.</Text>
        <Text style={styles.body}>Try again, or reset this prototype to start fresh.</Text>
        <Button
          title="Try again"
          onPress={() => {
            void load();
          }}
        />
        <Button title="Reset prototype" onPress={reset} disabled={busy} />
      </SafeAreaView>
    );

  const beforeScore = progress.before
    ? score(
        progress.before.answers,
        placementQuestions.map((question) => question.answer),
      )
    : 0;
  const afterScore = progress.after
    ? score(
        progress.after.answers,
        reflectionQuestions.map((question) => question.answer),
      )
    : 0;
  const dayStreak = streak(progress.completedOn);
  const advance = (stage: Progress['stage']) => {
    void update({ stage });
  };

  function renderScreen() {
    switch (progress.stage) {
      case 'welcome':
        return (
          <>
            <View style={styles.hero}>
              <Text style={styles.plant}>🌱</Text>
              <Text style={styles.eyebrow}>Small lessons. Real understanding.</Text>
            </View>
            <Text style={styles.title}>Grow your investing knowledge.</Text>
            <Text style={styles.body}>
              Learn one small idea. Put it into practice. Build a little confidence along the way.
            </Text>
            <View style={styles.card}>
              <Text style={styles.heading}>Your first five minutes</Text>
              <Text style={styles.body}>01 Find your starting point</Text>
              <Text style={styles.body}>02 Learn what a stock is</Text>
              <Text style={styles.body}>03 Make a practice trade</Text>
            </View>
            <Footer>
              <Button title="Let’s grow" onPress={() => advance('onboarding')} disabled={busy} />
              <Text style={styles.small}>
                Education + simulation only. No real money. No investment advice or promised
                returns.
              </Text>
            </Footer>
          </>
        );
      case 'onboarding':
        return (
          <Assessment
            busy={busy}
            onComplete={(before) => {
              void update({ before, stage: 'placement' });
            }}
          />
        );
      case 'placement':
        return (
          <>
            <Text style={styles.eyebrow}>Your path / Beginner foundations</Text>
            <Text style={styles.title}>Your first little step.</Text>
            <Text style={styles.body}>
              {beforeScore === 0
                ? 'Let’s start with the basics. No experience needed.'
                : beforeScore === 1
                  ? 'You have a seed of knowledge. Let’s build a clearer picture.'
                  : 'You know the basics already. This short refresher will help you put them into practice.'}
            </Text>
            <View style={styles.softCard}>
              <Text style={styles.heading}>{beforeScore}/2 starting questions correct</Text>
              <Text style={styles.body}>
                Your starting confidence: {progress.before?.confidence}/5
              </Text>
              <Text style={styles.small}>
                This prototype has one lesson. Your quiz changes this recommendation, and everyone
                tries the same foundations lesson.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.badge}>01 · Ready to grow</Text>
              <Text style={styles.heading}>What is a stock?</Text>
              <Text style={styles.body}>
                A little bakery, a small ownership stake, and your first practice trade.
              </Text>
              <Text style={styles.small}>About 3 minutes · Earn $1,000 virtual + 120 XP</Text>
            </View>
            <Footer>
              <Button title="Start lesson 1" onPress={() => advance('lesson')} disabled={busy} />
            </Footer>
          </>
        );
      case 'lesson':
        return <Lesson busy={busy} onComplete={() => advance('check')} />;
      case 'check':
        return (
          <LessonCheck
            busy={busy}
            onComplete={(checkAnswer) => {
              void update({ checkAnswer, completedOn: localDate(), stage: 'reward' });
            }}
          />
        );
      case 'reward':
        return (
          <>
            <Text style={styles.badge}>✓ Lesson complete</Text>
            <View style={styles.hero}>
              <Text style={styles.plant}>🌻</Text>
            </View>
            <Text style={styles.title}>Your first lesson. Your first seed.</Text>
            <Text style={styles.body}>
              You know what a stock is. Now put that knowledge to work in practice mode.
            </Text>
            <View style={styles.greenCard}>
              <Text style={[styles.eyebrow, styles.white]}>Play money earned</Text>
              <Text style={[styles.money, styles.white]}>+{money(lessonReward)}</Text>
              <Text style={[styles.small, styles.white]}>
                Virtual cash only. Cannot be withdrawn or cashed out.
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.badge}>⚡ +{lessonXP} XP</Text>
              <Text style={styles.badge}>🔥 {dayStreak}-day streak</Text>
            </View>
            <Footer>
              <Button
                title="Try my first practice trade"
                onPress={() => advance('trade')}
                disabled={busy}
              />
            </Footer>
          </>
        );
      case 'trade':
        return (
          <Practice
            busy={busy}
            onBuy={(tradeReason) => {
              void update({ tradeReason, stage: 'result' });
            }}
          />
        );
      case 'result':
        return (
          <TradeResult
            busy={busy}
            reason={progress.tradeReason!}
            onComplete={() => advance(progress.after ? 'done' : 'reflection')}
          />
        );
      case 'reflection':
        return (
          <Assessment
            after
            busy={busy}
            onComplete={(after) => {
              void update({ after, stage: 'done' });
            }}
          />
        );
      case 'done':
        return (
          <>
            <Text style={styles.eyebrow}>First chapter / Complete</Text>
            <Text style={styles.title}>Little steps add up.</Text>
            <View style={styles.goldCard}>
              <Text style={styles.heading}>🌱 You learned, then practiced.</Text>
              <Text style={styles.body}>
                A share means ownership. Its price can rise or fall. You tried that idea with play
                money.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.heading}>Your learning snapshot</Text>
              <Text style={styles.body}>
                Knowledge: {beforeScore}/2 before → {afterScore}/2 after
              </Text>
              <Text style={styles.body}>
                Confidence: {progress.before?.confidence}/5 before → {progress.after?.confidence}/5
                after
              </Text>
              <Text style={styles.small}>
                Two short quizzes offer a learning signal, not a formal assessment.
              </Text>
            </View>
            {afterScore < 2 && (
              <View style={styles.softCard}>
                <Text style={styles.heading}>A reminder to take with you</Text>
                <Text style={styles.body}>
                  A share is a small ownership stake in a company. The price can go down, so profit
                  is never guaranteed.
                </Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.badge}>⚡ {lessonXP} XP</Text>
              <Text style={styles.badge}>🔥 {dayStreak}-day streak</Text>
              <Text style={styles.badge}>1/1 lessons</Text>
            </View>
            <Text style={styles.body}>
              {dayStreak
                ? 'Your learning streak has started. XP comes from learning, never trading profit.'
                : 'Your lesson is saved. Your streak is currently 0 days.'}
            </Text>
            <Footer>
              <Text style={styles.small}>
                You’ve reached the end of this prototype. Use Reset to run a new learning session.
              </Text>
              <Button
                title="Review my practice trade"
                onPress={() => advance('result')}
                disabled={busy}
              />
            </Footer>
          </>
        );
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView ref={scroll} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>♧ sprout</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={reset} hitSlop={8}>
            <Text style={styles.link}>Reset prototype</Text>
          </Pressable>
        </View>
        {renderScreen()}
        {busy && (
          <Text accessibilityLiveRegion="polite" style={styles.small}>
            Saving your progress…
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
