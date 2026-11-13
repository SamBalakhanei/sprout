import type { Assessment, LessonId, Question, Topic } from './domain';
const q = (
  id: string,
  topic: Topic,
  title: string,
  options: string[],
  answer: number,
  explanation?: string,
  difficulty?: number,
): Question => ({ id, topic, title, options, answer, explanation, difficulty });
const unsure = 'I don’t know yet';
export const onboardingQuestions: Question[] = [
  q(
    'own1',
    'ownership',
    'Maya buys one share of a bakery. What does her share represent?',
    [
      'A small ownership stake in the bakery',
      'A loan to the bakery',
      'A deposit held by the bakery',
      unsure,
    ],
    0,
    undefined,
    1,
  ),
  q(
    'fund1',
    'funds',
    'A fund holds shares of 50 companies. What does a person who buys the fund gain exposure to?',
    [
      'Only the fund manager’s company',
      'The companies held by the fund',
      'A single company chosen by the buyer',
      unsure,
    ],
    1,
    undefined,
    1,
  ),
  q(
    'risk1',
    'risk',
    'Leo bought one share for $100. It now trades for $80. Before selling, what is its market value?',
    ['$80', '$100', '$20', unsure],
    0,
    undefined,
    2,
  ),
  q(
    'own2',
    'ownership',
    'Priya owns 5 of a company’s 100 equal shares. The share price falls 20%; no shares are issued or sold. What percentage does she own now?',
    ['4%', '20%', '5%', unsure],
    2,
    undefined,
    2,
  ),
  q(
    'time1',
    'time',
    'Nora needs $500 for rent next month. She considers putting it in a stock. What should she consider?',
    [
      'A month gives ample time to recover any loss',
      'Selling next month fixes the value today',
      'The stock could be down when rent is due',
      unsure,
    ],
    2,
    undefined,
    3,
  ),
  q(
    'risk2',
    'risk',
    'Two $1,000 portfolios have possible one-year returns of −10% to +10% for the first, and −30% to +30% for the second. Which has the greater possible one-year loss?',
    ['The first: $100', 'The second: $300', 'Both: $100', unsure],
    1,
    undefined,
    3,
  ),
  q(
    'div1',
    'diversification',
    'Each portfolio is worth $1,000. Which has the most money exposed to Orion stock?',
    [
      '10 Orion shares at $80 each',
      '20 Orion shares at $15 each',
      '2 Orion shares at $100 each',
      unsure,
    ],
    0,
    undefined,
    4,
  ),
  q(
    'div2',
    'diversification',
    'A portfolio owns shares in five airlines. Which event could affect many of its holdings at once?',
    [
      'One airline splits its stock',
      'One airline replaces its CEO',
      'Fuel costs rise across the airline industry',
      unsure,
    ],
    2,
    undefined,
    4,
  ),
  q(
    'fund2',
    'funds',
    'You hold $600 in Fund A, which is 50% Orion stock, and $400 in Fund B, which is 25% Orion. What share of your $1,000 is exposed to Orion?',
    ['75%', '40%', '37.5%', unsure],
    1,
    undefined,
    5,
  ),
  q(
    'time2',
    'time',
    'Two funds start at $1,000 and grow 10% each year for two years. At each year end, one charges 1% of its value after growth; the other has no fee. About what are their final values, respectively?',
    ['$1,188.10 and $1,210', '$1,185.92 and $1,210', '$1,190 and $1,200', unsure],
    1,
    undefined,
    5,
  ),
];
export type LessonContent = {
  title: string;
  description: string;
  duration: string;
  intro: string;
  vocabulary: { term: string; definition: string }[];
  example: string;
  checks: Question[];
  scenario: Question;
  transfer: Question;
  afterQuestions: Question[];
};
export const lessons: Record<LessonId, LessonContent> = {
  ownership: {
    title: 'Own a piece, share the risk',
    description: 'Learn what stock ownership means and how prices can change.',
    duration: '5 min',
    intro: 'Stock ownership connects a share of a company to a changing market value.',
    vocabulary: [
      { term: 'Share', definition: 'A small ownership stake in a company.' },
      { term: 'Cost basis', definition: 'What you paid for your shares.' },
      { term: 'Market value', definition: 'What your shares are worth at the current price.' },
      {
        term: 'Expectations',
        definition: 'What investors anticipate, which can influence the share price.',
      },
    ],
    example:
      'Imagine a bakery split into 10 equal shares. One share represents 1 of those 10 pieces: 10% ownership.',
    checks: [
      q(
        'ownership_check1',
        'ownership',
        'A bakery has 10 equal shares outstanding. You own two. What fraction of the bakery do you own?',
        ['2%', '20%', '10%'],
        1,
        'Two of ten equal shares represent 20% ownership.',
      ),
      q(
        'ownership_check2',
        'risk',
        'You bought four shares for $50 each. They now trade at $40 each. With no fees, what are your cost basis and current market value?',
        ['$200 and $160', '$160 and $200', '$200 and $40'],
        0,
        'Four shares cost $200 originally and are now worth $160 at $40 each.',
      ),
      q(
        'ownership_check3',
        'ownership',
        'A company reports a profit, but its stock price falls. Which explanation is plausible?',
        [
          'The share no longer represents ownership',
          'Its profit sets the share price directly',
          'Investors expected a larger profit',
        ],
        2,
        'Prices reflect investor expectations as well as reported results.',
      ),
    ],
    scenario: q(
      'ownership_reason',
      'ownership',
      'You are considering the illustrative share above. Which reason recognizes what you are buying?',
      [
        'A stake in the company, with a price that can change',
        'A stake whose price reflects only past profits',
        'A stake that can be sold at its purchase price',
      ],
      0,
      'A share is ownership with uncertain value, whether the next price rises or falls.',
    ),
    transfer: q(
      'ownership_transfer',
      'ownership',
      'A friend buys one of a garden company’s 100 equal shares. No new shares are issued. What did they buy?',
      [
        'A loan equal to 1% of the company’s debt',
        'A 1% ownership stake whose value can change',
        'A deposit equal to 1% of future sales',
      ],
      1,
      'One of 100 equal shares represents 1% of the company; its value can change.',
    ),
    afterQuestions: [
      q(
        'ownership_after1',
        'ownership',
        'A garden company has 100 equal shares. You buy one. What does it represent?',
        ['A loan to the company', 'A 1% ownership stake', 'A deposit with the company'],
        1,
        'One of 100 equal shares represents a 1% ownership stake.',
      ),
      q(
        'ownership_after2',
        'risk',
        'A share was bought for $90 and now trades at $75. You still own one share. What is its current market value?',
        ['$75', '$90', '$15'],
        0,
        'The current price is $75, so one share has a market value of $75.',
      ),
    ],
  },
  diversification: {
    title: 'Spread the risk',
    description: 'Explore concentration and how diversification can reduce it.',
    duration: '5 min',
    intro: 'Spreading investments can reduce reliance on a single company or industry.',
    vocabulary: [
      { term: 'Diversification', definition: 'Spreading money across different holdings.' },
      { term: 'Concentration', definition: 'The percentage held in one company or industry.' },
      { term: 'Market risk', definition: 'The possibility that many investments fall together.' },
    ],
    example:
      'A basket with several kinds of fruit is less dependent on one kind. Investments can still fall together when the whole market declines.',
    checks: [
      q(
        'diversification_check1',
        'diversification',
        'Each portfolio is worth $1,000. Which has the greatest concentration in one company?',
        [
          '$350 in its largest position',
          '$700 in its largest position',
          '$500 in its largest position',
        ],
        1,
        '$700 is 70% of $1,000, the largest concentration of the three.',
      ),
      q(
        'diversification_check2',
        'diversification',
        'A portfolio has $800 in airlines and $200 in other industries. Where should an additional $1,000 go to reduce airline concentration most?',
        ['$1,000 in other industries', '$800 in airlines and $200 elsewhere', '$1,000 in airlines'],
        0,
        'Adding $1,000 elsewhere leaves $800 in airlines out of $2,000 total: 40%. The other choices leave 80% or 90%.',
      ),
      q(
        'diversification_check3',
        'risk',
        'A diversified $1,000 stock portfolio falls 10% as markets decline across several industries. What is its value now?',
        ['$1,000', '$990', '$900'],
        2,
        'A 10% decline is $100, leaving $900. Diversification reduces concentration but does not eliminate market risk.',
      ),
    ],
    scenario: q(
      'diversification_reason',
      'diversification',
      'You have $1,000 to invest and want less dependence on one company. Which allocation best fits?',
      [
        '$1,000 in one company',
        '$100 each in ten companies across industries',
        '$100 each in ten companies in one industry',
      ],
      1,
      'Spreading across companies and industries reduces reliance on any one of them.',
    ),
    transfer: q(
      'diversification_transfer',
      'diversification',
      'A friend holds five bank stocks and wants exposure beyond banking. Which addition best fits?',
      [
        'A fund holding companies across other industries',
        'Another bank stock',
        'More shares in the same five banks',
      ],
      0,
      'Companies in other industries add exposure beyond banking.',
    ),
    afterQuestions: [
      q(
        'diversification_after1',
        'diversification',
        'Each portfolio is worth $1,000. Which has the most money exposed to Harbor stock?',
        ['20 Harbor shares at $10 each', '12 Harbor shares at $50 each', '1 Harbor share at $500'],
        1,
        'Twelve shares at $50 each equal $600, more than $200 or $500.',
      ),
      q(
        'diversification_after2',
        'diversification',
        'A portfolio holds shares in five shipping companies. Which event could affect many of them at once?',
        [
          'Fuel costs rise across the shipping industry',
          'One shipping company changes its CEO',
          'One shipping company splits its stock',
        ],
        0,
        'An industry-wide fuel cost increase can affect several shipping companies.',
      ),
    ],
  },
};
export function scoreAssessment(assessment: Assessment, topic?: LessonId) {
  return onboardingQuestions
    .filter(
      (x) =>
        !topic ||
        (topic === 'ownership'
          ? ['ownership', 'risk'].includes(x.topic)
          : ['diversification', 'funds'].includes(x.topic)),
    )
    .reduce((n, x) => n + Number(assessment.answers[x.id] === x.answer), 0);
}
export function recommendedLesson(assessment: Assessment): LessonId {
  return scoreAssessment(assessment, 'ownership') <= scoreAssessment(assessment, 'diversification')
    ? 'ownership'
    : 'diversification';
}
export const ownershipScenario = { purchasePrice: 225, gainPrice: 240, lossPrice: 210 } as const;
export const lessonReward = 1000;
export const lessonXP = 120;
