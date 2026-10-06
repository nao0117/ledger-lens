import { describe, expect, it } from 'vitest';
import { parseAnnualSheet } from './annual.ts';
import { buildAnnualGrid, SERIAL_FEB, SERIAL_JAN } from './fixtures/sampleSheets.ts';
import { ParseError, type Cell, type Holding } from './types.ts';

const byName = (holdings: Holding[], name: string, broker?: string) =>
  holdings.find((h) => h.name === name && (broker === undefined || h.broker === broker));

const valueOf = (parsed: ReturnType<typeof parseAnnualSheet>, id: string, date: string) =>
  parsed.snapshots.find((s) => s.holdingId === id && s.date === date)?.value;

describe('parseAnnualSheet', () => {
  const parsed = parseAnnualSheet(buildAnnualGrid());

  it('日付が空の列を無視し、重複した日付は1つにして昇順に並べる', () => {
    expect(parsed.dates).toEqual(['2024-01-31', '2024-02-29', '2024-03-31']);
  });

  it('同じ日付の列が複数ある場合は右側の列を採用し、警告を出す', () => {
    const id = '証券会社A|NISAつみたて投資枠|サンプル投信A';
    expect(valueOf(parsed, id, '2024-03-31')).toBe(305_000);
    expect(parsed.warnings.filter((w) => w.code === 'duplicate-date')).toHaveLength(1);
  });

  it('集計行は銘柄として読まない', () => {
    const names = parsed.holdings.map((h) => h.name);
    expect(names).not.toContain('全資産');
    expect(names).not.toContain('現金');
    expect(names).not.toContain('株式');
    expect(parsed.holdings).toHaveLength(7);
  });

  it('証券会社名を下の行に引き継ぐ', () => {
    expect(byName(parsed.holdings, 'サンプル投信B')?.broker).toBe('証券会社A');
    expect(byName(parsed.holdings, 'サンプル信用D')?.broker).toBe('証券会社A');
    expect(byName(parsed.holdings, 'サンプル投信A', '証券会社B')?.account).toBe('NISA口座');
  });

  it('表記ゆれ（タブ・末尾の空白・全角）を正規化する', () => {
    const a = byName(parsed.holdings, 'サンプル投信A', '証券会社A');
    expect(a?.account).toBe('NISAつみたて投資枠');
    expect(byName(parsed.holdings, 'サンプル米国株C')).toBeDefined();
  });

  it('同じ銘柄名でも証券会社・口座が違えば別の銘柄にする', () => {
    const ids = parsed.holdings.filter((h) => h.name === 'サンプル投信A').map((h) => h.id);
    expect(ids).toEqual(['証券会社A|NISAつみたて投資枠|サンプル投信A', '証券会社B|NISA口座|サンプル投信A']);
  });

  it('現金の内訳を「現金」の銘柄として読む', () => {
    expect(parsed.holdings.filter((h) => h.broker === '現金').map((h) => h.id)).toEqual([
      '現金|口座預金|口座預金',
      '現金|貯金|貯金',
    ]);
  });

  it('空セルは 0 として扱い、すべての銘柄 × 日付のスナップショットを作る', () => {
    expect(parsed.snapshots).toHaveLength(parsed.holdings.length * parsed.dates.length);
    expect(valueOf(parsed, '証券会社B|NISA口座|サンプル投信A', '2024-01-31')).toBe(0);
  });

  it('信用の行の損益は、負の値も含めてそのまま保持する', () => {
    const id = '証券会社A|信用|サンプル信用D';
    expect(valueOf(parsed, id, '2024-01-31')).toBe(-12_000);
    expect(valueOf(parsed, id, '2024-02-29')).toBe(8_000);
  });

  it('資産クラスと地域は、マスタを当てるまで「未分類」にする', () => {
    expect(byName(parsed.holdings, 'サンプル投信B')).toMatchObject({ assetClass: '未分類', region: '未分類' });
  });

  it('明細の合計がシートの集計値と一致していれば、警告を出さない', () => {
    expect(parsed.warnings.filter((w) => w.code === 'total-mismatch')).toEqual([]);
    expect(parsed.sheetTotals['2024-02-29']?.all).toBe(1_628_000);
  });

  it('シートの集計値とずれていたら警告を出す', () => {
    const grid = buildAnnualGrid();
    const totalRow = grid.find((r) => r[1] === '株式');
    if (!totalRow) throw new Error('fixture error');
    totalRow[6] = 1; // 2月末の株式をずらす（F=5, G=6）
    const warnings = parseAnnualSheet(grid).warnings.filter((w) => w.code === 'total-mismatch');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ date: '2024-02-29' });
    expect(warnings[0]?.message).toContain('株式');
  });

  it('集計行の値は使わず、明細から計算した値が正になる', () => {
    const grid = buildAnnualGrid();
    const totalRow = grid.find((r) => r[1] === '全資産');
    if (!totalRow) throw new Error('fixture error');
    totalRow[5] = 999;
    const result = parseAnnualSheet(grid);
    const jan = result.snapshots.filter((s) => s.date === '2024-01-31').reduce((a, s) => a + s.value, 0);
    expect(jan).toBe(320_000 + 500_000 + 100_000 + 420_000 - 12_000);
  });

  it('行や列の位置に依存しない（上に行を足しても、間に空行があっても読める）', () => {
    const grid = buildAnnualGrid();
    const shifted: Cell[][] = [['メモ'], [], ...grid.slice(0, 4), [], ...grid.slice(4)];
    const result = parseAnnualSheet(shifted);
    expect(result.holdings).toHaveLength(7);
    expect(result.dates).toHaveLength(3);
    expect(result.warnings.filter((w) => w.code === 'total-mismatch')).toEqual([]);
  });

  it('行末の空セルが省略されていても読める', () => {
    const grid = buildAnnualGrid().map((row) => {
      const copy = [...row];
      while (copy.length > 0 && (copy[copy.length - 1] === '' || copy[copy.length - 1] === null)) copy.pop();
      return copy;
    });
    expect(parseAnnualSheet(grid).holdings).toHaveLength(7);
  });

  it('数値として読めないセルは 0 にして警告する', () => {
    const grid = buildAnnualGrid();
    const row = grid.find((r) => r[4] === 'サンプル投信B');
    if (!row) throw new Error('fixture error');
    row[6] = '-';
    const result = parseAnnualSheet(grid);
    expect(valueOf(result, '証券会社A|NISA成長投資枠|サンプル投信B', '2024-02-29')).toBe(0);
    expect(result.warnings.some((w) => w.code === 'invalid-value')).toBe(true);
  });

  it('同じキーの行が複数ある場合は合算して警告する', () => {
    const grid = buildAnnualGrid();
    const row = grid.find((r) => r[4] === 'サンプル投信B');
    if (!row) throw new Error('fixture error');
    // 証券会社名を明示する（空欄だと直前の行のグループに引き継がれる）
    grid.push(['', '', '証券会社A', ...row.slice(3)]);
    const result = parseAnnualSheet(grid);
    expect(valueOf(result, '証券会社A|NISA成長投資枠|サンプル投信B', '2024-02-29')).toBe(300_000);
    expect(result.warnings.some((w) => w.code === 'duplicate-holding')).toBe(true);
  });

  it('日付の行が見つからなければエラーにする', () => {
    expect(() => parseAnnualSheet([['', 'タイトルだけ']])).toThrow(ParseError);
  });
});

