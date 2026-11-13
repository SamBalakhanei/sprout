/** Opt-in integration check: creates isolated anonymous test sessions, never uses a learner's session. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) throw new Error('Load .env before running the backend check.');
  const client = () =>
    createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const first = client();
  const signedIn = await first.auth.signInAnonymously();
  assert.ifError(signedIn.error);
  const session = await first.rpc('current_study_session');
  assert.ifError(session.error);
  assert.ok(['gain', 'loss'].includes(session.data.variant));
  const id = session.data.id;
  const logged = await first.from('study_events').insert({
    event_id: randomUUID(),
    user_id: signedIn.data.user!.id,
    session_id: id,
    event: {
      type: 'integration_test',
      occurredAt: new Date().toISOString(),
      payload: { excludeFromStudyAnalysis: true },
    },
  });
  assert.ifError(logged.error);
  const quotes = await first.functions.invoke('market-quotes', { body: {} });
  if (quotes.error) {
    const context = (quotes.error as { context?: Response }).context;
    throw new Error(`Quote service: ${context ? await context.text() : quotes.error.message}`);
  }
  assert.equal(quotes.data.length, 5);
  assert.ok(
    quotes.data.every(
      (quote: { price: number; quoted_at: string }) =>
        Number(quote.price) > 0 && Number.isFinite(Date.parse(quote.quoted_at)),
    ),
  );
  console.log(
    'Quotes:',
    quotes.data.map((quote: { symbol: string; price: number; source: string }) => ({
      symbol: quote.symbol,
      price: quote.price,
      source: quote.source,
    })),
  );
  const args = {
    p_session_id: id,
    p_lesson_id: 'ownership',
    p_order_id: randomUUID(),
    p_symbol: 'KO',
    p_shares: 1,
    p_reason: 0,
  };
  const lessonResult = {
    checkAnswers: [1, 0, 2],
    reasoning: 0,
    transferAnswer: 1,
    afterAnswers: [1, 0],
    confidence: 3,
    completedOn: new Date().toISOString().slice(0, 10),
    contentVersion: 'sprint4.v4',
  };
  const locked = await first.rpc('place_lesson_trade', args);
  assert.match(locked.error?.message || '', /Complete this lesson/);
  assert.ifError(
    (
      await first.rpc('complete_lesson', {
        p_session_id: id,
        p_lesson_id: 'ownership',
        p_result: lessonResult,
      })
    ).error,
  );
  const wrong = await first.rpc('place_lesson_trade', { ...args, p_reason: 1 });
  assert.match(wrong.error?.message || '', /Review your reasoning/);
  const overspend = await first.rpc('place_lesson_trade', { ...args, p_shares: 100000 });
  assert.match(overspend.error?.message || '', /Insufficient balance/);
  const bought = await first.rpc('place_lesson_trade', args);
  assert.ifError(bought.error);
  const repeated = await first.rpc('place_lesson_trade', { ...args, p_order_id: randomUUID() });
  assert.ifError(repeated.error);
  assert.equal(repeated.data.id, bought.data.id);
  assert.ifError(
    (
      await first.rpc('complete_lesson', {
        p_session_id: id,
        p_lesson_id: 'diversification',
        p_result: lessonResult,
      })
    ).error,
  );
  const sameSector = await first.rpc('place_lesson_trade', {
    ...args,
    p_lesson_id: 'diversification',
    p_symbol: 'WMT',
    p_order_id: randomUUID(),
  });
  assert.match(sameSector.error?.message || '', /different sector/);
  const diversified = await first.rpc('place_lesson_trade', {
    ...args,
    p_lesson_id: 'diversification',
    p_symbol: 'MSFT',
    p_order_id: randomUUID(),
  });
  assert.ifError(diversified.error);
  const links = await first.from('lesson_trades').select('*').eq('session_id', id);
  assert.ifError(links.error);
  assert.equal(links.data?.length, 2);
  const second = client();
  assert.ifError((await second.auth.signInAnonymously()).error);
  const hidden = await second.from('study_sessions').select('id').eq('id', id);
  assert.ifError(hidden.error);
  assert.deepEqual(hidden.data, []);
  console.log(
    'PASS: anonymous sessions, real quotes, lesson/reasoning guards, one trade per lesson, sector validation, balance validation, and user isolation.',
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
