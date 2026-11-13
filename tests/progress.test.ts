import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  enforceLessonOrder,
  initialProgress,
  isProgress,
  learningSummary,
  lessonAvailable,
  localDate,
  marketAvailable,
  restoreProgress,
  streak,
} from '../progress';
import { onboardingQuestions, lessons } from '../content';
import type { Assessment, LessonResult } from '../domain';

const assessment: Assessment = {
  answers: Object.fromEntries(
    onboardingQuestions.map((question) => [question.id, question.answer]),
  ),
  confidence: { ownership: 2, diversification: 3 },
};
const result: LessonResult = {
  checkAnswers: [0, 1, 0],
  reasoning: 2,
  transferAnswer: 1,
  afterAnswers: lessons.ownership.afterQuestions.map((question) => question.answer),
  confidence: 4,
  completedOn: '2026-11-09',
};

test('progress requires a full baseline before entering home, learning, or trading', () => {
  assert.equal(isProgress(initialProgress), true);
  for (const screen of ['home', 'learn', 'market']) {
    assert.equal(isProgress({ ...initialProgress, screen }), false);
    assert.equal(isProgress({ ...initialProgress, screen, assessment }), true);
  }
});

test('saved lesson results retain incorrect first attempts and reject malformed answers', () => {
  const saved = { ...initialProgress, assessment, screen: 'home', lessons: { ownership: result } };
  assert.equal(isProgress(saved), true);
  assert.equal(
    isProgress({ ...saved, lessons: { ownership: { ...result, checkAnswers: [9, 0, 0] } } }),
    false,
  );
  assert.equal(
    isProgress({ ...saved, lessons: { ownership: { ...result, confidence: 6 } } }),
    false,
  );
  assert.equal(isProgress({ ...saved, lessons: { invented: result } }), false);
  assert.equal(isProgress({ ...saved, assessment: { ...assessment, answers: {} } }), false);
});

test('learning summary separates matched knowledge from confidence and application', () => {
  const summary = learningSummary(assessment, 'ownership', result);
  assert.equal(summary.before, 2);
  assert.equal(summary.after, 2);
  assert.equal(summary.checks, 0);
  assert.equal(summary.reasoning, false);
  assert.equal(summary.transfer, true);
});

test('streak uses local calendar dates and expires after a missed day', () => {
  const now = new Date(2026, 0, 1, 0, 15);
  assert.equal(localDate(now), '2026-01-01');
  assert.equal(streak('2026-01-01', now), 1);
  assert.equal(streak('2025-12-31', now), 1);
  assert.equal(streak('2025-12-30', now), 0);
  assert.equal(streak(null, now), 0);
});

test('lesson 2 requires lesson 1, including when restoring an old bookmark', () => {
  const locked = {
    ...initialProgress,
    assessment,
    screen: 'learn' as const,
    activeLesson: 'diversification' as const,
  };
  assert.equal(lessonAvailable(locked, 'ownership'), true);
  assert.equal(lessonAvailable(locked, 'diversification'), false);
  const restored = enforceLessonOrder(locked);
  assert.equal(restored.screen, 'home');
  assert.equal(restored.activeLesson, 'ownership');
  assert.equal(restored.assessment, assessment);
  const unlocked = { ...locked, lessons: { ownership: result } };
  assert.equal(lessonAvailable(unlocked, 'diversification'), true);
  assert.equal(enforceLessonOrder(unlocked), unlocked);
});

test('trading requires a completed lesson checkpoint even when both lessons are complete', () => {
  const base = { ...initialProgress, assessment, screen: 'market' as const };
  assert.equal(marketAvailable(base), false);
  assert.equal(enforceLessonOrder(base).screen, 'portfolio');
  const first = { ...base, lessons: { ownership: result } };
  assert.equal(marketAvailable(first), false);
  assert.equal(marketAvailable({ ...first, practiceLesson: 'ownership' }), true);
  assert.equal(marketAvailable({ ...first, practiceLesson: 'diversification' }), false);
  const completed = { ...first, lessons: { ownership: result, diversification: result } };
  assert.equal(marketAvailable(completed), false);
  assert.equal(enforceLessonOrder(completed).screen, 'portfolio');
  assert.equal(marketAvailable({ ...completed, practiceLesson: 'diversification' }), true);
});

test('lesson drafts preserve submitted mistakes and reject malformed resume state', () => {
  const draft = {
    step: 5,
    answers: { 1: 0, 2: 1 },
    submittedSteps: { 1: true },
    ratedConfidence: null,
  };
  const saved = {
    ...initialProgress,
    assessment,
    screen: 'home',
    lessonDrafts: { ownership: draft },
  };
  assert.equal(isProgress(saved), true);
  for (const invalid of [
    { ...draft, step: 10 },
    { ...draft, answers: { 1: 8 } },
    { ...draft, submittedSteps: { 3: true } },
    { ...draft, ratedConfidence: 0 },
  ])
    assert.equal(isProgress({ ...saved, lessonDrafts: { ownership: invalid } }), false);
});

test('restoring pending drafts cannot erase a server-committed completion', () => {
  const draft = { step: 9, answers: {}, submittedSteps: {}, ratedConfidence: null };
  const pending = {
    ...initialProgress,
    assessment,
    lessonDrafts: { ownership: draft, diversification: draft },
  };
  const remote = { ...initialProgress, assessment, lessons: { ownership: result } };
  const restored = restoreProgress(remote, pending);
  assert.deepEqual(restored.lessons.ownership, result);
  assert.equal(restored.lessonDrafts.ownership, undefined);
  assert.equal(restored.lessonDrafts.diversification, draft);
  const review = restoreProgress(remote, { ...pending, lessons: { ownership: result } });
  assert.equal(review.lessonDrafts.ownership, draft);
});
