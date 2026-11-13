import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type {
  LearnerProgress,
  LessonId,
  LessonResult,
  StudyEvent,
  StudySession,
  Variant,
} from '../domain';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const backendConfigured = Boolean(
  url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_'),
);
// Bound network calls, including auth and Edge Functions, while honoring caller cancellation.
const timedFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const original = init?.signal;
  const cancel = () => controller.abort();
  if (original?.aborted) cancel();
  else original?.addEventListener('abort', cancel, { once: true });
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    original?.removeEventListener('abort', cancel);
  }
};
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder',
  {
    global: { fetch: timedFetch },
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

type SessionRow = {
  id: string;
  variant: Variant;
  created_at: string;
  progress: LearnerProgress | Record<string, never> | null;
};
function session(row: SessionRow): StudySession {
  return {
    id: row.id,
    variant: row.variant,
    createdAt: row.created_at,
    progress:
      row.progress && Object.keys(row.progress).length ? (row.progress as LearnerProgress) : null,
  };
}
export async function initializeSession(): Promise<StudySession> {
  if (!backendConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) throw signInError;
  }
  const result = await supabase.rpc('current_study_session');
  if (result.error) throw result.error;
  return session(result.data);
}
export async function startNewSession(): Promise<StudySession> {
  const { data, error } = await supabase.rpc('new_study_session');
  if (error) throw error;
  return session(data);
}
export async function saveProgress(sessionId: string, progress: LearnerProgress): Promise<void> {
  const { data, error } = await supabase
    .from('study_sessions')
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Session is no longer active');
}
export async function recordEvents(sessionId: string, events: StudyEvent[]): Promise<void> {
  if (!events.length) return;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error || new Error('Authentication required');
  const rows = events.map((event) => ({
    event_id: event.id,
    user_id: data.user.id,
    session_id: sessionId,
    event,
  }));
  const result = await supabase
    .from('study_events')
    .upsert(rows, { onConflict: 'event_id', ignoreDuplicates: true });
  if (result.error) throw result.error;
}
export async function completeLesson(
  sessionId: string,
  lessonId: LessonId,
  result: LessonResult,
): Promise<void> {
  const response = await supabase.rpc('complete_lesson', {
    p_session_id: sessionId,
    p_lesson_id: lessonId,
    p_result: result,
  });
  if (response.error) throw response.error;
}
export async function exportStudyData(): Promise<{
  sessions: unknown[];
  events: unknown[];
  trades: unknown[];
}> {
  const [sessions, events, trades] = await Promise.all([
    supabase.from('study_sessions').select('*').order('created_at'),
    supabase.from('study_events').select('*').order('created_at'),
    supabase.from('trades').select('*').order('created_at'),
  ]);
  if (sessions.error || events.error || trades.error)
    throw sessions.error || events.error || trades.error;
  return { sessions: sessions.data || [], events: events.data || [], trades: trades.data || [] };
}
