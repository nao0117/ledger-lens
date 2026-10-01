import { UNCLASSIFIED, CASH_BROKER } from './annual.ts';
import { isBlank, normalizeLabel } from './normalize.ts';
import { type Grid, type Holding, type ParseWarning } from './types.ts';

export const ASSET_CLASSES = ['投資信託', '国内株', '米国株', 'その他'] as const;
export const REGIONS = ['全世界', '米国', '先進国', '日本', 'インド', 'その他'] as const;

const HEADER_LABEL = '銘柄名';

export type MasterEntry = { assetClass: string; region: string };

export type ParsedMaster = {
  /** キーは正規化した銘柄名 */
  entries: Map<string, MasterEntry>;
  warnings: ParseWarning[];
};

/** 「銘柄マスタ」シート（A: 銘柄名 / B: 資産クラス / C: 地域）を読む。 */
export function parseMasterSheet(grid: Grid): ParsedMaster {
  const entries = new Map<string, MasterEntry>();
  const warnings: ParseWarning[] = [];

  for (const row of grid) {
    const name = normalizeLabel(row[0]);
    if (!name || name === HEADER_LABEL) continue;

    const assetClass = normalizeLabel(row[1]);
    const region = normalizeLabel(row[2]);
    if (isBlank(row[1]) || isBlank(row[2])) {
      warnings.push({ code: 'incomplete-master-row', message: '銘柄マスタに、資産クラスまたは地域が空の行があります' });
    }
    if (assetClass && !(ASSET_CLASSES as readonly string[]).includes(assetClass)) {
      warnings.push({ code: 'unknown-asset-class', message: '銘柄マスタに、想定外の資産クラスがあります' });
    }
    if (region && !(REGIONS as readonly string[]).includes(region)) {
      warnings.push({ code: 'unknown-region', message: '銘柄マスタに、想定外の地域があります' });
    }
    if (entries.has(name)) {
      warnings.push({ code: 'duplicate-master-row', message: '銘柄マスタに、同じ銘柄名の行が複数あります。下の行を使います' });
    }
    entries.set(name, { assetClass: assetClass || UNCLASSIFIED, region: region || UNCLASSIFIED });
  }

  return { entries, warnings };
}

/** マスタの分類を銘柄に反映する。載っていない銘柄は「未分類」のままにする。現金は対象外。 */
export function applyMaster(holdings: readonly Holding[], master: ParsedMaster): Holding[] {
  return holdings.map((h) => {
    if (h.broker === CASH_BROKER) return h;
    const entry = master.entries.get(normalizeLabel(h.name));
    return entry ? { ...h, ...entry } : { ...h, assetClass: UNCLASSIFIED, region: UNCLASSIFIED };
  });
}
