import { describe, expect, it } from 'vitest';
import { buildParsedData } from './loadData.ts';
import { buildAnnualGrid, MASTER_GRID } from './parser/fixtures/sampleSheets.ts';
import { UNCLASSIFIED } from './parser/index.ts';

describe('buildParsedData', () => {
  it('マスタの分類を銘柄に反映し、警告をまとめる', () => {
    const data = buildParsedData(buildAnnualGrid(), MASTER_GRID);
    expect(data.holdings.length).toBeGreaterThan(0);
    expect(data.dates.length).toBeGreaterThan(0);
    expect(data.holdings.some((h) => h.assetClass !== UNCLASSIFIED)).toBe(true);
  });

  it('マスタが空なら現金以外は未分類になる', () => {
    const data = buildParsedData(buildAnnualGrid(), []);
    const nonCash = data.holdings.filter((h) => h.broker !== '現金');
    expect(nonCash.every((h) => h.assetClass === UNCLASSIFIED)).toBe(true);
  });

  it('マスタのシートが無い(null)ときは未分類にして警告を出す', () => {
    const data = buildParsedData(buildAnnualGrid(), null);
    expect(data.warnings.some((w) => w.code === 'missing-master')).toBe(true);
    expect(data.holdings.filter((h) => h.broker !== '現金').every((h) => h.assetClass === UNCLASSIFIED)).toBe(true);
  });

  it('名寄せ名でまとめた銘柄の分類が食い違えば警告する（表記違いの候補がなければ候補の警告は出さない）', () => {
    const plain = buildParsedData(buildAnnualGrid(), MASTER_GRID);
    expect(plain.warnings.filter((w) => w.code.startsWith('security-'))).toEqual([]);

    const master = MASTER_GRID.map((row) => (row[0] === 'サンプル投信B' ? [...row, 'サンプル投信A'] : row));
    const data = buildParsedData(buildAnnualGrid(), master);
    expect(data.holdings.find((h) => h.name === 'サンプル投信B')?.securityName).toBe('サンプル投信A');
    expect(data.warnings.filter((w) => w.code === 'security-class-conflict')).toHaveLength(1);
  });
});
