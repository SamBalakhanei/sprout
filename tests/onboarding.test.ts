import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onboardingQuestions } from '../content.ts';
import { onboardingGroup, onboardingScores, onboardingSteps } from '../onboarding.ts';

test('onboarding arms move only confidence prompts, preserving every quiz question and its order', () => {
  const before = onboardingSteps('gain');
  const after = onboardingSteps('loss');
  assert.equal(onboardingGroup('gain'), 'A');
  assert.equal(onboardingGroup('loss'), 'B');
  assert.deepEqual(
    before.slice(0, 2).map((step) => step.kind),
    ['confidence', 'confidence'],
  );
  assert.deepEqual(
    after.slice(-2).map((step) => step.kind),
    ['confidence', 'confidence'],
  );
  for (const steps of [before, after]) {
    assert.equal(steps.length, 12);
    assert.deepEqual(
      steps.filter((step) => step.kind === 'question').map((step) => step.question),
      onboardingQuestions,
    );
    assert.deepEqual(
      steps.filter((step) => step.kind === 'confidence').map((step) => step.topic),
      ['ownership', 'diversification'],
    );
  }
});

test('onboarding scores count unique unknown answers and keep missing responses separate', () => {
  const [first, second] = onboardingQuestions;
  const answers = { [first.id]: first.options.length - 1, [second.id]: second.answer };
  assert.deepEqual(onboardingScores(answers), { answered: 2, correct: 1, dontKnow: 1 });
  assert.deepEqual(onboardingScores({ ...answers, [first.id]: first.answer }), {
    answered: 2,
    correct: 2,
    dontKnow: 0,
  });
  assert.deepEqual(onboardingScores({}), { answered: 0, correct: 0, dontKnow: 0 });
});