describe('空欄と 0 の区別（保有していない / 評価額が 0）', () => {
  // 列 F=1月末 / G=2月末。株式の行: 空欄・0・値あり
  const grid = [
    ['', 'サンプル資産推移'],
    ['', '', '', '', '', SERIAL_JAN, SERIAL_FEB],
    ['', '株式'],
    ['', '', '証券会社A', '特定口座', 'サンプル株P', 100, null],
    ['', '', '', '信用', 'サンプル株Q', 0, 0],
    ['', '', '', 'NISA口座', 'サンプル株R', null, null],
  ];
  const parsed = parseAnnualSheet(grid);
  const snap = (name: string, date: string) =>
    parsed.snapshots.find((s) => s.holdingId.endsWith(`|${name}`) && s.date === date)!;

  it('空欄のセルには blank を付け、値は 0 にする', () => {
    expect(snap('サンプル株P', '2024-02-29')).toEqual({ date: '2024-02-29', holdingId: '証券会社A|特定口座|サンプル株P', value: 0, blank: true });
    expect(snap('サンプル株R', '2024-01-31').blank).toBe(true);
  });

  it('0 と入力されたセル、値のあるセルには blank を付けない', () => {
    expect(snap('サンプル株Q', '2024-01-31')).not.toHaveProperty('blank');
    expect(snap('サンプル株Q', '2024-02-29').value).toBe(0);
    expect(snap('サンプル株P', '2024-01-31')).not.toHaveProperty('blank');
  });
});
