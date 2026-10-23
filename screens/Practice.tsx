import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { pageEnter, popIn } from '../components/motion';
import { Button, Footer, Options } from '../components/UI';
import { lessonReward, mockStock, tradeReasons } from '../content';
import { styles } from '../styles';

export const money = (value: number) => `$${value.toFixed(2)}`;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function Practice({ onBuy, busy }: { onBuy: (reason: number) => void; busy: boolean }) {
  const [reason, setReason] = useState<number | null>(null);
  return (
    <>
      <Text style={styles.eyebrow}>✓ Learn → 2 · Practice → 3 · Reflect</Text>
      <Text style={styles.title}>Put ownership into practice.</Text>
      <View style={styles.softCard}>
        <Text style={styles.heading}>🎯 Your mission</Text>
        <Text style={styles.body}>
          The bakery taught you what a share means. Now buy one Apple share with virtual cash.
        </Text>
        <Text style={styles.takeaway}>Same idea. A different company.</Text>
      </View>
      <View style={styles.card}>
        <DetailRow label="Your virtual cash" value={money(lessonReward)} />
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <View style={styles.stack}>
            <Text style={styles.heading}>{mockStock.name}</Text>
            <Text style={styles.small}>{mockStock.symbol} · Stock price</Text>
          </View>
          <Text style={styles.money}>{money(mockStock.price)}</Text>
        </View>
        <DetailRow label="You’ll buy" value="1 share · No fees" />
        <DetailRow label="Cash left after buying" value={money(lessonReward - mockStock.price)} />
      </View>
      <View style={styles.stack}>
        <Text style={styles.heading}>What’s your reason for buying?</Text>
        <Text style={styles.small}>Choose your reasoning, then place your practice order.</Text>
      </View>
      <Options options={tradeReasons} selected={reason} onSelect={setReason} disabled={busy} />
      <Footer>
        <Button
          title="Buy 1 share & check my reasoning"
          onPress={() => {
            if (reason !== null) onBuy(reason);
          }}
          disabled={reason === null || busy}
        />
        <Text style={styles.small}>$225 virtual · No real money is spent.</Text>
      </Footer>
    </>
  );
}

export function TradeResult({
  reason,
  onOutcomeShown,
  onComplete,
  busy,
}: {
  reason: number;
  onOutcomeShown: () => void;
  onComplete: () => void;
  busy: boolean;
}) {
  const [showOutcome, setShowOutcome] = useState(false);
  const correct = reason === 0;
  const cash = lessonReward - mockStock.price;
  const loss = mockStock.price - mockStock.laterPrice;

  if (!showOutcome) {
    return (
      <>
        <Text style={styles.eyebrow}>Practice / 1 of 2 · Your reasoning</Text>
        <Animated.View
          entering={popIn}
          style={[styles.verdict, !correct && styles.incorrectOption]}
          accessibilityLiveRegion="polite"
        >
          <Text style={[styles.verdictIcon, !correct && styles.incorrectText]}>
            {correct ? '✓' : '✕'}
          </Text>
          <Text style={[styles.title, correct ? styles.correctText : styles.incorrectText]}>
            {correct ? 'Correct reasoning!' : 'Incorrect reasoning'}
          </Text>
          <Text style={styles.heading}>
            {correct ? 'You understood the lesson.' : 'Let’s clear up one idea.'}
          </Text>
        </Animated.View>
        <View style={styles.stack}>
          <Text style={styles.eyebrow}>You chose</Text>
          <Text style={styles.quote}>“{tradeReasons[reason]}”</Text>
        </View>
        <View style={styles.softCard}>
          <Text style={styles.heading}>
            {correct ? '🌱 Why you’re right' : '🌱 The idea to remember'}
          </Text>
          <Text style={styles.takeaway}>
            {reason === 1
              ? 'Ownership does not guarantee profit.'
              : reason === 2
                ? 'A share is ownership, not a loan.'
                : 'A share makes you a part-owner.'}
          </Text>
          <Text style={styles.body}>
            {reason === 2
              ? 'Apple does not owe you your $225 back. Your share’s value can rise or fall.'
              : 'You own part of the company, and your share’s value can rise or fall.'}
          </Text>
        </View>
        <DetailRow label="Practice order filled" value="1 AAPL share · $225 virtual" />
        <Footer>
          <Button
            title="Next: see the price change"
            disabled={busy}
            onPress={() => setShowOutcome(true)}
          />
          <Text style={styles.small}>
            Your reasoning is checked against the lesson, not trading profit.
          </Text>
        </Footer>
      </>
    );
  }

  return (
    <Animated.View entering={pageEnter} style={styles.screen} onLayout={onOutcomeShown}>
      <Text style={styles.eyebrow}>Practice / 2 of 2 · What happens next</Text>
      <Text style={styles.title}>Prices change. You’re still an owner.</Text>
      <View style={styles.goldCard}>
        <Text style={styles.eyebrow}>Imagine the next day · AAPL</Text>
        <View style={styles.priceChange}>
          <Text style={styles.previousPrice}>{money(mockStock.price)}</Text>
          <Text style={styles.heading}>→</Text>
          <Text style={styles.money}>{money(mockStock.laterPrice)}</Text>
        </View>
        <Text style={[styles.heading, styles.incorrectText]}>↓ {money(loss)} in share value</Text>
      </View>
      <View style={styles.softCard}>
        <Text style={styles.takeaway}>1 share before. 1 share after.</Text>
        <Text style={styles.body}>The price fell. Your ownership stayed the same.</Text>
        <Text style={styles.heading}>
          {correct
            ? 'Your reasoning was still correct.'
            : 'The lesson still applies: profit isn’t guaranteed.'}
        </Text>
      </View>
      <Text style={styles.heading}>Your practice portfolio</Text>
      <View style={styles.statGrid}>
        <View style={styles.stat}>
          <Text style={styles.small}>Virtual cash</Text>
          <Text style={styles.heading}>{money(cash)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.small}>1 AAPL share</Text>
          <Text style={styles.heading}>{money(mockStock.laterPrice)}</Text>
        </View>
      </View>
      <View style={styles.greenCard}>
        <Text style={[styles.eyebrow, styles.white]}>Total portfolio value</Text>
        <Text style={[styles.money, styles.white]}>{money(cash + mockStock.laterPrice)}</Text>
        <Text style={[styles.small, styles.white]}>
          Started at {money(lessonReward)} · Down {money(loss)} · Virtual money only
        </Text>
      </View>
      <Footer>
        <Button title="Next: check what I learned" onPress={onComplete} disabled={busy} />
      </Footer>
    </Animated.View>
  );
}
