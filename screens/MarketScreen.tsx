import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reveal } from '../components/motion';
import { BackButton, Button, Options } from '../components/UI';
import CompanyLogo from '../components/CompanyLogo';
import { companies } from '../companies';
import { LessonId, Portfolio, Quote, TradeOrder, TradeReceipt } from '../domain';
import { getPortfolio, getQuotes, getLessonTrade, placeLessonTrade } from '../services/market';
import { lessonTradeIssue } from '../marketPolicy';
import { colors, styles } from '../styles';

const dollars = (n: number) => `$${n.toFixed(2)}`;
const sourceName = (source: string) => source.replace(/\s*\(possibly delayed\)$/i, '');
const sectors: Record<string, string> = Object.fromEntries(
  Object.entries(companies).map(([symbol, company]) => [symbol, company.sector]),
);
const date = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
};
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : 'Please check your connection and try again.';
const withTimeout = <T,>(promise: Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The request timed out.')), 15000);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

function concentrationFeedback(holdings: Portfolio['holdings'], receipt: TradeReceipt): string {
  if (holdings.some((h) => h.marketValue === null))
    return 'Some holding prices are unavailable, so concentration cannot be compared.';
  const before = holdings.map((h) => ({ symbol: h.symbol, value: h.marketValue! }));
  const total = before.reduce((sum, h) => sum + h.value, 0);
  if (total <= 0)
    return 'This is your first holding, so there is no earlier concentration to compare. Adding different companies later can spread company-specific risk.';
  const after = before.map((h) => ({ ...h }));
  const chosen = after.find((h) => h.symbol === receipt.symbol);
  if (chosen) chosen.value += receipt.total;
  else after.push({ symbol: receipt.symbol, value: receipt.total });
  const index = (items: typeof before, sum: number) =>
    items.reduce((acc, h) => acc + (h.value / sum) ** 2, 0);
  const change = index(after, total + receipt.total) - index(before, total);
  return change < -0.000001
    ? 'This purchase reduced concentration across your company holdings at the recorded prices.'
    : change > 0.000001
      ? 'This purchase increased concentration across your company holdings at the recorded prices.'
      : 'This purchase left concentration across your company holdings about unchanged at the recorded prices.';
}
const reasons: Record<LessonId, string[]> = {
  ownership: [
    'I want to own a small piece of a company, knowing its price can fall.',
    'Buying a share guarantees I will make money.',
    'Buying a share is a loan the company must repay.',
  ],
  diversification: [
    'I want to reduce concentration by spreading investments across companies.',
    'Diversification guarantees that I will make money.',
    'Buying more of the same stock always makes a portfolio diversified.',
  ],
};

// Persist before sending: a restored request must always reuse its original order ID.
type PendingOrder = {
  order: TradeOrder;
  reason: number | null;
  holdings: Portfolio['holdings'];
  guided: boolean;
  lessonId?: LessonId;
  intentRecorded: boolean;
  ambiguous: boolean;
};
const outboxKey = (sessionId: string) => `sprout:market-order:${sessionId}`;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function MarketScreen({
  sessionId,
  lessonId,
  onBack,
  onEvent,
  onReceiptShown,
  onNextLesson,
  onPreviousLesson,
  onViewPortfolio,
}: {
  sessionId: string;
  lessonId: LessonId;
  onBack: () => void;
  onEvent: (type: string, payload: Record<string, unknown>) => void;
  onReceiptShown: (target: ComponentRef<typeof View> | null) => void;
  onNextLesson?: () => void;
  onPreviousLesson?: () => void;
  onViewPortfolio: () => void;
}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState<number | null>(null);
  const [reasonChecked, setReasonChecked] = useState(false);
  const [sectorError, setSectorError] = useState('');
  const [guided, setGuided] = useState(Boolean(lessonId));
  const [receipt, setReceipt] = useState<TradeReceipt | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [receiptReason, setReceiptReason] = useState<number | null>(null);
  const [concentration, setConcentration] = useState('');
  const [pending, setPending] = useState(false);
  const [outboxReady, setOutboxReady] = useState(false);
  const [outboxError, setOutboxError] = useState('');
  const [receiptLesson, setReceiptLesson] = useState<LessonId | undefined>();
  const [loading, setLoading] = useState(true);
  const [receiptLoaded, setReceiptLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const orderRef = useRef<PendingOrder | null>(null);
  const submitting = useRef(false);
  const feedbackView = useRef<ComponentRef<typeof View>>(null);
  const scrolledReceiptId = useRef<string | null>(null);
  const reasonAttempts = useRef(0);

  async function showConfirmed(result: TradeReceipt, already: boolean) {
    setReceipt(result);
    setReceiptLesson(lessonId);
    setReceiptReason(0);
    setGuided(false);
    setAlreadyCompleted(already);
    orderRef.current = null;
    setPending(false);
    try {
      await AsyncStorage.removeItem(outboxKey(sessionId));
    } catch {
      setError('Order confirmed; saved retry will clear when reopened.');
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const [q, p] = await Promise.allSettled([getQuotes(), getPortfolio(sessionId)]);
    if (q.status === 'fulfilled') {
      setQuotes(q.value);
      setSymbol((current) =>
        q.value.some((item) => item.symbol === current) ? current : (q.value[0]?.symbol ?? ''),
      );
    } else {
      setQuotes([]);
      setError(`Quotes unavailable: ${message(q.reason)}`);
    }
    if (p.status === 'fulfilled') setPortfolio(p.value);
    else {
      setPortfolio(null);
      setError((current) =>
        [current, `Portfolio unavailable: ${message(p.reason)}`].filter(Boolean).join(' '),
      );
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    let active = true;
    setOutboxReady(false);
    setOutboxError('');
    Promise.all([AsyncStorage.getItem(outboxKey(sessionId)), getLessonTrade(sessionId, lessonId)])
      .then(async ([raw, existing]) => {
        if (!active) return;
        if (raw) {
          const saved = JSON.parse(raw) as PendingOrder;
          if (saved.lessonId !== lessonId)
            throw new Error('A different lesson has a pending order.');
          if (
            !existing &&
            (!saved.order?.id ||
              !saved.order.symbol ||
              !['buy', 'sell'].includes(saved.order.side) ||
              !Number.isSafeInteger(saved.order.quantity) ||
              !Array.isArray(saved.holdings) ||
              saved.intentRecorded !== true ||
              saved.order.side !== 'buy' ||
              saved.reason !== 0)
          )
            throw new Error('Saved order could not be read.');
          if (!existing) {
            saved.ambiguous = true;
            orderRef.current = saved;
            setSymbol(saved.order.symbol);
            setSide(saved.order.side);
            setQuantity(String(saved.order.quantity));
            setReason(saved.reason);
            setGuided(saved.guided);
            setPending(true);
            setError('An earlier order is awaiting confirmation. Retry it with the same order ID.');
          }
        }
        if (existing) {
          await showConfirmed(existing, true);
        }
        setReceiptLoaded(true);
        setOutboxReady(true);
      })
      .catch(() => {
        if (active)
          setOutboxError(
            'Could not check the lesson trade or saved order. Trading is paused; reopen to retry.',
          );
      });
    return () => {
      active = false;
    };
  }, [sessionId, lessonId]);
  const quote = quotes.find((item) => item.symbol === symbol);
  const whole =
    /^[1-9]\d*$/.test(quantity) &&
    Number.isSafeInteger(Number(quantity)) &&
    Number(quantity) <= 100000;
  const count = whole ? Number(quantity) : 0;
  const held = portfolio?.holdings.find((item) => item.symbol === symbol)?.quantity ?? 0;
  const validation = !whole
    ? 'Enter a whole number from 1 to 100,000 shares.'
    : side === 'sell' && count > held
      ? `You own ${held} ${symbol} shares.`
      : side === 'buy' && quote && portfolio && count * quote.price > portfolio.cash
        ? 'Not enough virtual cash at this quoted price.'
        : '';

  async function submit() {
    if (submitting.current || !outboxReady || !receiptLoaded || receipt || !lessonId) return;
    if (!orderRef.current) {
      setReasonChecked(true);
      const issue = portfolio
        ? lessonTradeIssue(lessonId, symbol, portfolio.holdings, sectors)
        : 'Portfolio unavailable.';
      setSectorError(
        issue === 'Choose a sector different from every holding.'
          ? '✕ This trade doesn’t fit diversification. Choose a company in a sector you don’t already hold.'
          : issue || '',
      );
      if (reason !== null) {
        reasonAttempts.current += 1;
        onEvent('trade_reason_attempt', {
          lessonId,
          symbol,
          sectorCorrect: !issue,
          selected: reason,
          correct: reason === 0,
          attempt: reasonAttempts.current,
          firstAttempt: reasonAttempts.current === 1,
        });
      }
      if (reason !== 0 || !portfolio || issue) return;
    }
    submitting.current = true;
    setBusy(true);
    setError('');
    let request = orderRef.current;
    try {
      if (!request) {
        if (!portfolio || !quote || validation || (guided && reason !== 0)) return;
        const order: TradeOrder = { id: Crypto.randomUUID(), symbol, side, quantity: count };
        request = {
          order,
          reason,
          holdings: portfolio.holdings,
          guided,
          lessonId,
          intentRecorded: true,
          ambiguous: false,
        };
        // A write failure prevents the network request entirely.
        await AsyncStorage.setItem(outboxKey(sessionId), JSON.stringify(request));
        orderRef.current = request;
        setPending(true);
        onEvent('trade_intent', {
          orderId: order.id,
          lessonId: guided ? lessonId : null,
          symbol,
          side,
          quantity: count,
          reason: guided && lessonId && reason !== null ? reasons[lessonId][reason] : null,
          reasonIndex: guided ? reason : null,
          cashAllocation: count * quote.price,
          cashBefore: portfolio.cash,
          holdingsBefore: portfolio.holdings,
        });
      }
      const result = await withTimeout(
        placeLessonTrade(sessionId, lessonId, request.order, request.reason!),
      );
      const already = result.id !== request.order.id;
      setConcentration(
        !already && request.guided && request.lessonId === 'diversification'
          ? concentrationFeedback(request.holdings, result)
          : '',
      );
      if (!already && (!request.guided || request.reason === 0))
        onEvent('trade_completed', {
          orderId: result.id,
          symbol: result.symbol,
          side: result.side,
          quantity: result.quantity,
          price: result.price,
          lessonId: request.lessonId || null,
          reasonIndex: request.reason,
          reasoningCorrect: request.guided ? request.reason === 0 : null,
          concentration:
            request.guided && request.lessonId === 'diversification'
              ? concentrationFeedback(request.holdings, result)
              : null,
        });
      await showConfirmed(result, already);
      try {
        setPortfolio(await withTimeout(getPortfolio(sessionId)));
      } catch {
        setPortfolio(null);
        setError((current) =>
          [current, 'Order confirmed, but your portfolio could not be refreshed.']
            .filter(Boolean)
            .join(' '),
        );
      }
    } catch (err) {
      if (!request || !orderRef.current) {
        setError(
          'Could not save the order. No order was sent; please check storage and try again.',
        );
      } else {
        const rejected =
          typeof err === 'object' && err !== null && 'code' in err && err.code === 'P0001';
        if (rejected) {
          try {
            const existing = await withTimeout(getLessonTrade(sessionId, lessonId));
            if (existing) {
              setConcentration('');
              await showConfirmed(existing, true);
            } else {
              await AsyncStorage.removeItem(outboxKey(sessionId));
              orderRef.current = null;
              setPending(false);
              setError(
                `Order rejected: ${message(err)} Refresh or adjust your order and try again.`,
              );
            }
          } catch {
            setError('Could not check or clear the saved order. Retry the same order.');
          }
        } else {
          request.ambiguous = true;
          setError(
            `Order outcome is not confirmed: ${message(err)} Retry this same order to check its outcome; no new order will be created.`,
          );
        }
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Animated.View entering={reveal} style={styles.screen}>
      <BackButton disabled={pending || busy} onPress={onBack} />
      <View style={styles.stack}>
        <Text style={styles.eyebrow}>Practice market · Virtual money</Text>
        <Text style={styles.title}>Your investing practice.</Text>
      </View>
      {guided && lessonId && (
        <View style={styles.softCard}>
          <Text style={styles.heading}>🎯 Your mission</Text>
          <Text style={styles.body}>
            {lessonId === 'ownership'
              ? 'Buy a share to practice ownership.'
              : 'Add a company from a sector you don’t own yet.'}
          </Text>
        </View>
      )}
      {outboxError ? (
        <View style={styles.goldCard} accessibilityLiveRegion="polite">
          <Text style={styles.body}>{outboxError}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.goldCard} accessibilityLiveRegion="polite">
          <Text style={styles.body}>{error}</Text>
        </View>
      ) : null}
      {!receipt && (
        <>
          <Button
            title={loading ? 'Refreshing…' : 'Refresh quotes and portfolio'}
            onPress={() => void refresh()}
            disabled={loading || busy || pending}
          />
          {loading && !portfolio && <ActivityIndicator color={colors.green} />}
          {portfolio && (
            <View style={styles.greenCard}>
              <Text style={[styles.eyebrow, styles.white]}>Total portfolio value</Text>
              <Text style={[styles.money, styles.white]}>
                {portfolio.valuationComplete ? dollars(portfolio.totalValue) : 'Prices unavailable'}
              </Text>
              <Text style={[styles.small, styles.white]}>
                Virtual cash {dollars(portfolio.cash)} · Holdings{' '}
                {portfolio.valuationComplete ? dollars(portfolio.holdingsValue) : 'awaiting prices'}
              </Text>
              {portfolio.holdings.some((h) => h.marketValue === null) && (
                <Text style={[styles.small, styles.white]}>
                  Some holding prices are unavailable; totals are incomplete.
                </Text>
              )}
              {portfolio.valuationComplete && (
                <Text style={[styles.small, styles.white]}>
                  Unrealized gain/loss {portfolio.unrealizedGain >= 0 ? '+' : '−'}
                  {dollars(Math.abs(portfolio.unrealizedGain))}
                </Text>
              )}
            </View>
          )}
          <View style={styles.stack}>
            <Text style={styles.heading}>Market quotes</Text>
            {!loading && quotes.length === 0 && (
              <Text style={styles.body}>No quotes available right now. Refresh to try again.</Text>
            )}
            {quotes.map((item) => {
              return (
                <Pressable
                  key={item.symbol}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: symbol === item.symbol,
                    disabled: busy || pending,
                  }}
                  disabled={busy || pending}
                  onPress={() => {
                    setSymbol(item.symbol);
                    setSectorError('');
                    setReceipt(null);
                  }}
                  style={[styles.card, symbol === item.symbol && local.selected]}
                >
                  <View style={styles.detailRow}>
                    <View style={local.companyRow}>
                      <CompanyLogo symbol={item.symbol} />
                      <View>
                        <Text style={styles.heading}>{item.name}</Text>
                        <Text style={styles.small}>
                          {item.symbol} · {companies[item.symbol]?.sector} · {item.currency}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.heading}>{dollars(item.price)}</Text>
                  </View>
                  <Text style={styles.small}>
                    {sourceName(item.source)} · As of {date(item.asOf)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {lessonId === 'diversification' &&
            portfolio &&
            !portfolio.holdings.some((h) => h.quantity > 0) &&
            onPreviousLesson && <Button title="Go to lesson 1" onPress={onPreviousLesson} />}
          {portfolio && (
            <View style={styles.card}>
              <Text style={styles.heading}>Your holdings</Text>
              {portfolio.holdings.length === 0 ? (
                <Text style={styles.body}>No shares yet.</Text>
              ) : (
                portfolio.holdings.map((h) => (
                  <View key={h.symbol} style={styles.stack}>
                    <Row
                      label={`${h.symbol} · ${h.quantity} shares`}
                      value={h.marketValue === null ? 'Price unavailable' : dollars(h.marketValue)}
                    />
                    <Text style={styles.small}>
                      Average cost {dollars(h.averageCost)} · Gain/loss{' '}
                      {h.gainLoss === null
                        ? 'unavailable'
                        : `${h.gainLoss >= 0 ? '+' : '−'}${dollars(Math.abs(h.gainLoss))}`}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
          {pending && (!quote || !portfolio) && (
            <View style={styles.card}>
              <Text style={styles.heading}>Pending order</Text>
              <Text style={styles.body}>
                {side === 'buy' ? 'Buy' : 'Sell'} {quantity} {symbol} shares
              </Text>
              <Text style={styles.small}>
                Retrying uses the original order ID, even if quotes or your portfolio are
                unavailable.
              </Text>
              <Button
                title={busy ? 'Submitting…' : 'Retry same order'}
                onPress={() => void submit()}
                disabled={busy || !outboxReady}
              />
            </View>
          )}
          {quote && portfolio && (
            <View style={styles.card}>
              <Text style={styles.heading}>Place an order</Text>
              <View style={local.sideRow}>
                {(['buy', 'sell'] as const).map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: side === item,
                      disabled: busy || pending || (guided && item === 'sell'),
                    }}
                    disabled={busy || pending || (guided && item === 'sell')}
                    onPress={() => {
                      setSide(item);
                      setReceipt(null);
                    }}
                    style={[
                      local.side,
                      side === item && local.selected,
                      item === 'sell' && local.sideDisabled,
                    ]}
                  >
                    <Text style={[styles.detailValue, item === 'sell' && local.disabledText]}>
                      {item === 'buy' ? 'Buy' : 'Sell'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.body}>
                {symbol} · {dollars(quote.price)} per share
              </Text>
              <Text style={styles.small}>Number of whole shares</Text>
              <TextInput
                accessibilityLabel="Number of whole shares"
                keyboardType="number-pad"
                value={quantity}
                editable={!busy && !pending}
                onChangeText={(value) => {
                  setQuantity(value);
                  setReceipt(null);
                }}
                style={local.input}
              />
              {whole && (
                <Text style={styles.small}>
                  {`Estimated ${side === 'buy' ? 'cost' : 'proceeds'}: ${dollars(count * quote.price)} · Actual fill price may differ.`}
                </Text>
              )}
              {validation ? <Text style={styles.incorrectText}>{validation}</Text> : null}
              {sectorError ? (
                <Text style={styles.incorrectText} accessibilityLiveRegion="polite">
                  {sectorError}
                </Text>
              ) : null}
              {guided && lessonId && (
                <View style={styles.stack}>
                  <Text style={styles.heading}>Why are you buying?</Text>
                  {reasonChecked ? (
                    <Options
                      options={reasons[lessonId]}
                      selected={reason}
                      correctAnswer={reasonChecked && reason !== null ? 0 : undefined}
                      onSelect={(selected) => {
                        setReason(selected);
                        setReasonChecked(false);
                      }}
                      disabled={busy || Boolean(orderRef.current)}
                    />
                  ) : (
                    <View style={styles.stack} accessibilityRole="radiogroup">
                      {reasons[lessonId].map((option, index) => (
                        <Pressable
                          key={option}
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked: reason === index,
                            disabled: busy || pending,
                          }}
                          disabled={busy || pending}
                          onPress={() => setReason(index)}
                          style={[styles.option, reason === index && local.neutralSelected]}
                        >
                          <Text style={styles.letter}>{String.fromCharCode(65 + index)}</Text>
                          <Text style={styles.optionText}>{option}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {reasonChecked && reason !== 0 && (
                    <Text style={styles.incorrectText} accessibilityLiveRegion="polite">
                      {reason === null
                        ? 'Choose a reason to continue.'
                        : lessonId === 'ownership'
                          ? 'A share is ownership, not a loan or a guarantee. Try again.'
                          : 'Diversification can reduce concentration, but cannot guarantee a profit. Try again.'}
                    </Text>
                  )}
                </View>
              )}
              <Button
                title={
                  busy
                    ? 'Submitting…'
                    : pending
                      ? 'Retry same order'
                      : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`
                }
                onPress={() => void submit()}
                disabled={
                  busy || !outboxReady || !receiptLoaded || (!pending && Boolean(validation))
                }
              />
            </View>
          )}
        </>
      )}
      {receipt && (
        <Animated.View
          entering={reveal}
          style={[
            styles.softCard,
            receiptReason !== null && receiptReason !== 0 && styles.incorrectCard,
          ]}
          accessibilityLiveRegion="polite"
          ref={feedbackView}
          onLayout={() => {
            if (feedbackView.current && scrolledReceiptId.current !== receipt.id) {
              scrolledReceiptId.current = receipt.id;
              onReceiptShown(feedbackView.current);
            }
          }}
        >
          <Text
            style={[
              styles.heading,
              receiptReason !== null && receiptReason !== 0 && styles.incorrectText,
            ]}
          >
            {alreadyCompleted
              ? '✓ Lesson trade already completed'
              : receiptReason === null
                ? 'Order confirmed ✓'
                : receiptReason === 0
                  ? '✓ Your explanation fits the lesson'
                  : '✕ Incorrect reasoning'}
          </Text>
          <Text style={styles.body}>
            {receipt.side === 'buy' ? 'Bought' : 'Sold'} {receipt.quantity} {receipt.symbol}{' '}
            {receipt.quantity === 1 ? 'share' : 'shares'} at {dollars(receipt.price)} each.
          </Text>
          <Row label="Total" value={dollars(receipt.total)} />
          <Row label="Virtual cash after" value={dollars(receipt.cashAfter)} />
          <Text style={styles.small}>
            Executed {date(receipt.executedAt)} · {sourceName(receipt.source)} quote as of{' '}
            {date(receipt.quoteAsOf)}
          </Text>
          {concentration ? <Text style={styles.body}>{concentration}</Text> : null}
          {receiptReason !== null && receiptLesson && (
            <>
              <Text style={styles.body}>
                {receiptLesson === 'ownership'
                  ? 'A share is a small ownership stake, not a loan or a promise of profit.'
                  : 'Diversification can reduce concentration, but it does not guarantee a profit.'}
              </Text>
            </>
          )}
          {receiptLesson === 'ownership' && receiptReason === 0 && onNextLesson && (
            <Button title="Continue to lesson 2" onPress={onNextLesson} />
          )}
          <Button title="View portfolio" onPress={onViewPortfolio} />
        </Animated.View>
      )}
      {portfolio && !receipt && (
        <View style={styles.stack}>
          <Text style={styles.heading}>Transaction history</Text>
          {portfolio.trades.length === 0 ? (
            <Text style={styles.body}>Your confirmed trades will appear here.</Text>
          ) : (
            portfolio.trades.map((trade) => (
              <View key={trade.id} style={styles.card}>
                <Row
                  label={`${trade.side === 'buy' ? 'Bought' : 'Sold'} ${trade.quantity} ${trade.symbol}`}
                  value={dollars(trade.total)}
                />
                <Text style={styles.small}>
                  {dollars(trade.price)} per share · {date(trade.executedAt)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </Animated.View>
  );
}

const local = StyleSheet.create({
  selected: { borderColor: colors.green, backgroundColor: colors.pale },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sideDisabled: { backgroundColor: '#eeeeeb', borderColor: '#d4d4d0' },
  neutralSelected: { borderColor: colors.ink, backgroundColor: '#f2f2ef' },
  disabledText: { color: '#8a8a85' },
  sideRow: { flexDirection: 'row', gap: 10 },
  side: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    color: colors.ink,
    backgroundColor: colors.white,
  },
});
