import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  lessons,
  onboardingQuestions,
  ownershipScenario,
  recommendedLesson,
  scoreAssessment,
} from '../content.ts';
import type { Assessment, LessonId, Question } from '../domain.ts';

const ids: LessonId[] = ['ownership', 'diversification'];
const assessment = (answer: (q: Question) => number): Assessment => ({
  answers: Object.fromEntries(onboardingQuestions.map((q) => [q.id, answer(q)])),
  confidence: { ownership: 1, diversification: 1 },
});

test('onboarding samples five topics without an answer-position shortcut', () => {
  assert.equal(onboardingQuestions.length, 10);
  assert.deepEqual(
    new Set(onboardingQuestions.map((q) => q.id)),
    new Set(['own1', 'own2', 'risk1', 'risk2', 'div1', 'div2', 'fund1', 'fund2', 'time1', 'time2']),
  );
  assert.deepEqual(
    onboardingQuestions.map((q) => q.difficulty),
    [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  );
  for (const topic of ['ownership', 'risk', 'diversification', 'funds', 'time']) {
    assert.equal(onboardingQuestions.filter((q) => q.topic === topic).length, 2);
  }
  assert.deepEqual(new Set(onboardingQuestions.map((q) => q.answer)), new Set([0, 1, 2]));
  for (const q of onboardingQuestions) {
    assert.match(q.options.at(-1)!, /don.t know/i);
    assert.notEqual(q.answer, q.options.length - 1);
  }
});

test('lesson measurements are distinct, valid, and cover matching pre-assessment concepts', () => {
  const expected = {
    ownership: ['ownership', 'risk'],
    diversification: ['diversification', 'diversification'],
  };
  const allQuestions = [...onboardingQuestions];
  for (const id of ids) {
    const lesson = lessons[id];
    assert.equal(lesson.checks.length, 3);
    assert.equal(lesson.afterQuestions.length, 2);
    assert.deepEqual(
      lesson.afterQuestions.map((q) => q.topic),
      expected[id],
    );
    assert.ok(
      lesson.afterQuestions.every((q) =>
        onboardingQuestions.some((before) => before.topic === q.topic),
      ),
    );
    assert.equal(new Set(lesson.checks.map((q) => q.answer)).size, 3);
    assert.ok(
      [...lesson.checks, lesson.scenario, lesson.transfer, ...lesson.afterQuestions].every((q) =>
        q.explanation?.trim(),
      ),
    );
    assert.ok(
      [...lesson.checks, lesson.scenario, lesson.transfer, ...lesson.afterQuestions].every((q) =>
        q.options.every((option) => !/don.t know/i.test(option)),
      ),
    );
    assert.ok(lesson.vocabulary.every((item) => item.term.trim() && item.definition.trim()));
    allQuestions.push(...lesson.checks, lesson.scenario, lesson.transfer, ...lesson.afterQuestions);
  }
  assert.equal(new Set(allQuestions.map((q) => q.id)).size, allQuestions.length);
  for (const q of allQuestions) {
    assert.ok(q.answer >= 0 && q.answer < q.options.length, q.id);
    assert.equal(new Set(q.options).size, q.options.length, q.id);
  }
});

test('ownership lesson illustrates a fixed price loss', () => {
  assert.equal(ownershipScenario.purchasePrice, 225);
  assert.equal(ownershipScenario.lossPrice, 210);
  assert.equal(ownershipScenario.purchasePrice - ownershipScenario.lossPrice, 15);
});

test('calculation questions use correct exposure and compounded fee values', () => {
  const question = (id: string) => onboardingQuestions.find((item) => item.id === id)!;
  assert.match(question('fund2').options[question('fund2').answer], /^40%$/);
  assert.equal((600 * 0.5 + 400 * 0.25) / 1000, 0.4);
  assert.equal((1000 * (1.1 * 0.99) ** 2).toFixed(2), '1185.92');
  assert.equal((1000 * 1.1 ** 2).toFixed(2), '1210.00');
  assert.match(question('time2').options[question('time2').answer], /1,185\.92.*1,210/);
});

test('recommendation targets weaker prerequisite knowledge', () => {
  const novice = assessment((q) => q.options.length - 1);
  assert.equal(scoreAssessment(novice), 0);
  assert.equal(recommendedLesson(novice), 'ownership');
  const knowsOwnership = assessment((q) =>
    ['ownership', 'risk'].includes(q.topic) ? q.answer : q.options.length - 1,
  );
  assert.equal(recommendedLesson(knowsOwnership), 'diversification');
  const knowsDiversification = assessment((q) =>
    ['diversification', 'funds'].includes(q.topic) ? q.answer : q.options.length - 1,
  );
  assert.equal(recommendedLesson(knowsDiversification), 'ownership');
});
