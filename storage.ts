import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearnerProgress, StudySession } from './domain';
import { isProgress } from './progress';

const key = 'sprout.progress.v2';
export type CachedStudy = { session: StudySession; progress: LearnerProgress; pending?: boolean };

export const progressStorage = {
  async load(): Promise<CachedStudy | null> {
    const saved = await AsyncStorage.getItem(key);
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    const item = parsed as CachedStudy;
    if (
      !item?.session?.id ||
      !['gain', 'loss'].includes(item.session.variant) ||
      !isProgress(item.progress)
    ) {
      throw new Error('Saved progress is not valid. Reconnect to restore it.');
    }
    return item;
  },
  async save(session: StudySession, progress: LearnerProgress, pending = false) {
    await AsyncStorage.setItem(key, JSON.stringify({ session, progress, pending }));
  },
};
