import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import CompanyLogo from '../components/CompanyLogo';
import { BackButton, Button } from '../components/UI';
import { companies } from '../companies';
import type { Portfolio } from '../domain';
import { getPortfolio } from '../services/market';
import { styles } from '../styles';

const money = (value: number) => `$${value.toFixed(2)}`;
const change = (value: number) => `${value < 0 ? '−' : '+'}${money(Math.abs(value))}`;

export default function PortfolioScreen({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setPortfolio(null);
    setError(false);
    getPortfolio(sessionId)
      .then((result) => {
        if (active) setPortfolio(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [sessionId, attempt]);
  return (
    <>
      <BackButton onPress={onBack} />
      <Text style={styles.title}>Your portfolio</Text>
      {error ? (
        <View style={styles.softCard}>
          <Text style={styles.body}>
            Couldn’t load your portfolio. Check your connection and try again.
          </Text>
          <Button title="Try again" onPress={() => setAttempt((n) => n + 1)} />
        </View>
      ) : !portfolio ? (
        <Text style={styles.body}>Loading your portfolio…</Text>
      ) : (
        <>
          <View style={styles.greenCard}>
            <Text style={[styles.eyebrow, styles.white]}>Total value</Text>
            <Text style={[styles.money, styles.white]}>
              {portfolio.valuationComplete ? money(portfolio.totalValue) : 'Unavailable'}
            </Text>
            <Text style={[styles.small, styles.white]}>Virtual money</Text>
          </View>
          <View style={styles.statGrid}>
            <View style={styles.stat}>
              <Text style={styles.small}>Virtual cash</Text>
              <Text style={styles.heading}>{money(portfolio.cash)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.small}>Holdings value</Text>
              <Text style={styles.heading}>
                {portfolio.valuationComplete ? money(portfolio.holdingsValue) : 'Unavailable'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.small}>Unrealized gain / loss</Text>
              <Text
                style={[
                  styles.heading,
                  portfolio.unrealizedGain < 0 ? styles.incorrectText : styles.correctText,
                ]}
              >
                {portfolio.valuationComplete ? change(portfolio.unrealizedGain) : 'Unavailable'}
              </Text>
            </View>
          </View>
          <Text style={styles.heading}>Holdings</Text>
          {portfolio.holdings.length === 0 ? (
            <Text style={styles.body}>No holdings yet.</Text>
          ) : (
            portfolio.holdings.map((holding) => (
              <View key={holding.symbol} style={styles.card}>
                <View style={styles.row}>
                  <CompanyLogo symbol={holding.symbol} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heading}>
                      {companies[holding.symbol]?.name || holding.symbol}
                    </Text>
                    <Text style={styles.small}>
                      {holding.symbol} · {companies[holding.symbol]?.sector || 'Other'}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.body}>
                    {holding.quantity} {holding.quantity === 1 ? 'share' : 'shares'} ·{' '}
                    {holding.price === null
                      ? 'Price unavailable'
                      : `${money(holding.price)} / share`}
                  </Text>
                  <Text style={styles.detailValue}>
                    {holding.marketValue === null ? 'Unavailable' : money(holding.marketValue)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.small,
                    holding.gainLoss === null
                      ? undefined
                      : holding.gainLoss < 0
                        ? styles.incorrectText
                        : styles.correctText,
                  ]}
                >
                  {holding.gainLoss === null
                    ? 'Gain / loss unavailable'
                    : `${change(holding.gainLoss)} unrealized · ${money(holding.averageCost)} average cost`}
                </Text>
              </View>
            ))
          )}
          <Text style={styles.heading}>Recent activity</Text>
          {portfolio.trades.length === 0 ? (
            <Text style={styles.body}>No practice trades yet.</Text>
          ) : (
            portfolio.trades.map((trade) => (
              <View key={trade.id} style={styles.card}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {trade.side === 'buy' ? 'Bought' : 'Sold'} {trade.quantity} {trade.symbol}
                  </Text>
                  <Text style={styles.detailValue}>{money(trade.total)}</Text>
                </View>
                <Text style={styles.small}>
                  {money(trade.price)} per share · {new Date(trade.executedAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </>
  );
}
