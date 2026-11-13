import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { pageEnter, reveal } from '../components/motion';
import { BackButton, Button, Footer, Options, ProgressBar } from '../components/UI';
import LessonIllustration from '../components/LessonIllustration';
import { lessons, ownershipScenario } from '../content';
import type { LessonDraft, LessonId, LessonResult } from '../domain';
import { styles } from '../styles';

const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const confidenceOptions = [
  '1 · Not confident yet',
  '2 · A little confident',
  '3 · Somewhat confident',
  '4 · Confident',
  '5 · Very confident',
];
export default function LearningScreen({
  lessonId,
  busy,
  onComplete,
  onExit,
  onEvent,
  onStepChange,
  draft,
  onDraftChange,
  onFeedbackShown,
}: {
  lessonId: LessonId;
  busy: boolean;
  onComplete: (result: LessonResult) => void;
  onExit: () => void;
  onEvent: (type: string, payload: Record<string, unknown>) => void;
  onStepChange: () => void;
  draft?: LessonDraft;
  onDraftChange: (draft: LessonDraft) => void;
  onFeedbackShown?: (target: ComponentRef<typeof View> | null) => void;
}) {
  const lesson = lessons[lessonId];
  const [state, setState] = useState<LessonDraft>(() => {
    if (!draft)
      return {
        step: 0,
        answers: {},
        submittedSteps: {},
        ratedConfidence: null,
      };
    const answers = { ...draft.answers };
    const submittedSteps = { ...draft.submittedSteps };
    const questions = [
      ...lesson.checks,
      lesson.scenario,
      lesson.transfer,
      ...lesson.afterQuestions,
    ];
    let firstInvalid: number | undefined;
    questions.forEach((question, index) => {
      const key = index + 1;
      const answer = answers[key];
      if (
        answer !== undefined &&
        (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length)
      ) {
        delete answers[key];
        delete submittedSteps[key];
        firstInvalid ??= key;
      }
    });
    return { ...draft, answers, submittedSteps, step: firstInvalid ?? draft.step };
  });
  const current = useRef(state);
  const feedback = useRef<ComponentRef<typeof View>>(null);
  const { step, answers, submittedSteps, ratedConfidence } = state;
  function update(patch: Partial<LessonDraft>) {
    const next = { ...current.current, ...patch };
    current.current = next;
    setState(next);
    onDraftChange(next);
  }
  const started = useRef(Date.now());
  const selected = answers[step] ?? null;
  const submitted = Boolean(submittedSteps[step]);
  const question =
    step >= 1 && step <= 3
      ? lesson.checks[step - 1]
      : step === 4
        ? lesson.scenario
        : step === 5
          ? lesson.transfer
          : step === 6 || step === 7
            ? lesson.afterQuestions[step - 6]
            : null;
  const feedbackStep = step >= 1 && step <= 7;
  const correct = question && selected === question.answer;
  function moveTo(nextStep: number) {
    update({ step: nextStep });
    started.current = Date.now();
    onStepChange();
  }
  function next() {
    if (busy) return;
    if (step === 0) {
      moveTo(step + 1);
      return;
    }
    if (step === 9) {
      if (
        [1, 2, 3, 4, 5, 6, 7].every((key) => submittedSteps[key] && answers[key] !== undefined) &&
        answers[8] !== undefined
      )
        onComplete({
          checkAnswers: [answers[1], answers[2], answers[3]],
          reasoning: answers[4],
          transferAnswer: answers[5],
          afterAnswers: [answers[6], answers[7]],
          confidence: answers[8] + 1,
          completedOn: localDate(),
        });
      return;
    }
    if (selected === null) return;
    if (question && !submitted) {
      onEvent('question_answered', {
        questionId: question.id,
        selected,
        correct: selected === question.answer,
        responseMs: Date.now() - started.current,
        phase:
          step <= 3 ? 'lesson_check' : step === 4 ? 'scenario' : step === 5 ? 'transfer' : 'post',
      });
      // Lock each first response so reviewing a step cannot change study evidence.
      update({ submittedSteps: { ...submittedSteps, [step]: true } });
      if (feedbackStep) {
        try {
          void Haptics.notificationAsync(
            selected === question.answer
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Error,
          ).catch(() => {});
        } catch {
          /* Haptics may be unavailable. */
        }
        return;
      }
    }
    if (step === 8) {
      if (ratedConfidence === null) {
        onEvent('confidence_rated', { topic: lessonId, confidence: selected + 1, phase: 'after' });
      } else if (ratedConfidence !== selected + 1) {
        onEvent('answer_revised', {
          topic: lessonId,
          previousSelected: ratedConfidence - 1,
          selected,
          phase: 'after',
        });
      }
      update({ ratedConfidence: selected + 1, step: step + 1 });
      started.current = Date.now();
      onStepChange();
      return;
    }
    moveTo(step + 1);
  }
  return (
    <>
      <View style={styles.detailRow}>
        {step > 0 && <BackButton disabled={busy} onPress={() => moveTo(step - 1)} />}
        <Text style={[styles.eyebrow, { flex: 1, textAlign: 'center' }]}>
          {lesson.title} · {step + 1} of 10
        </Text>
        <Text onPress={busy ? undefined : onExit} accessibilityRole="button" style={styles.link}>
          Exit
        </Text>
      </View>
      <ProgressBar value={(step + 1) / 10} />
      <Animated.View key={step} entering={pageEnter} style={styles.screen}>
        {step === 0 ? (
          <>
            <Text style={styles.title}>{lesson.title}</Text>
            <Text style={styles.body}>{lesson.intro}</Text>
            <View style={styles.softCard}>
              {lesson.vocabulary.map((item) => (
                <Text key={item.term} style={styles.body}>
                  • <Text style={{ fontWeight: '700' }}>{item.term}:</Text> {item.definition}
                </Text>
              ))}
            </View>
            <LessonIllustration lessonId={lessonId} />
          </>
        ) : step === 9 ? (
          <>
            <Text style={styles.title}>Lesson complete</Text>
            <View style={styles.softCard}>
              <Text style={styles.heading}>Nice work practicing.</Text>
              <Text style={styles.body}>
                {lessonId === 'ownership'
                  ? 'A share is ownership, and its value can change.'
                  : 'Spreading holdings can reduce concentration, while market risk remains.'}
              </Text>
            </View>
            <Text style={styles.body}>
              Next, explore these ideas with virtual money in Practice.
            </Text>
          </>
        ) : step === 8 ? (
          <>
            <Text style={styles.heading}>
              How confident are you about{' '}
              {lessonId === 'ownership' ? 'stock ownership' : 'diversification'}?
            </Text>
            <Options
              options={confidenceOptions}
              selected={selected}
              onSelect={(value) => update({ answers: { ...answers, [step]: value } })}
              disabled={busy}
            />
          </>
        ) : (
          question && (
            <>
              <Text style={styles.eyebrow}>
                {step <= 3
                  ? 'Check your understanding'
                  : step === 4
                    ? 'Interactive example'
                    : step === 5
                      ? 'Try a new situation'
                      : 'A fresh check'}
              </Text>
              {step === 4 && (
                <View style={styles.softCard}>
                  <Text style={styles.heading}>
                    {lessonId === 'ownership' ? 'Illustrative lesson scenario' : 'Build a basket'}
                  </Text>
                  <Text style={styles.body}>
                    {lessonId === 'ownership'
                      ? `Imagine buying one share for $${ownershipScenario.purchasePrice}. Choose your reason before seeing what happens next.`
                      : 'Imagine choosing how to invest a virtual amount. Consider how your choices spread exposure.'}
                  </Text>
                </View>
              )}
              <Text style={styles.heading}>{question.title}</Text>
              <Options
                options={question.options}
                selected={selected}
                onSelect={(value) => update({ answers: { ...answers, [step]: value } })}
                disabled={submitted || busy}
                correctAnswer={submitted && feedbackStep ? question.answer : undefined}
              />
              {submitted && feedbackStep && (
                <Animated.View
                  ref={feedback}
                  entering={reveal}
                  style={[styles.softCard, !correct && styles.incorrectCard]}
                  accessibilityLiveRegion="polite"
                  onLayout={() => onFeedbackShown?.(feedback.current)}
                >
                  <Text
                    style={[styles.heading, correct ? styles.correctText : styles.incorrectText]}
                  >
                    {correct ? '✓ Correct! Nicely done.' : '✕ Not quite. Here’s why.'}
                  </Text>
                  <Text style={styles.body}>{question.explanation}</Text>
                </Animated.View>
              )}
              {submitted && step === 4 && lessonId === 'ownership' && (
                <View style={styles.goldCard} accessibilityLabel="Illustrative price outcome">
                  <Text style={styles.eyebrow}>Imagine the next day · illustrative price</Text>
                  <View style={styles.priceChange}>
                    <Text style={styles.previousPrice}>${ownershipScenario.purchasePrice}</Text>
                    <Text style={styles.heading}>→</Text>
                    <Text style={styles.money}>${ownershipScenario.lossPrice}</Text>
                  </View>
                  <Text style={[styles.heading, styles.incorrectText]}>
                    ↓ ${ownershipScenario.purchasePrice - ownershipScenario.lossPrice} in share
                    value
                  </Text>
                </View>
              )}
            </>
          )
        )}
      </Animated.View>
      <Footer>
        <Button
          title={
            step === 0
              ? 'Start learning'
              : step === 9
                ? busy
                  ? 'Saving…'
                  : lessonId === 'ownership'
                    ? 'Practice this lesson'
                    : 'Apply this in Practice'
                : submitted
                  ? 'Continue'
                  : feedbackStep
                    ? 'Check my answer'
                    : 'Continue'
          }
          tone={feedbackStep && submitted && !correct ? 'error' : 'success'}
          onPress={next}
          disabled={busy || (step > 0 && step < 9 && selected === null)}
        />
      </Footer>
    </>
  );
}
