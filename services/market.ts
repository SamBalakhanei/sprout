import type { Holding, LessonId, Portfolio, Quote, TradeOrder, TradeReceipt } from '../domain';
import { supabase } from './backend';
import { companies } from '../companies';

type Numeric = number | string;
type QuoteRow = {
  symbol: string;
  price: Numeric;
  quoted_at: string;
  fetched_at: string;
  source: string;
};
type HoldingRow = { symbol: string; shares: number; average_cost: Numeric };
type TradeRow = {
  order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  shares: number;
  price: Numeric;
  total: Numeric;
  created_at: string;
  quote_at: string;
  quote_source: string;
  cash_after: Numeric;
};
function validPrice(value: Numeric): number | null {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}
function quote(row: QuoteRow): Quote | null {
  const price = validPrice(row.price);
  if (
    price === null ||
    !Number.isFinite(Date.parse(row.quoted_at)) ||
    !Number.isFinite(Date.parse(row.fetched_at))
  )
    return null;
  return {
    symbol: row.symbol,
    name: companies[row.symbol]?.name || row.symbol,
    price,
    currency: 'USD',
    asOf: row.quoted_at,
    fetchedAt: row.fetched_at,
    source: row.source,
    freshness: 'delayed',
  };
}
function receipt(row: TradeRow): TradeReceipt {
  return {
    id: row.order_id,
    symbol: row.symbol,
    side: row.side,
    quantity: row.shares,
    price: Number(row.price),
    total: Number(row.total),
    executedAt: row.created_at,
    quoteAsOf: row.quote_at,
    source: row.quote_source,
    cashAfter: Number(row.cash_after),
  };
}
function validQuotes(rows: QuoteRow[]): Quote[] {
  return rows.map(quote).filter((item): item is Quote => item !== null);
}
export async function getQuotes(): Promise<Quote[]> {
  const refreshed = await supabase.functions.invoke<QuoteRow[]>('market-quotes', { body: {} });
  if (!refreshed.error && Array.isArray(refreshed.data)) {
    const quotes = validQuotes(refreshed.data);
    if (quotes.length) return quotes;
  }
  const cached = await supabase.from('market_quotes').select('*').order('symbol');
  if (cached.error) throw cached.error;
  const quotes = validQuotes((cached.data || []) as QuoteRow[]);
  if (!quotes.length) throw new Error('Market quotes are unavailable. Please try again later.');
  return quotes;
}
export async function getPortfolio(sessionId: string): Promise<Portfolio> {
  const [account, positions, trades, quotes] = await Promise.all([
    supabase.from('accounts').select('*').eq('session_id', sessionId).single(),
    supabase.from('holdings').select('*').eq('session_id', sessionId).gt('shares', 0),
    supabase
      .from('trades')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }),
    supabase.from('market_quotes').select('*'),
  ]);
  if (account.error || positions.error || trades.error || quotes.error)
    throw account.error || positions.error || trades.error || quotes.error;
  const quoteRows = (quotes.data || []) as QuoteRow[];
  const holdings: Holding[] = ((positions.data || []) as HoldingRow[]).map((row) => {
    const quoteRow = quoteRows.find((item) => item.symbol === row.symbol);
    const price = quoteRow ? validPrice(quoteRow.price) : null;
    const marketValue = price === null ? null : price * row.shares;
    return {
      symbol: row.symbol,
      quantity: row.shares,
      averageCost: Number(row.average_cost),
      price,
      marketValue,
      gainLoss: marketValue === null ? null : marketValue - Number(row.average_cost) * row.shares,
    };
  });
  const cash = Number(account.data.balance);
  const holdingsValue = holdings.reduce((sum, h) => sum + (h.marketValue ?? 0), 0);
  return {
    cash,
    holdingsValue,
    totalValue: cash + holdingsValue,
    unrealizedGain: holdings.reduce((sum, h) => sum + (h.gainLoss ?? 0), 0),
    valuationComplete: holdings.every((h) => h.marketValue !== null),
    holdings,
    trades: ((trades.data || []) as TradeRow[]).map(receipt),
  };
}
export async function getLessonTrade(
  sessionId: string,
  lessonId: LessonId,
): Promise<TradeReceipt | null> {
  const link = await supabase
    .from('lesson_trades')
    .select('trade_id')
    .eq('session_id', sessionId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  if (link.error) throw link.error;
  if (!link.data) return null;
  const trade = await supabase.from('trades').select('*').eq('id', link.data.trade_id).single();
  if (trade.error) throw trade.error;
  return receipt(trade.data as TradeRow);
}

export async function placeLessonTrade(
  sessionId: string,
  lessonId: LessonId,
  order: TradeOrder,
  reason: number,
): Promise<TradeReceipt> {
  const { data, error } = await supabase.rpc('place_lesson_trade', {
    p_session_id: sessionId,
    p_lesson_id: lessonId,
    p_order_id: order.id,
    p_symbol: order.symbol,
    p_shares: order.quantity,
    p_reason: reason,
  });
  if (error) throw error;
  return receipt(data as TradeRow);
}
