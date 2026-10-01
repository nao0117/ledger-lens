import { describe, expect, it, vi } from 'vitest';
import { buildValuesUrl, fetchSheetGrids, quoteSheetTitle, responseToGrid, SheetsApiError } from './api.ts';

describe('buildValuesUrl', () => {
  it('UNFORMATTED_VALUE とシート名のエンコードを含み、Google ドメインのみ', () => {
    const u = new URL(buildValuesUrl('abc_123-X', '年次推移'));
    expect(u.origin).toBe('https://sheets.googleapis.com');
    expect(u.pathname).toBe(`/v4/spreadsheets/abc_123-X/values/${encodeURIComponent("'年次推移'")}`);
    expect(u.searchParams.get('valueRenderOption')).toBe('UNFORMATTED_VALUE');
    expect(u.search).not.toMatch(/token|key/i);
  });
  it('不正な ID は拒否する', () => {
    expect(() => buildValuesUrl('a/b', 'x')).toThrow();
  });
  it('シート名中の引用符をエスケープする', () => {
    expect(quoteSheetTitle("a'b")).toBe("'a''b'");
  });
});

describe('responseToGrid', () => {
  it('values を Grid にし、非プリミティブは null にする', () => {
    expect(responseToGrid({ values: [['a', 1, true, { x: 1 }], 'bad', []] })).toEqual([['a', 1, true, null], [], []]);
  });
  it('values が無ければ空', () => {
    expect(responseToGrid({ range: 'x' })).toEqual([]);
  });
  it('形式不正は例外', () => {
    expect(() => responseToGrid(null)).toThrow();
    expect(() => responseToGrid({ values: 'x' })).toThrow();
  });
});

function mockFetch(handler: (url: string) => { status: number; body: unknown }) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const r = handler(String(input));
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe('fetchSheetGrids', () => {
  it('2 シートを Bearer 付きで取得する', async () => {
    const f = mockFetch((url) => ({
      status: 200,
      body: { values: [[url.includes(encodeURIComponent("'銘柄マスタ'")) ? 'm' : 'a']] },
    }));
    const r = await fetchSheetGrids('TOKEN', 'sid', f);
    expect(r).toEqual({ annual: [['a']], master: [['m']] });
    const calls = (f as unknown as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit][];
    expect(calls).toHaveLength(2);
    for (const [url, init] of calls) {
      expect(url.startsWith('https://sheets.googleapis.com/')).toBe(true);
      expect(url).not.toContain('TOKEN');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer TOKEN');
    }
  });
  it('エラー時は本文を含めず status を持つ例外', async () => {
    const f = mockFetch(() => ({ status: 401, body: { error: 'secret-ish' } }));
    const err = await fetchSheetGrids('T', 'sid', f).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SheetsApiError);
    expect((err as SheetsApiError).needsReauth).toBe(true);
    expect((err as Error).message).not.toContain('secret');
  });
  it('銘柄マスタが無い（400）ときは master を null にして続行する', async () => {
    const f = mockFetch((url) =>
      url.includes(encodeURIComponent("'銘柄マスタ'")) ? { status: 400, body: {} } : { status: 200, body: { values: [['a']] } },
    );
    await expect(fetchSheetGrids('T', 'sid', f)).resolves.toEqual({ annual: [['a']], master: null });
  });
  it('年次推移が無いときはエラーにする', async () => {
    const f = mockFetch((url) =>
      url.includes(encodeURIComponent("'年次推移'")) ? { status: 400, body: {} } : { status: 200, body: { values: [['m']] } },
    );
    await expect(fetchSheetGrids('T', 'sid', f)).rejects.toBeInstanceOf(SheetsApiError);
  });
  it('404 はシート名入りのメッセージ', async () => {
    const f = mockFetch(() => ({ status: 404, body: {} }));
    await expect(fetchSheetGrids('T', 'sid', f)).rejects.toThrow('見つかりません');
  });
});
