import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LessonId } from '../domain';
import { colors, styles } from '../styles';

export default function LessonIllustration({ lessonId }: { lessonId: LessonId }) {
  const [shares, setShares] = useState<number[]>([]);
  const [spread, setSpread] = useState(false);
  return (
    <View style={styles.softCard}>
      <Text style={styles.heading}>
        {lessonId === 'ownership' ? '🥖 The little bakery' : '🧺 What’s in your basket?'}
      </Text>
      {lessonId === 'ownership' ? (
        <>
          <Text style={styles.heading}>Tap the shares to build your stake</Text>
          <View style={styles.shares}>
            {Array.from({ length: 10 }, (_, index) => (
              <Pressable
                key={index}
                accessibilityRole="checkbox"
                accessibilityLabel={`Share ${index + 1}`}
                accessibilityState={{ checked: shares.includes(index) }}
                style={[styles.share, shares.includes(index) && styles.ownedShare]}
                onPress={() =>
                  setShares((current) =>
                    current.includes(index)
                      ? current.filter((value) => value !== index)
                      : [...current, index],
                  )
                }
              >
                <Text
                  style={[styles.shareText, !shares.includes(index) && { color: colors.green }]}
                >
                  {shares.includes(index) ? '✓' : '+'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.takeaway}>
            {shares.length} of 10 shares = {shares.length * 10}% ownership
          </Text>
        </>
      ) : (
        <>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !spread }}
              style={[styles.option, !spread && styles.selected]}
              onPress={() => setSpread(false)}
            >
              <Text style={styles.optionText}>One company</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: spread }}
              style={[styles.option, spread && styles.selected]}
              onPress={() => setSpread(true)}
            >
              <Text style={styles.optionText}>Three industries</Text>
            </Pressable>
          </View>
          <Text style={styles.heading}>{spread ? '💻  🥖  🏦' : '💻  💻  💻'}</Text>
          <Text style={styles.body}>
            {spread
              ? 'Different companies and industries spread exposure. A broad market drop can still affect all of them.'
              : 'Three shares of one company are still dependent on that one company.'}
          </Text>
        </>
      )}
    </View>
  );
}
