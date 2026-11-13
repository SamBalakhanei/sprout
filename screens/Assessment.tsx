import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { pageEnter } from '../components/motion';
import { BackButton, Button, Footer, Options, ProgressBar } from '../components/UI';
import { onboardingQuestions } from '../content';
import type { Assessment, LessonId } from '../domain';
import { styles } from '../styles';

const scale = [
  '1 · Not confident yet',
  '2 · A little confident',
  '3 · Somewhat confident',
  '4 · Confident',
  '5 · Very confident',
];
export default function AssessmentScreen({
  onComplete,
  busy,
  onEvent,
  onStepChange,
}: {
  onComplete: (result: Assessment) => void;
  busy: boolean;
  onEvent: (type: string, payload: Record<string, unknown>) => void;
  onStepChange: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confidence, setConfidence] = useState<Partial<Record<LessonId, number>>>({});
  const [selections, setSelections] = useState<Record<number, number>>({});
  const started = useRef(Date.now());
  const question = onboardingQuestions[step];
  const topic: LessonId = step === onboardingQuestions.length ? 'ownership' : 'diversification';
  const total = onboardingQuestions.length + 2;
  const selected = selections[step] ?? null;
  function moveTo(nextStep: number) {
    setStep(nextStep);
    started.current = Date.now();
    onStepChange();
  }
  function next() {
    if (selected === null || busy) return;
    if (question) {
      const previousSelected = answers[question.id];
      // Preserve the first response event; revisits record only actual changes.
      if (previousSelected === undefined) {
        onEvent('question_answered', {
          questionId: question.id,
          selected,
          correct: selected === question.answer,
          responseMs: Date.now() - started.current,
          phase: 'onboarding',
        });
      } else if (previousSelected !== selected) {
        onEvent('answer_revised', {
          questionId: question.id,
          previousSelected,
          selected,
          phase: 'onboarding',
        });
      }
      setAnswers({ ...answers, [question.id]: selected });
    } else {
      const previous = confidence[topic];
      if (previous === undefined)
        onEvent('confidence_rated', { topic, confidence: selected + 1, phase: 'before' });
      else if (previous !== selected + 1)
        onEvent('answer_revised', {
          topic,
          previousSelected: previous - 1,
          selected,
          phase: 'before',
        });
      const nextConfidence = { ...confidence, [topic]: selected + 1 };
      setConfidence(nextConfidence);
      if (step === total - 1) {
        onComplete({ answers, confidence: nextConfidence as Record<LessonId, number> });
        return;
      }
    }
    moveTo(step + 1);
  }
  return (
    <>
      <View style={styles.detailRow}>
        {step > 0 && <BackButton disabled={busy} onPress={() => moveTo(step - 1)} />}
        <Text style={styles.eyebrow}>
          Your starting point · {step + 1} of {total}
        </Text>
      </View>
      <ProgressBar value={(step + 1) / total} />
      <Animated.View key={step} entering={pageEnter} style={styles.screen}>
        <Text style={styles.heading}>
          {question
            ? question.title
            : `How confident are you about ${topic === 'ownership' ? 'stock ownership' : 'diversification'}?`}
        </Text>
        <Options
          options={question ? question.options : scale}
          selected={selected}
          onSelect={(value) => setSelections({ ...selections, [step]: value })}
          disabled={busy}
        />
      </Animated.View>
      <Footer>
        <Button
          title={step === total - 1 ? 'Find my starting point' : 'Continue'}
          onPress={next}
          disabled={selected === null || busy}
        />
      </Footer>
    </>
  );
}
