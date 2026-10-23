# Sprout

A small Expo Go learning prototype: find your starting point, learn what a stock is, and buy one mock share. Cream-and-green UI inspired by the supplied storyboard.

## Run

Use Node 22 LTS (22.13 or newer in the 22.x series) and Expo Go with SDK 58 support.

```sh
npm install
npm start
```

Scan the terminal QR code with Expo Go on Android or the Camera app on iOS. Phone and computer should be on the same network. No accounts, API keys, or backend setup required. The project uses Expo SDK 58 with Expo-aligned dependencies.

For an optional browser preview, run `npm run web`.

## Prototype flow

1. Two placement questions and a confidence rating (1–5).
2. A score-based recommendation. Everyone takes the one available lesson.
3. An interactive bakery ownership example and one comprehension check, with green/red answer feedback, the correct answer revealed, and distinct success/error haptics. Onboarding and reflection quizzes stay neutral. Haptics depend on device support; visual feedback is always shown.
4. A one-time $1,000 virtual reward, 120 learning XP, and a one-day learning streak.
5. A situation: buy one mock AAPL share for $225 and explain why. Feedback judges the reasoning, including incorrect beliefs about guaranteed profits or loans.
6. The trade result first checks the selected reasoning with an explicit correct/incorrect verdict and a short takeaway. A separate next step shows a drop to $210, unchanged ownership, and a $985 portfolio ($775 cash + $210 holding).
7. Two follow-up questions and another confidence rating, with a before/after summary.

All money and prices are fictional fixtures. There is no live market connection, real order, or cash value. The exercise evaluates conceptual reasoning, not whether Apple is an appropriate real investment. The streak is one day while the completed lesson is today or yesterday, then zero; there are no additional daily lessons in this prototype.

## Code map

- `App.tsx`: saved screen flow, reward summary, reset, and loading/error handling.
- `screens/`: onboarding/reflection, lesson/check, and practice/result.
- `components/UI.tsx`: shared button, answer options, progress bar, and footer.
- `components/motion.ts`: Reanimated presets for page and quiz transitions, feedback reveals, and reward celebrations. Animations respect the device's reduced-motion setting; there are no custom animation loops or keyframes.
- `content.ts`: curated questions, answer keys, reward constants, and mock stock.
- `progress.ts`: progress types, validation, scoring, and local calendar streak.
- `storage.ts`: the only AsyncStorage dependency. Replace `load` and `save` to connect a backend while keeping screens independent of the provider.
- `styles.ts`: shared colors and styles.

Progress is saved locally after each screen transition. Closing the app within a quiz restarts that quiz; completed quiz results and lesson/trade milestones resume. Nothing is uploaded. Reset prototype clears this app’s learning session after confirmation. Rewards and the single holding are derived from saved milestones, so resuming or reviewing does not award them again.

## Check

```sh
npm run typecheck
npm test
npx expo install --check
npx expo export --platform ios --platform android
```

Tests cover saved-progress consistency, malformed data, quiz scoring, and streak dates. Final device layout and touch behavior should also be checked in Expo Go.
