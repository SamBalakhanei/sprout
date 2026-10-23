import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Footer, Options, ProgressBar } from '../components/UI';
import { placementQuestions, reflectionQuestions } from '../content';
import { Assessment as AssessmentResult } from '../progress';
import { styles } from '../styles';

export default function Assessment({
  after = false,
  busy,
  onComplete,
}: {
  after?: boolean;
  busy: boolean;
  onComplete: (result: AssessmentResult) => void;
}) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const questions = after ? reflectionQuestions : placementQuestions;
  const confidenceStep = answers.length === questions.length;

  function next() {
    if (selected === null) return;
    if (confidenceStep) {
      onComplete({ answers, confidence: selected + 1 });
    } else {
      setAnswers([...answers, selected]);
      setSelected(null);
    }
  }

  return (
    <>
      <Text style={styles.eyebrow}>
        {after ? 'Look how far you’ve grown' : 'Your starting point'} · {answers.length + 1} of 3
      </Text>
      <ProgressBar value={(answers.length + 1) / 3} />
      <Text style={styles.title}>
        {confidenceStep
          ? 'How confident do you feel about understanding stocks?'
          : questions[answers.length].title}
      </Text>
      <Text style={styles.body}>
        {confidenceStep
          ? 'Use the same scale before and after learning.'
          : after
            ? 'Let’s try a fresh example of what you learned.'
            : 'No pressure. “I’m not sure yet” is a great place to start.'}
      </Text>
      <Options
        selected={selected}
        onSelect={setSelected}
        disabled={busy}
        options={
          confidenceStep
            ? [
                '1 · Not confident yet',
                '2 · A little confident',
                '3 · Somewhat confident',
                '4 · Confident',
                '5 · Very confident',
              ]
            : questions[answers.length].options
        }
      />
      {confidenceStep && (
        <View style={styles.softCard}>
          <Text style={styles.small}>
            Your honest answer helps us understand whether this lesson helped.
          </Text>
        </View>
      )}
      <Footer>
        <Button
          title={
            confidenceStep ? (after ? 'See my progress' : 'Find my starting point') : 'Continue'
          }
          onPress={next}
          disabled={selected === null || busy}
        />
      </Footer>
    </>
  );
}
