// Runs in the Supabase Deno runtime; checked separately from the Expo client.
// Keep JWT verification enabled when deploying this function.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const symbols = ['AAPL', 'MSFT', 'KO', 'JPM', 'WMT'];
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
// Nasdaq reports an Eastern wall time. Resolve its actual UTC offset for that date.
function easternTime(value: string): string | null {
  const match =
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) (AM|PM) ET$/.exec(
      value || '',
    );
  if (!match) return null;
  const month = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ].indexOf(match[1]);
  const hour = (Number(match[4]) % 12) + (match[6] === 'PM' ? 12 : 0);
  const wall = Date.UTC(Number(match[3]), month, Number(match[2]), hour, Number(match[5]));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  let time = wall;
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(time)).map((p) => [p.type, p.value]),
    );
    const formatted = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    time += wall - formatted;
  }
  const date = new Date(time);
  return Number.isFinite(time) && time <= Date.now() + 300000 ? date.toISOString() : null;
}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const authorization = request.headers.get('Authorization');
    if (!authorization)
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers,
      });
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: user, error: authError } = await client.auth.getUser();
    if (authError || !user.user)
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers,
      });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: cached, error: cacheError } = await admin
      .from('market_quotes')
      .select('*')
      .in('symbol', symbols);
    if (cacheError) throw cacheError;
    if (
      cached?.length === symbols.length &&
      cached.every((q) => Date.now() - Date.parse(q.fetched_at) < 300000)
    ) {
      return new Response(JSON.stringify(cached), { headers });
    }
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
          try {
            const response = await fetch(
              `https://${host}/v8/finance/chart/${symbol}?interval=1d&range=5d`,
              {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(2000),
              },
            );
            if (!response.ok) continue;
            const data = await response.json();
            const meta = data.chart?.result?.[0]?.meta;
            const price = Number(meta?.regularMarketPrice);
            const time = Number(meta?.regularMarketTime);
            if (
              !Number.isFinite(price) ||
              price <= 0 ||
              !Number.isFinite(time) ||
              time <= 0 ||
              time * 1000 > Date.now() + 300000
            )
              continue;
            return {
              symbol,
              price: Math.round(price * 100) / 100,
              quoted_at: new Date(time * 1000).toISOString(),
              source: 'Yahoo Finance (possibly delayed)',
              fetched_at: new Date().toISOString(),
            };
          } catch {
            /* Try the next host. */
          }
        }
        try {
          const response = await fetch(
            `https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`,
            {
              headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
              signal: AbortSignal.timeout(4000),
            },
          );
          if (response.ok) {
            const body = await response.json();
            const info = body.data?.primaryData;
            const priceText = info?.lastSalePrice;
            const price =
              typeof priceText === 'string' && /^\$[\d,]+(?:\.\d+)?$/.test(priceText)
                ? Number(priceText.replace(/[$,]/g, ''))
                : NaN;
            const quotedAt = easternTime(info?.lastTradeTimestamp);
            if (Number.isFinite(price) && price > 0 && quotedAt) {
              return {
                symbol,
                price: Math.round(price * 100) / 100,
                quoted_at: quotedAt,
                source: 'Nasdaq (possibly delayed)',
                fetched_at: new Date().toISOString(),
              };
            }
          }
        } catch {
          /* Report unavailable instead of inventing a quote. */
        }
        throw new Error(`Quote unavailable for ${symbol}`);
      }),
    );
    const { error } = await admin.from('market_quotes').upsert(results);
    if (error) throw error;
    return new Response(JSON.stringify(results), { headers });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Quote refresh failed' }),
      { status: 502, headers },
    );
  }
});
