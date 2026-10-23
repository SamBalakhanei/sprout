import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialProgress, isProgress, localDate, score, streak } from '../progress.ts';

test('saved progress cannot skip the assessment, lesson reward, or trade', () => {
  assert.equal(isProgress(initialProgress), true);
  assert.equal(isProgress({ ...initialProgress, stage: 'placement' }), false);
  const before = { answers: [0, 1], confidence: 2 };
  assert.equal(isProgress({ ...initialProgress, before, stage: 'lesson' }), true);
  assert.equal(isProgress({ ...initialProgress, before, stage: 'reward' }), false);
  const learned = { ...initialProgress, before, checkAnswer: 1, completedOn: '2026-10-23' };
  assert.equal(isProgress({ ...learned, stage: 'trade' }), true);
  assert.equal(isProgress({ ...learned, stage: 'result' }), false);
  assert.equal(isProgress({ ...learned, stage: 'result', tradeReason: 0 }), true);
  assert.equal(isProgress({ ...learned, stage: 'done', tradeReason: 0 }), false);
  assert.equal(isProgress({ ...learned, stage: 'done', tradeReason: 0, after: before }), true);
});

test('malformed or incompatible saved values are rejected', () => {
  for (const value of [
    null,
    {},
    'saved',
    { ...initialProgress, stage: 'unknown' },
    { ...initialProgress, before: { answers: [0], confidence: 3 } },
    { ...initialProgress, before: { answers: [0, 1], confidence: 6 } },
    { ...initialProgress, tradeReason: 9 },
    { ...initialProgress, checkAnswer: '1' },
  ]) {
    assert.equal(isProgress(value), false);
  }
});

test('knowledge scores match each assessment’s answer order', () => {
  assert.equal(score([0, 1], [0, 1]), 2);
  assert.equal(score([3, 3], [0, 1]), 0);
  assert.equal(score([1, 0], [1, 2]), 1);
});

test('one-lesson streak uses local calendar dates and expires after a missed day', () => {
  const now = new Date(2026, 0, 1, 0, 15);
  assert.equal(localDate(now), '2026-01-01');
  assert.equal(streak('2026-01-01', now), 1);
  assert.equal(streak('2025-12-31', now), 1);
  assert.equal(streak('2025-12-30', now), 0);
  assert.equal(streak(null, now), 0);
});
