import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Footer, Options } from '../components/UI';
import { lessonReward, mockStock, tradeReasons } from '../content';
import { styles } from '../styles';

export const money = (value: number) => `$${value.toFixed(2)}`;

export function Practice({ onBuy, busy }: { onBuy: (reason: number) => void; busy: boolean }) {
  const [reason, setReason] = useState<number | null>(null);
  return (
    <>
      <Text style={styles.eyebrow}>Lesson checkpoint / Put it into practice</Text>
      <Text style={styles.title}>Your first little slice.</Text>
      <View style={styles.softCard}>
        <Text style={styles.heading}>Your situation</Text>
        <Text style={styles.body}>
          You have $1,000 in play money. Your task is to buy one share of Apple to practice becoming
          a part-owner, knowing the price could fall.
        </Text>
      </View>
      <View style={styles.greenCard}>
        <Text style={[styles.small, styles.white]}>VIRTUAL CASH · NO REAL MONEY</Text>
        <Text style={[styles.money, styles.white]}>{money(lessonReward)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>
          {mockStock.name} · {mockStock.symbol}
        </Text>
        <Text style={styles.money}>{money(mockStock.price)}</Text>
        <Text style={styles.small}>Fixed mock price · 1 share · No fees</Text>
        <Text style={styles.body}>
          Cash after purchase: {money(lessonReward - mockStock.price)}
        </Text>
      </View>
      <Text style={styles.heading}>Why are you making this trade?</Text>
      <Options options={tradeReasons} selected={reason} onSelect={setReason} disabled={busy} />
      <Footer>
        <Button
          title="Buy 1 share · $225 virtual"
          onPress={() => {
            if (reason !== null) onBuy(reason);
          }}
          disabled={reason === null || busy}
        />
        <Text style={styles.small}>
          A scripted learning exercise. These prices are not live market data.
        </Text>
      </Footer>
    </>
  );
}

export function TradeResult({
  reason,
  onComplete,
  busy,
}: {
  reason: number;
  onComplete: () => void;
  busy: boolean;
}) {
  const cash = lessonReward - mockStock.price;
  const change = mockStock.laterPrice - mockStock.price;
  return (
    <>
      <Text style={styles.badge}>✓ Simulated order filled</Text>
      <Text style={styles.title}>You own a little piece of Apple.</Text>
      <Text style={styles.body}>
        You bought 1 AAPL share at a mock price of $225. No real money moved.
      </Text>
      <View style={styles.softCard}>
        <Text style={styles.heading}>
          {reason === 0 ? 'Good choice for this situation.' : 'This choice needs a rethink.'}
        </Text>
        <Text style={styles.body}>
          {reason === 0
            ? 'Your reason fits the goal: practice ownership with a small part of your virtual cash, accepting that prices can fall.'
            : reason === 1
              ? 'Buying stock does not guarantee a profit. You became a part-owner, and the price can fall. A better reason here is to practice ownership while accepting that uncertainty.'
              : 'A share is ownership, not a loan. Apple does not owe you your purchase price back. A better reason here is to practice owning a small stake while accepting price changes.'}
        </Text>
      </View>
      <View style={styles.goldCard}>
        <Text style={styles.eyebrow}>Imagine the next day…</Text>
        <Text style={styles.heading}>The mock price falls to {money(mockStock.laterPrice)}.</Text>
        <Text style={styles.body}>
          Your share is now worth $15 less. You still own the same one share. A price drop alone
          does not tell us whether your original reasoning was sound.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Your practice portfolio</Text>
        <Text style={styles.body}>Virtual cash: {money(cash)}</Text>
        <Text style={styles.body}>1 AAPL share: {money(mockStock.laterPrice)}</Text>
        <Text style={styles.body}>Unrealized change: −{money(Math.abs(change))}</Text>
        <Text style={styles.heading}>Total value: {money(cash + mockStock.laterPrice)}</Text>
        <Text style={styles.small}>
          The purchase left total value at $1,000. This scripted price drop brings it to $985. This
          is an illustration, not a forecast.
        </Text>
      </View>
      <Footer>
        <Button title="See what I learned" onPress={onComplete} disabled={busy} />
      </Footer>
    </>
  );
}
