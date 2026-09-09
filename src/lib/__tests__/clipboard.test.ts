import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryClipboardReadState } from '../clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubPermissions(state: string | Error | null) {
  if (state === null) {
    vi.stubGlobal('navigator', {});
    return;
  }
  vi.stubGlobal('navigator', {
    permissions: {
      query: async () => {
        if (state instanceof Error) throw state;
        return { state };
      },
    },
  });
}

describe('queryClipboardReadState (never prompts)', () => {
  it('returns granted/denied/prompt as-is', async () => {
    stubPermissions('granted');
    await expect(queryClipboardReadState()).resolves.toBe('granted');
    stubPermissions('denied');
    await expect(queryClipboardReadState()).resolves.toBe('denied');
    stubPermissions('prompt');
    await expect(queryClipboardReadState()).resolves.toBe('prompt');
  });

  it('returns unsupported when the API is missing or throws', async () => {
    stubPermissions(null);
    await expect(queryClipboardReadState()).resolves.toBe('unsupported');
    stubPermissions(new Error('nope'));
    await expect(queryClipboardReadState()).resolves.toBe('unsupported');
  });

  it('treats unknown states as prompt (safe default: no silent attempt)', async () => {
    stubPermissions('mystery');
    await expect(queryClipboardReadState()).resolves.toBe('prompt');
  });
});
