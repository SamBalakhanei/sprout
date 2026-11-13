import { onboardingQuestions } from './content';
import type { Variant } from './domain';

export const onboardingExperiment = 'onboarding-confidence-order-v1';

/** Reuse the persisted, server-randomized bit without changing historical database records. */
export function onboardingGroup(variant: Variant) {
  return variant === 'gain' ? 'A' : 'B';
}

export function onboardingSteps(variant: Variant) {
  const questions = onboardingQuestions.map((question) => ({
    kind: 'question' as const,
    question,
  }));
  const confidence = (['ownership', 'diversification'] as const).map((topic) => ({
    kind: 'confidence' as const,
    topic,
  }));
  return variant === 'gain' ? [...confidence, ...questions] : [...questions, ...confidence];
}

/** Count distinct submitted questions, not repeated taps or reviews. */
export function onboardingScores(answers: Record<string, number>) {
  return {
    answered: onboardingQuestions.filter((q) => answers[q.id] !== undefined).length,
    correct: onboardingQuestions.filter((q) => answers[q.id] === q.answer).length,
    dontKnow: onboardingQuestions.filter((q) => answers[q.id] === q.options.length - 1).length,
  };
}
