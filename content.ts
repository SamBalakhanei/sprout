export type Question = {
  title: string;
  options: string[];
  answer: number;
};

export const placementQuestions: Question[] = [
  {
    title: 'When you buy a stock, what do you own?',
    options: [
      'A small piece of a company',
      'A loan the company must repay',
      'A guaranteed future profit',
      'I’m not sure yet',
    ],
    answer: 0,
  },
  {
    title: 'Can a stock’s price fall after you buy it?',
    options: [
      'No, ownership guarantees a profit',
      'Yes, its value can go up or down',
      'Only if you sell it',
      'I’m not sure yet',
    ],
    answer: 1,
  },
];

export const reflectionQuestions: Question[] = [
  {
    title: 'You buy one share of a bakery. What does that represent?',
    options: [
      'Money the bakery owes you',
      'A small ownership stake in the bakery',
      'A promise of free bread',
      'I’m not sure yet',
    ],
    answer: 1,
  },
  {
    title: 'A friend says owning a stock guarantees profit. Is that true?',
    options: [
      'Yes, all owners make money',
      'Yes, if you hold it for a week',
      'No, the share price can fall',
      'I’m not sure yet',
    ],
    answer: 2,
  },
];

export const lessonCheck: Question = {
  title: 'You buy a share of a company. What do you own?',
  options: [
    'A loan the company must repay',
    'A small piece of the company',
    'A guaranteed future profit',
  ],
  answer: 1,
};

export const tradeReasons = [
  'I want to practice owning a small piece of a company. Its price can fall.',
  'Buying a share guarantees I will make money.',
  'The company must pay my $225 back, like a loan.',
];

// Deliberately fixed fixtures: these are not current or historical market prices.
export const mockStock = { symbol: 'AAPL', name: 'Apple', price: 225, laterPrice: 210 };
export const lessonReward = 1000;
export const lessonXP = 120;
