/** Shared contracts for the mobile UI, backend adapter, and study exports. */
export type LessonId = 'ownership' | 'diversification';
export type Topic = LessonId | 'risk' | 'funds' | 'time';
export type Variant = 'gain' | 'loss';

export type Question = {
  id: string;
  topic: Topic;
  title: string;
  options: string[];
  answer: number;
  explanation?: string;
  difficulty?: number;
};

export type Assessment = {
  contentVersion?: string;
  answers: Record<string, number>;
  confidence: Record<LessonId, number>;
};

export type LessonResult = {
  contentVersion?: string;
  checkAnswers: number[];
  reasoning: number;
  transferAnswer: number;
  afterAnswers: number[];
  confidence: number;
  completedOn: string;
};

export type LessonDraft = {
  step: number;
  answers: Record<number, number>;
  submittedSteps: Record<number, boolean>;
  ratedConfidence: number | null;
};

export type LearnerProgress = {
  assessment: Assessment | null;
  lessons: Partial<Record<LessonId, LessonResult>>;
  lessonDrafts?: Partial<Record<LessonId, LessonDraft>>;
  screen: 'welcome' | 'onboarding' | 'home' | 'learn' | 'market' | 'portfolio';
  activeLesson: LessonId;
  practiceLesson?: LessonId | null;
};

export type StudySession = {
  id: string;
  variant: Variant;
  createdAt: string;
  progress: LearnerProgress | null;
};

export type StudyEvent = {
  id: string;
  type: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  asOf: string;
  fetchedAt: string;
  source: string;
  freshness: 'delayed' | 'end_of_day' | 'latest_available';
};

export type Holding = {
  symbol: string;
  quantity: number;
  averageCost: number;
  price: number | null;
  marketValue: number | null;
  gainLoss: number | null;
};

export type TradeOrder = {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
};

export type TradeReceipt = TradeOrder & {
  price: number;
  total: number;
  executedAt: string;
  quoteAsOf: string;
  source: string;
  cashAfter: number;
};

export type Portfolio = {
  valuationComplete: boolean;
  cash: number;
  totalValue: number;
  holdingsValue: number;
  unrealizedGain: number;
  holdings: Holding[];
  trades: TradeReceipt[];
};
