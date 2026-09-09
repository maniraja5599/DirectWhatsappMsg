export interface SavedMessage {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  useCount: number;
}

export const STORAGE_KEY = 'wa-direct:saved-messages:v1';

function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeLoaded(list: unknown): SavedMessage[] {
  if (!Array.isArray(list)) return [];
  const out: SavedMessage[] = [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const title = typeof item['title'] === 'string' ? (item['title'] as string).trim() : '';
    const body = typeof item['body'] === 'string' ? (item['body'] as string) : '';
    if (!title && !body.trim()) continue;
    out.push({
      id: typeof item['id'] === 'string' && item['id'] ? (item['id'] as string) : makeId(),
      title: title || 'Untitled',
      body,
      createdAt:
        typeof item['createdAt'] === 'string' && item['createdAt']
          ? (item['createdAt'] as string)
          : nowIso(),
      updatedAt:
        typeof item['updatedAt'] === 'string' && item['updatedAt']
          ? (item['updatedAt'] as string)
          : nowIso(),
      useCount: typeof item['useCount'] === 'number' ? (item['useCount'] as number) : 0,
    });
  }
  return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getSavedMessages(): SavedMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitizeLoaded(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function persist(list: SavedMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage full / private mode: keep in-memory behavior, UI still works.
  }
}

export function seedIfEmpty(seed: Array<{ title: string; body: string }>): SavedMessage[] {
  const existing = getSavedMessages();
  if (existing.length > 0) return existing;
  const ts = nowIso();
  const list: SavedMessage[] = seed.map((s) => ({
    id: makeId(),
    title: s.title,
    body: s.body,
    createdAt: ts,
    updatedAt: ts,
    useCount: 0,
  }));
  persist(list);
  return list;
}

export function saveMessage(title: string, body: string): SavedMessage {
  const cleanTitle = title.trim() || 'Untitled';
  const ts = nowIso();
  const msg: SavedMessage = {
    id: makeId(),
    title: cleanTitle.slice(0, 80),
    body,
    createdAt: ts,
    updatedAt: ts,
    useCount: 0,
  };
  const list = [msg, ...getSavedMessages()];
  persist(list);
  return msg;
}

export function updateMessage(id: string, title: string, body: string): SavedMessage | null {
  const list = getSavedMessages();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const updated: SavedMessage = {
    ...list[idx],
    title: (title.trim() || 'Untitled').slice(0, 80),
    body,
    updatedAt: nowIso(),
  };
  list[idx] = updated;
  persist(list);
  return updated;
}

export function deleteMessage(id: string): void {
  persist(getSavedMessages().filter((m) => m.id !== id));
}

export function incrementUseCount(id: string): void {
  const list = getSavedMessages();
  const item = list.find((m) => m.id === id);
  if (!item) return;
  item.useCount += 1;
  persist(list);
}

export function validateSavedMessage(title: string, body: string): string | null {
  if (!title.trim() && !body.trim()) return 'Give your message a title or some text.';
  if (!body.trim()) return 'Message text cannot be empty.';
  if (body.length > 4000) return 'Message is too long (max 4000 characters).';
  if (title.length > 80) return 'Title is too long (max 80 characters).';
  return null;
}

const INSTALL_DISMISSED_KEY = 'wa-direct:install-dismissed:v1';

export function isInstallDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markInstallDismissed(): void {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
  } catch {
    // ignore
  }
}

const RECENT_KEY = 'wa-direct:recent-numbers:v1';
const MAX_RECENT = 5;

export interface RecentNumber {
  phone: string;
  countryCode: string;
  lastUsed: string;
}

export function getRecentNumbers(): RecentNumber[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r: unknown): r is RecentNumber =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as Record<string, unknown>)['phone'] === 'string' &&
        typeof (r as Record<string, unknown>)['countryCode'] === 'string',
    );
  } catch {
    return [];
  }
}

export function addRecentNumber(phone: string, countryCode: string): void {
  if (!phone.trim()) return;
  const list = getRecentNumbers().filter((r) => !(r.phone === phone && r.countryCode === countryCode));
  list.unshift({ phone, countryCode, lastUsed: new Date().toISOString() });
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}
