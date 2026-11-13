import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { StudyEvent } from '../domain';
import { recordEvents } from './backend';

const key = 'sprout.events.v1';
type QueuedEvent = StudyEvent & { sessionId: string };
let pending: Promise<unknown> = Promise.resolve();

// Serialize queue writes and uploads, so an upload cannot delete a newly added event.
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work, work);
  pending = result.catch(() => {});
  return result;
}

export function queueEvent(sessionId: string, type: string, payload: Record<string, unknown>) {
  const event: QueuedEvent = {
    id: Crypto.randomUUID(),
    sessionId,
    type,
    payload,
    occurredAt: new Date().toISOString(),
  };
  return serialize(async () => {
    const events: QueuedEvent[] = JSON.parse((await AsyncStorage.getItem(key)) || '[]');
    events.push(event);
    await AsyncStorage.setItem(key, JSON.stringify(events));
  });
}

export function flushEvents(): Promise<number> {
  return serialize(async () => {
    const events: QueuedEvent[] = JSON.parse((await AsyncStorage.getItem(key)) || '[]');
    const sessions = [...new Set(events.map((event) => event.sessionId))];
    for (const sessionId of sessions) {
      await recordEvents(
        sessionId,
        events
          .filter((event) => event.sessionId === sessionId)
          .map(({ sessionId: _, ...event }) => event),
      );
      const remaining: QueuedEvent[] = JSON.parse((await AsyncStorage.getItem(key)) || '[]');
      await AsyncStorage.setItem(
        key,
        JSON.stringify(remaining.filter((event) => event.sessionId !== sessionId)),
      );
    }
    return events.length;
  });
}
