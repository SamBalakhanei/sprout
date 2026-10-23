import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { popIn, reveal } from '../components/motion';
import { Button, Footer, Options, ProgressBar } from '../components/UI';
import { lessonCheck } from '../content';
import { styles } from '../styles';

export function Lesson({ onComplete, busy }: { onComplete: () => void; busy: boolean }) {
  const [owned, setOwned] = useState(false);
  return (
    <>
      <Text style={styles.eyebrow}>Foundations / Lesson 01</Text>
      <ProgressBar value={0.5} />
      <Text style={styles.title}>A stock is a little slice of a company.</Text>
      <View style={styles.hero}>
        <Text style={{ fontSize: 45 }}>🥖</Text>
        <Text style={styles.heading}>The little bakery</Text>
        <View
          style={styles.shares}
          accessibilityLabel={owned ? 'One of ten equal shares is yours' : 'Ten equal shares'}
        >
          {Array.from({ length: 10 }, (_, index) => (
            <View key={index} style={[styles.share, owned && index === 0 && styles.ownedShare]}>
              {owned && index === 0 && (
                <Animated.Text entering={popIn} style={styles.shareText}>
                  ✓
                </Animated.Text>
              )}
            </View>
          ))}
        </View>
        <Text style={styles.small}>
          {owned
            ? '1 of 10 equal shares = 10% ownership'
            : 'Imagine a bakery divided into 10 equal shares.'}
        </Text>
      </View>
      {owned ? (
        <>
          <Text style={styles.body}>
            You own one share, so you own 10% of this imaginary bakery. A share of stock works the
            same way: it represents ownership in a company.
          </Text>
          <Animated.View entering={reveal} style={styles.softCard}>
            <Text style={styles.heading}>Ownership comes with uncertainty.</Text>
            <Text style={styles.body}>
              A share’s price can rise or fall. Owning part of a company does not guarantee a
              profit, and it is not a loan the company must repay.
            </Text>
          </Animated.View>
        </>
      ) : (
        <Text style={styles.body}>
          What happens when one of those shares becomes yours? Tap below to see.
        </Text>
      )}
      <Footer>
        <Button
          title={owned ? 'Let’s try a quick check' : 'Make one share mine'}
          onPress={owned ? onComplete : () => setOwned(true)}
          disabled={busy}
        />
      </Footer>
    </>
  );
}

export function LessonCheck({
  onComplete,
  onFeedbackShown,
  busy,
}: {
  onComplete: (answer: number) => void;
  onFeedbackShown: () => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = selected === lessonCheck.answer;

  function checkAnswer() {
    if (selected === null || submitted || busy) return;
    setSubmitted(true);
    // Haptics are optional; unsupported devices must still show the feedback.
    void Haptics.notificationAsync(
      correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
  }

  return (
    <>
      <Text style={styles.eyebrow}>Lesson 01 / Check your understanding</Text>
      <ProgressBar value={1} />
      <Text style={styles.title}>{lessonCheck.title}</Text>
      <Text style={styles.body}>Choose the best answer. Mistakes are part of learning.</Text>
      <Options
        options={lessonCheck.options}
        selected={selected}
        onSelect={setSelected}
        disabled={submitted || busy}
        correctAnswer={submitted ? lessonCheck.answer : undefined}
      />
      <Footer>
        {submitted && (
          <Animated.View
            entering={reveal}
            style={[styles.softCard, !correct && styles.incorrectCard]}
            accessibilityLiveRegion="polite"
            onLayout={onFeedbackShown}
          >
            <Text style={[styles.heading, correct ? styles.correctText : styles.incorrectText]}>
              {correct ? '✓ Correct! Nicely done.' : '✕ Not quite. Let’s learn from it!'}
            </Text>
            {!correct && (
              <Text style={[styles.optionText, styles.incorrectText]}>
                Correct answer: {lessonCheck.options[lessonCheck.answer]}.
              </Text>
            )}
            <Text style={styles.body}>
              A stock is a small piece of a company. It represents ownership, not a loan or
              guaranteed profit. Its value can change.
            </Text>
          </Animated.View>
        )}
        <Button
          title={
            submitted
              ? correct
                ? 'Continue · Earn $1,000 virtual'
                : 'Got it · Finish lesson'
              : 'Check my answer'
          }
          tone={submitted && !correct ? 'error' : 'success'}
          disabled={selected === null || busy}
          onPress={() => {
            if (submitted && selected !== null) onComplete(selected);
            else checkAnswer();
          }}
        />
      </Footer>
    </>
  );
}
