import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal in-memory localStorage stub (vitest default env is node).
function ensureLocalStorageStub() {
  const g = globalThis as Record<string, unknown>;
  if (g['localStorage']) return;
  const store = new Map<string, string>();
  g['localStorage'] = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  // crypto.randomUUID exists in node; nothing else needed.
  vi.stubGlobal('localStorage', g['localStorage']);
}

ensureLocalStorageStub();
import {
  STORAGE_KEY,
  deleteMessage,
  getSavedMessages,
  saveMessage,
  updateMessage,
} from '../storage';

beforeEach(() => {
  localStorage.clear();
});

describe('saved messages storage', () => {
  it('creates and reads messages', () => {
    const created = saveMessage('Payment Reminder', 'Hello Sir, pay please.');
    expect(created.id).toBeTruthy();
    const all = getSavedMessages();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Payment Reminder');
  });

  it('updates a message', () => {
    const created = saveMessage('Old', 'body');
    const updated = updateMessage(created.id, 'New', 'new body');
    expect(updated?.title).toBe('New');
    expect(getSavedMessages()[0].body).toBe('new body');
  });

  it('deletes a message', () => {
    const created = saveMessage('T', 'b');
    deleteMessage(created.id);
    expect(getSavedMessages()).toHaveLength(0);
  });

  it('persists across reads (localStorage)', () => {
    saveMessage('Booking Confirmation', 'Your booking has been confirmed.');
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toContain('Booking Confirmation');
    expect(getSavedMessages()).toHaveLength(1);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    expect(getSavedMessages()).toEqual([]);
  });
});
