import { lessons, onboardingQuestions } from './content';
import type { Assessment, LearnerProgress, LessonDraft, LessonId, LessonResult } from './domain';

export const contentVersion = 'sprint4.v4';

export function lessonAvailable(progress: LearnerProgress, lessonId: LessonId) {
  return lessonId === 'ownership' || Boolean(progress.lessons.ownership);
}

/** Trading is only available through a completed lesson's checkpoint. */
export function marketAvailable(progress: LearnerProgress) {
  return Boolean(progress.practiceLesson && progress.lessons[progress.practiceLesson]);
}

/** A pending device draft must not erase a completion already committed by the server. */
export function restoreProgress(remote: LearnerProgress, pending: LearnerProgress) {
  const lessonDrafts = { ...pending.lessonDrafts };
  for (const id of Object.keys(remote.lessons) as LessonId[]) {
    if (!pending.lessons[id]) delete lessonDrafts[id];
  }
  return { ...pending, lessons: { ...pending.lessons, ...remote.lessons }, lessonDrafts };
}

/** Preserve saved answers, but prevent an old bookmark bypassing the prerequisite. */
export function enforceLessonOrder(progress: LearnerProgress): LearnerProgress {
  if (progress.screen === 'market' && !marketAvailable(progress)) {
    return enforceLessonOrder({ ...progress, screen: 'portfolio', practiceLesson: null });
  }
  if (lessonAvailable(progress, progress.activeLesson)) return progress;
  return {
    ...progress,
    activeLesson: 'ownership',
    screen: progress.screen === 'learn' ? 'home' : progress.screen,
    practiceLesson: progress.practiceLesson === 'diversification' ? null : progress.practiceLesson,
  };
}

export const initialProgress: LearnerProgress = {
  assessment: null,
  lessons: {},
  screen: 'welcome',
  activeLesson: 'ownership',
};

export const baselineQuestions: Record<LessonId, string[]> = {
  ownership: ['own1', 'risk1'],
  diversification: ['div1', 'div2'],
};

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function streak(completedOn: string | null, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return completedOn === localDate(now) || completedOn === localDate(yesterday) ? 1 : 0;
}

export function learningSummary(assessment: Assessment, lessonId: LessonId, result: LessonResult) {
  const before = onboardingQuestions.filter((question) =>
    baselineQuestions[lessonId].includes(question.id),
  );
  return {
    before: before.filter((question) => assessment.answers[question.id] === question.answer).length,
    after: lessons[lessonId].afterQuestions.filter(
      (question, index) => result.afterAnswers[index] === question.answer,
    ).length,
    checks: lessons[lessonId].checks.filter(
      (question, index) => result.checkAnswers[index] === question.answer,
    ).length,
    reasoning: result.reasoning === lessons[lessonId].scenario.answer,
    transfer: result.transferAnswer === lessons[lessonId].transfer.answer,
  };
}

function choice(value: unknown, maximum = 3): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum;
}

function isAssessment(value: unknown): value is Assessment {
  if (!value || typeof value !== 'object') return false;
  const item = value as Assessment;
  return Boolean(
    item.answers &&
    item.confidence &&
    onboardingQuestions.every((question) =>
      choice(item.answers[question.id], question.options.length - 1),
    ) &&
    ['ownership', 'diversification'].every((id) => {
      const confidence = item.confidence[id as LessonId];
      return Number.isInteger(confidence) && confidence >= 1 && confidence <= 5;
    }),
  );
}

function isLessonResult(value: unknown): value is LessonResult {
  if (!value || typeof value !== 'object') return false;
  const item = value as LessonResult;
  return (
    Array.isArray(item.checkAnswers) &&
    item.checkAnswers.length === 3 &&
    item.checkAnswers.every((answer) => choice(answer, 2)) &&
    choice(item.reasoning, 2) &&
    choice(item.transferAnswer, 2) &&
    Array.isArray(item.afterAnswers) &&
    item.afterAnswers.length === 2 &&
    item.afterAnswers.every((answer) => choice(answer)) &&
    Number.isInteger(item.confidence) &&
    item.confidence >= 1 &&
    item.confidence <= 5 &&
    typeof item.completedOn === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.completedOn)
  );
}

function isLessonDraft(value: unknown): value is LessonDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as LessonDraft;
  return (
    Number.isInteger(draft.step) &&
    draft.step >= 0 &&
    draft.step <= 9 &&
    Boolean(draft.answers && draft.submittedSteps) &&
    Object.entries(draft.answers).every(
      ([step, answer]) =>
        /^[1-8]$/.test(step) &&
        choice(answer, step === '8' ? 4 : ['6', '7'].includes(step) ? 3 : 2),
    ) &&
    Object.entries(draft.submittedSteps).every(
      ([step, submitted]) =>
        /^[1-7]$/.test(step) &&
        typeof submitted === 'boolean' &&
        (!submitted || draft.answers[Number(step)] !== undefined),
    ) &&
    (draft.ratedConfidence === null ||
      (Number.isInteger(draft.ratedConfidence) &&
        draft.ratedConfidence >= 1 &&
        draft.ratedConfidence <= 5))
  );
}

export function isProgress(value: unknown): value is LearnerProgress {
  if (!value || typeof value !== 'object') return false;
  const item = value as LearnerProgress;
  return (
    ['welcome', 'onboarding', 'home', 'learn', 'market', 'portfolio'].includes(item.screen) &&
    ['ownership', 'diversification'].includes(item.activeLesson) &&
    (item.lessonDrafts === undefined ||
      Boolean(
        item.lessonDrafts &&
        typeof item.lessonDrafts === 'object' &&
        Object.entries(item.lessonDrafts).every(
          ([id, draft]) => ['ownership', 'diversification'].includes(id) && isLessonDraft(draft),
        ),
      )) &&
    (item.assessment === null || isAssessment(item.assessment)) &&
    (['welcome', 'onboarding'].includes(item.screen) || isAssessment(item.assessment)) &&
    Boolean(
      item.lessons &&
      typeof item.lessons === 'object' &&
      Object.entries(item.lessons).every(
        ([id, result]) => ['ownership', 'diversification'].includes(id) && isLessonResult(result),
      ),
    )
  );
}
