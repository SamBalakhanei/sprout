import {
  BounceIn,
  FadeInDown,
  FadeInRight,
  FadeInUp,
  FadeOutUp,
  ReduceMotion,
  ZoomIn,
} from 'react-native-reanimated';

// Library presets only; respect the device's reduced-motion preference.
export const pageEnter = FadeInRight.duration(280).reduceMotion(ReduceMotion.System);
export const reveal = FadeInDown.duration(250).reduceMotion(ReduceMotion.System);
export const popIn = ZoomIn.duration(300).reduceMotion(ReduceMotion.System);
export const celebrate = BounceIn.duration(650).reduceMotion(ReduceMotion.System);
export const noticeEnter = FadeInUp.duration(250).reduceMotion(ReduceMotion.System);
export const noticeExit = FadeOutUp.duration(200).reduceMotion(ReduceMotion.System);
