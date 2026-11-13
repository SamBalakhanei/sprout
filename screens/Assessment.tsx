import { useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { pageEnter } from '../components/motion';
import { BackButton, Button, Footer, Options, ProgressBar } from '../components/UI';
import { onboardingGroup, onboardingScores, onboardingSteps } from '../onboarding';
import type { Assessment, LessonId, Variant } from '../domain';
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
  variant,
}: {
  onComplete: (result: Assessment) => void;
  busy: boolean;
  onEvent: (type: string, payload: Record<string, unknown>) => void;
  onStepChange: () => void;
  variant: Variant;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confidence, setConfidence] = useState<Partial<Record<LessonId, number>>>({});
  const [selections, setSelections] = useState<Record<number, number>>({});
  const started = useRef(Date.now());
  const [quizRunId] = useState(() => Crypto.randomUUID());
  const runStarted = useRef(Date.now());
  const firstAnswers = useRef<Record<string, number>>({});
  const firstConfidence = useRef<Partial<Record<LessonId, number>>>({});
  const dontKnowSelections = useRef(0);
  const steps = onboardingSteps(variant);
  const current = steps[step];
  const question = current.kind === 'question' ? current.question : null;
  const topic = current.kind === 'confidence' ? current.topic : null;
  const total = steps.length;
  const selected = selections[step] ?? null;
  const event = (type: string, payload: Record<string, unknown>) =>
    onEvent(type, { ...payload, quizRunId });
  const lastViewed = useRef(-1);
  useEffect(() => {
    if (lastViewed.current === step) return;
    lastViewed.current = step;
    event('onboarding_step_viewed', {
      step,
      kind: current.kind,
      questionId: question?.id,
      topic,
      questionsAnswered: Object.keys(firstAnswers.current).length,
      group: onboardingGroup(variant),
    });
  });
  function moveTo(nextStep: number) {
    setStep(nextStep);
    started.current = Date.now();
    onStepChange();
  }
  function next() {
    if (selected === null || busy) return;
    const nextAnswers = { ...answers };
    const nextConfidence = { ...confidence };
    if (question) {
      const previousSelected = answers[question.id];
      // Preserve the first response event; revisits record only actual changes.
      if (previousSelected === undefined) {
        firstAnswers.current[question.id] = selected;
        event('question_answered', {
          questionId: question.id,
          selected,
          correct: selected === question.answer,
          dontKnow: selected === question.options.length - 1,
          responseMs: Date.now() - started.current,
          phase: 'onboarding',
        });
      } else if (previousSelected !== selected) {
        event('answer_revised', {
          questionId: question.id,
          previousSelected,
          selected,
          dontKnow: selected === question.options.length - 1,
          correct: selected === question.answer,
          responseMs: Date.now() - started.current,
          phase: 'onboarding',
        });
      }
      nextAnswers[question.id] = selected;
      setAnswers(nextAnswers);
    } else if (topic) {
      const previous = confidence[topic];
      if (previous === undefined) {
        firstConfidence.current[topic] = selected + 1;
        event('confidence_rated', {
          topic,
          confidence: selected + 1,
          phase: 'before',
          questionsAnswered: Object.keys(firstAnswers.current).length,
        });
      } else if (previous !== selected + 1)
        event('answer_revised', {
          topic,
          previousSelected: previous - 1,
          selected,
          phase: 'before',
          questionsAnswered: Object.keys(firstAnswers.current).length,
        });
      nextConfidence[topic] = selected + 1;
      setConfidence(nextConfidence);
    }
    if (step === total - 1) {
      event('onboarding_summary', {
        first: onboardingScores(firstAnswers.current),
        final: onboardingScores(nextAnswers),
        dontKnowSelections: dontKnowSelections.current,
        firstConfidence: firstConfidence.current,
        finalConfidence: nextConfidence,
        durationMs: Date.now() - runStarted.current,
      });
      onComplete({ answers: nextAnswers, confidence: nextConfidence as Record<LessonId, number> });
      return;
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
          onSelect={(value) => {
            if (value === selected) return;
            if (question) {
              const dontKnow = value === question.options.length - 1;
              if (dontKnow) dontKnowSelections.current += 1;
              event('onboarding_answer_selected', {
                questionId: question.id,
                selected: value,
                previousSelected: selected,
                dontKnow,
                elapsedMs: Date.now() - started.current,
              });
            }
            setSelections({ ...selections, [step]: value });
          }}
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
