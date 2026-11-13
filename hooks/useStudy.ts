import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LearnerProgress, LessonDraft, LessonId, LessonResult, StudySession } from '../domain';
import {
  contentVersion,
  enforceLessonOrder,
  initialProgress,
  isProgress,
  lessonAvailable,
  restoreProgress,
} from '../progress';
import { progressStorage } from '../storage';
import {
  completeLesson,
  initializeSession,
  saveProgress,
  startNewSession,
} from '../services/backend';
import { flushEvents, queueEvent } from '../services/events';

export function useStudy() {
  const [session, setSession] = useState<StudySession | null>(null);
  const [progress, setProgress] = useState<LearnerProgress>(initialProgress);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const locked = useRef(false);
  const latestProgress = useRef(initialProgress);
  const cacheWrites = useRef<Promise<void>>(Promise.resolve());
  const serverWrites = useRef<Promise<void>>(Promise.resolve());

  function syncProgress(sessionId: string, next: LearnerProgress) {
    const write = serverWrites.current.catch(() => {}).then(() => saveProgress(sessionId, next));
    serverWrites.current = write;
    return write;
  }

  function updateProgress(next: LearnerProgress) {
    latestProgress.current = next;
    setProgress(next);
  }

  // Serialize local writes so rapid answers and navigation cannot overwrite each other.
  function cache(next: LearnerProgress, pending = true) {
    if (!session) return Promise.resolve();
    const write = cacheWrites.current
      .catch(() => {})
      .then(() => progressStorage.save(session, next, pending));
    cacheWrites.current = write;
    return write;
  }

  function saveDraft(lessonId: LessonId, draft: LessonDraft) {
    if (!session || locked.current) return;
    const current = latestProgress.current;
    const next = { ...current, lessonDrafts: { ...current.lessonDrafts, [lessonId]: draft } };
    updateProgress(next);
    void cache(next).catch(() =>
      setSyncMessage('Couldn’t save your lesson on this device. Please check available storage.'),
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    let cached = null;
    try {
      cached = await progressStorage.load();
    } catch {
      /* Restore from the server below. */
    }
    try {
      const current = await initializeSession();
      const remote = isProgress(current.progress) ? current.progress : initialProgress;
      const restored =
        cached?.session.id === current.id && cached.pending
          ? restoreProgress(remote, cached.progress)
          : remote;
      const next = enforceLessonOrder(restored);
      if (cached?.session.id === current.id && cached.pending) await saveProgress(current.id, next);
      await progressStorage.save(current, next);
      setSession(current);
      updateProgress(next);
      setSyncMessage('');
    } catch (cause) {
      if (cached) {
        setSession(cached.session);
        updateProgress(enforceLessonOrder(cached.progress));
        setSyncMessage('Offline · learning progress is saved on this device. Reconnect to sync.');
      } else
        setError(
          cause instanceof Error ? cause.message : 'Unable to connect to your study session.',
        );
    } finally {
      setLoading(false);
    }
  }, []);

  const event = useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
      if (!session) return;
      return queueEvent(session.id, type, {
        ...payload,
        appVersion: contentVersion,
        experiment: 'ownership-price-direction-v1',
        variant: session.variant,
      }).catch(() => {
        setSyncMessage(
          'Study events could not be saved on this device. Please check available storage.',
        );
      });
    },
    [session],
  );

  const sync = useCallback(
    async (whileLocked = false) => {
      if (!session || (locked.current && !whileLocked)) return false;
      try {
        await cacheWrites.current;
        if (locked.current && !whileLocked) return false;
        const snapshot = latestProgress.current;
        const cached = await progressStorage.load();
        if (locked.current && !whileLocked) return false;
        if (cached?.session.id === session.id && cached.pending) {
          await syncProgress(session.id, cached.progress);
          if (latestProgress.current === snapshot) {
            await cache(cached.progress, false);
          }
        }
        await flushEvents();
        setSyncMessage('');
        return true;
      } catch {
        setSyncMessage(
          'Some data is waiting to sync. It stays on this device until you reconnect.',
        );
        return false;
      }
    },
    [session],
  );

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!session) return;
    void sync();
    const timer = setInterval(() => {
      void sync();
    }, 15000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [session, sync]);

  async function persist(next: LearnerProgress) {
    if (!session) return;
    updateProgress(next);
    await cache(next);
    try {
      await syncProgress(session.id, next);
      if (latestProgress.current === next) await cache(next, false);
      setSyncMessage('');
    } catch {
      setSyncMessage('Progress saved on this device · waiting to sync.');
    }
  }

  async function save(changes: Partial<LearnerProgress>) {
    if (!session || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await persist(enforceLessonOrder({ ...latestProgress.current, ...changes }));
    } catch {
      setError('Couldn’t save progress. Please try again.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function finish(lessonId: LessonId, result: LessonResult) {
    if (!session || locked.current) return;
    if (!lessonAvailable(latestProgress.current, lessonId)) {
      setError('Complete lesson 1 to unlock lesson 2.');
      return;
    }
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await serverWrites.current.catch(() => {});
      await completeLesson(session.id, lessonId, result);
      const current = latestProgress.current;
      const lessonDrafts = { ...current.lessonDrafts };
      delete lessonDrafts[lessonId];
      await persist({
        ...current,
        lessonDrafts,
        lessons: { ...current.lessons, [lessonId]: result },
        activeLesson: lessonId,
        practiceLesson: lessonId,
        screen: 'market',
      });
      await event('lesson_completed', { lessonId, result });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Couldn’t finish the lesson. Please reconnect and try again.',
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
    void sync();
  }

  async function reset() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      if (!(await sync(true))) throw new Error('Reconnect before starting a new session.');
      const current = await startNewSession();
      await cacheWrites.current;
      await progressStorage.save(current, initialProgress);
      setSession(current);
      updateProgress(initialProgress);
      setSyncMessage('');
    } catch {
      setError('Reset needs a connection. Your current session has been kept.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return {
    session,
    progress,
    loading,
    busy,
    error,
    syncMessage,
    load,
    save,
    saveDraft,
    finish,
    reset,
    sync,
    event,
  };
}
