import { describe, expect, it } from 'vitest';
import { parseAnnualSheet } from './annual.ts';
import { MASTER_GRID, buildAnnualGrid } from './fixtures/sampleSheets.ts';
import { applyMaster, parseMasterSheet } from './master.ts';

describe('parseMasterSheet', () => {
  it('ヘッダーを読み飛ばして、銘柄名ごとの分類を作る', () => {
    const { entries, warnings } = parseMasterSheet(MASTER_GRID);
    expect(entries.size).toBe(3);
    expect(entries.get('サンプル投信A')).toEqual({ assetClass: '投資信託', region: '全世界' });
    expect(warnings).toEqual([]);
  });

  it('銘柄名の表記ゆれを正規化してキーにする', () => {
    const { entries } = parseMasterSheet([['サンプル米国株Ｃ\t', '米国株', '米国']]);
    expect(entries.has('サンプル米国株C')).toBe(true);
  });

  it('同じ銘柄名が複数あれば下の行を使い、警告する', () => {
    const { entries, warnings } = parseMasterSheet([
      ['サンプル投信A', '投資信託', '全世界'],
      ['サンプル投信A', '投資信託', '日本'],
    ]);
    expect(entries.get('サンプル投信A')?.region).toBe('日本');
    expect(warnings.map((w) => w.code)).toEqual(['duplicate-master-row']);
  });

  it('空の分類は「未分類」にして警告する', () => {
    const { entries, warnings } = parseMasterSheet([['サンプル投信A', '投資信託']]);
    expect(entries.get('サンプル投信A')?.region).toBe('未分類');
    expect(warnings.map((w) => w.code)).toEqual(['incomplete-master-row']);
  });

  it('想定外の資産クラスと地域は警告する', () => {
    const { warnings } = parseMasterSheet([['サンプル投信A', '債券', '月']]);
    expect(warnings.map((w) => w.code)).toEqual(['unknown-asset-class', 'unknown-region']);
  });
});

describe('applyMaster', () => {
  const { holdings } = parseAnnualSheet(buildAnnualGrid());
  const applied = applyMaster(holdings, parseMasterSheet(MASTER_GRID));

  it('マスタの分類を反映する（表記ゆれがあっても一致する）', () => {
    expect(applied.find((h) => h.name === 'サンプル米国株C')).toMatchObject({ assetClass: '米国株', region: '米国' });
  });

  it('同じ銘柄名なら、口座が違っても同じ分類になる', () => {
    const classes = applied.filter((h) => h.name === 'サンプル投信A').map((h) => h.assetClass);
    expect(classes).toEqual(['投資信託', '投資信託']);
  });

  it('マスタにない銘柄は「未分類」にする', () => {
    expect(applied.find((h) => h.name === 'サンプル信用D')).toMatchObject({ assetClass: '未分類', region: '未分類' });
  });

  it('現金はマスタの対象外', () => {
    expect(applied.find((h) => h.broker === '現金')).toMatchObject({ assetClass: '現金' });
  });

  it('元の配列を書き換えない', () => {
    expect(holdings.find((h) => h.name === 'サンプル投信B')?.assetClass).toBe('未分類');
  });
});
