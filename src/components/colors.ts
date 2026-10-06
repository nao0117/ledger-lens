import { UNCLASSIFIED } from '../parser/index.ts';

/** 資産クラスごとの固定色（tokens.css の --cat-*）。全画面で同じ対応を使う。 */
const ASSET_CLASS_COLORS: Readonly<Record<string, string>> = {
  投資信託: 'var(--cat-fund)',
  米国株: 'var(--cat-us)',
  国内株: 'var(--cat-jp)',
  その他: 'var(--cat-other)',
  現金: 'var(--cat-cash)',
  [UNCLASSIFIED]: 'var(--cat-unc)',
};

export const SERIES_COUNT = 8;

/** 名前で色を固定できない系列（証券会社・口座区分など）の色。index は 0 始まり。 */
export function seriesColor(index: number): string {
  return index >= 0 && index < SERIES_COUNT ? `var(--series-${index + 1})` : 'var(--series-other)';
}

/** 資産クラスの色。マスタにない名前は系列色（index 順）にする。 */
export function assetClassColor(name: string, fallbackIndex = SERIES_COUNT): string {
  return ASSET_CLASS_COLORS[name] ?? seriesColor(fallbackIndex);
}

/** 現金と株式の色。 */
export const CASH_COLOR = 'var(--cat-cash)';
export const STOCK_COLOR = 'var(--cat-stock)';
