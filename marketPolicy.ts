import type { Holding, LessonId } from './domain';

/** Returns why a guided purchase is unavailable, or null when it is eligible. */
export function lessonTradeIssue(
  lesson: LessonId,
  symbol: string,
  holdings: Pick<Holding, 'symbol' | 'quantity'>[],
  sectors: Record<string, string | undefined>,
): string | null {
  if (!sectors[symbol]) return 'Company sector is unavailable.';
  if (lesson === 'ownership') return null;
  const owned = holdings.filter((holding) => holding.quantity > 0);
  if (!owned.length) return 'Complete the ownership trade first.';
  if (owned.some((holding) => !sectors[holding.symbol])) return 'A holding has an unknown sector.';
  if (owned.some((holding) => sectors[holding.symbol] === sectors[symbol]))
    return 'Choose a sector different from every holding.';
  return null;
}
