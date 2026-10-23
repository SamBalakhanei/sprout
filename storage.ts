import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialProgress, isProgress, Progress } from './progress';

const key = 'sprout.progress.v1';

// Keep persistence here so screens do not depend on a storage provider.
export const progressStorage = {
  async load(): Promise<Progress> {
    const saved = await AsyncStorage.getItem(key);
    if (!saved) return { ...initialProgress };
    const parsed: unknown = JSON.parse(saved);
    if (!isProgress(parsed)) throw new Error('Saved progress is not valid.');
    return parsed;
  },
  async save(progress: Progress) {
    await AsyncStorage.setItem(key, JSON.stringify(progress));
  },
};
