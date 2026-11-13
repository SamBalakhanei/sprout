import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { lessons, lessonXP } from '../content';
import type { LearnerProgress, LessonId, Portfolio } from '../domain';
import { learningSummary, lessonAvailable, streak } from '../progress';
import { getPortfolio } from '../services/market';
import { styles } from '../styles';
import { Button } from '../components/UI';

const ids: LessonId[] = ['ownership', 'diversification'];
const money = (value: number) => `$${value.toFixed(2)}`;

export default function HomeScreen({
  sessionId,
  progress,
  onLearn,
  onPortfolio,
  onExport,
  busy,
}: {
  sessionId: string;
  progress: LearnerProgress;
  onLearn: (id: LessonId) => void;
  onPortfolio: () => void;
  onExport: () => void;
  busy: boolean;
}) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioError, setPortfolioError] = useState(false);
  useEffect(() => {
    let active = true;
    getPortfolio(sessionId)
      .then((value) => {
        if (active) setPortfolio(value);
      })
      .catch(() => {
        if (active) setPortfolioError(true);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);
  const completed = ids.filter((id) => progress.lessons[id]);
  const next = ids.find((id) => !completed.includes(id) && lessonAvailable(progress, id));
  const lastDay =
    completed
      .map((id) => progress.lessons[id]!.completedOn)
      .sort()
      .at(-1) || null;

  return (
    <>
      <Text style={styles.eyebrow}>Your money, understood</Text>
      <Text style={styles.title}>
        {completed.length === 2
          ? 'Look how far you’ve grown.'
          : 'A little learning. A little confidence.'}
      </Text>
      <View style={styles.row}>
        <Text style={styles.badge}>Level {completed.length === 2 ? 2 : 1}</Text>
        <Text style={styles.badge}>⚡ {completed.length * lessonXP} XP</Text>
        <Text style={styles.badge}>🔥 {streak(lastDay)}-day streak</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.heading}>Your learning path</Text>
        <Text style={styles.small}>{completed.length}/2 complete</Text>
      </View>
      {ids.map((id, index) => {
        const lesson = lessons[id];
        const result = progress.lessons[id];
        const locked = !lessonAvailable(progress, id);
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || locked }}
            disabled={busy || locked}
            onPress={() => onLearn(id)}
            style={({ pressed }) => [
              styles.card,
              next === id && styles.selected,
              locked && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.detailRow}>
              <Text style={styles.eyebrow}>
                {locked
                  ? 'Complete lesson 1 to unlock'
                  : result
                    ? '✓ Completed'
                    : next === id
                      ? 'Recommended next'
                      : `Lesson ${index + 1}`}
              </Text>
              <Text style={styles.small}>{lesson.duration}</Text>
            </View>
            <Text style={styles.heading}>{lesson.title}</Text>
            {!locked && (
              <Text style={styles.takeaway}>
                {result
                  ? 'Review lesson →'
                  : progress.lessonDrafts?.[id]
                    ? 'Resume lesson →'
                    : 'Start lesson →'}
              </Text>
            )}
          </Pressable>
        );
      })}
      <View style={styles.greenCard}>
        <Text style={[styles.eyebrow, styles.white]}>Your portfolio</Text>
        <Text style={[styles.money, styles.white]}>
          {portfolio?.valuationComplete ? money(portfolio.totalValue) : 'Your practice portfolio'}
        </Text>
        <Text style={[styles.small, styles.white]}>
          {portfolio
            ? `${money(portfolio.cash)} virtual cash · ${portfolio.holdings.length} holdings`
            : portfolioError
              ? 'Connect to view your saved portfolio.'
              : 'Loading your saved balance…'}
        </Text>
      </View>
      <Button title="View portfolio" onPress={onPortfolio} disabled={busy} />
      {completed.length > 0 && (
        <View style={styles.stack}>
          <Text style={styles.heading}>Understanding & confidence</Text>
          {completed.map((id) => {
            const result = progress.lessons[id]!;
            const summary = learningSummary(progress.assessment!, id, result);
            return (
              <View key={id} style={styles.card}>
                <Text style={styles.heading}>{lessons[id].title}</Text>
                <Text style={styles.body}>
                  Knowledge: {summary.before}/2 → {summary.after}/2
                </Text>
                <Text style={styles.body}>
                  Confidence: {progress.assessment!.confidence[id]}/5 → {result.confidence}/5
                </Text>
                <Text style={styles.small}>
                  First checks: {summary.checks}/3 · Reasoning:{' '}
                  {summary.reasoning ? 'correct' : 'review needed'} · New scenario:{' '}
                  {summary.transfer ? 'correct' : 'review needed'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      <Pressable accessibilityRole="button" onPress={onExport} disabled={busy}>
        <Text style={styles.link}>Export this device’s study data (CSV)</Text>
      </Pressable>
      <Text selectable style={styles.small}>
        Study code: {sessionId.slice(0, 8)}
      </Text>
    </>
  );
}
