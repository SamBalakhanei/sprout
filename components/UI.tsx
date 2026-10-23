import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';

export function Button({
  title,
  onPress,
  disabled = false,
  tone = 'success',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'success' | 'error';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'error' && styles.incorrectButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function Options({
  options,
  selected,
  onSelect,
  disabled = false,
  correctAnswer,
}: {
  options: string[];
  selected: number | null;
  onSelect: (index: number) => void;
  disabled?: boolean;
  correctAnswer?: number;
}) {
  return (
    <View style={styles.stack} accessibilityRole="radiogroup">
      {options.map((option, index) => {
        const right = correctAnswer === index;
        const wrong = correctAnswer !== undefined && selected === index && !right;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === index, disabled }}
            accessibilityLabel={
              right ? `Correct answer: ${option}` : wrong ? `Incorrect answer: ${option}` : option
            }
            disabled={disabled}
            onPress={() => onSelect(index)}
            style={({ pressed }) => [
              styles.option,
              selected === index && styles.selected,
              right && styles.selected,
              wrong && styles.incorrectOption,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.letter, wrong && styles.incorrectText]}>
              {wrong ? '✕' : right || selected === index ? '✓' : String.fromCharCode(65 + index)}
            </Text>
            <Text
              style={[
                styles.optionText,
                right && styles.correctText,
                wrong && styles.incorrectText,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Footer({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <View style={[styles.fill, { width: `${value * 100}%` }]} />
    </View>
  );
}
