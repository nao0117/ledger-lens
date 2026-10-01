// ダミーデータのみ。銘柄名は架空、金額は適当な値。実データは入れない。
import type { Holding, ParsedAnnual, Snapshot } from '../../parser/index.ts';

const h = (broker: string, account: string, name: string, assetClass: string): Holding => ({
  id: `${broker}|${account}|${name}`, broker, account, name, assetClass, region: assetClass,
});

export const HOLDINGS: Holding[] = [
  h('現金', '口座預金', '口座預金', '現金'),
  h('証券会社A', 'NISA口座', 'サンプル投信A', '投資信託'),
  h('証券会社A', '特定口座', 'サンプル米国株C', '米国株'),
  h('証券会社A', '信用', 'サンプル信用D', '未分類'),
  h('証券会社B', 'NISA口座', 'サンプル投信A', '投資信託'),
];

/** 日付ごとの値（HOLDINGS と同じ順） */
export const VALUES: Record<string, number[]> = {
  '2022-01-31': [100, 200, 300, -50, 0],
  '2023-01-31': [110, 220, 330, 20, 40],
  '2023-12-31': [120, 240, 0, -10, 60],
  '2024-01-31': [130, 250, 360, 30, 70],
};

export function makeData(values: Record<string, number[]> = VALUES, holdings: Holding[] = HOLDINGS): ParsedAnnual {
  const dates = Object.keys(values).sort();
  const snapshots: Snapshot[] = dates.flatMap((date) =>
    holdings.map((hd, i) => ({ date, holdingId: hd.id, value: (values[date] ?? [])[i] ?? 0 })),
  );
  return { holdings, snapshots, dates, sheetTotals: {}, warnings: [] };
}
