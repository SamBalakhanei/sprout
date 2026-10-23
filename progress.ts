export type Stage =
  | 'welcome'
  | 'onboarding'
  | 'placement'
  | 'lesson'
  | 'check'
  | 'reward'
  | 'trade'
  | 'result'
  | 'reflection'
  | 'done';

export type Assessment = { answers: number[]; confidence: number };
export type Progress = {
  stage: Stage;
  before: Assessment | null;
  after: Assessment | null;
  checkAnswer: number | null;
  completedOn: string | null;
  tradeReason: number | null;
};

export const initialProgress: Progress = {
  stage: 'welcome',
  before: null,
  after: null,
  checkAnswer: null,
  completedOn: null,
  tradeReason: null,
};

export function score(answers: number[], correctAnswers: number[]) {
  return correctAnswers.reduce(
    (total, answer, index) => total + Number(answers[index] === answer),
    0,
  );
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function streak(completedOn: string | null, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return completedOn === localDate(now) || completedOn === localDate(yesterday) ? 1 : 0;
}

function isAssessment(value: unknown): value is Assessment {
  if (!value || typeof value !== 'object') return false;
  const item = value as Assessment;
  return (
    Array.isArray(item.answers) &&
    item.answers.length === 2 &&
    item.answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 3) &&
    Number.isInteger(item.confidence) &&
    item.confidence >= 1 &&
    item.confidence <= 5
  );
}

export function isProgress(value: unknown): value is Progress {
  if (!value || typeof value !== 'object') return false;
  const item = value as Progress;
  const stages: Stage[] = [
    'welcome',
    'onboarding',
    'placement',
    'lesson',
    'check',
    'reward',
    'trade',
    'result',
    'reflection',
    'done',
  ];
  const index = stages.indexOf(item.stage);
  return (
    index >= 0 &&
    (item.before === null || isAssessment(item.before)) &&
    (index < 2 || isAssessment(item.before)) &&
    (item.after === null || isAssessment(item.after)) &&
    (item.stage !== 'done' || isAssessment(item.after)) &&
    (item.checkAnswer === null || [0, 1, 2].includes(item.checkAnswer)) &&
    (index < stages.indexOf('reward') || item.checkAnswer !== null) &&
    (item.completedOn === null ||
      (typeof item.completedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.completedOn))) &&
    (index < stages.indexOf('reward') || item.completedOn !== null) &&
    (item.tradeReason === null || [0, 1, 2].includes(item.tradeReason)) &&
    (index < stages.indexOf('result') || item.tradeReason !== null)
  );
}
