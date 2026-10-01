import { applyMaster, parseAnnualSheet, parseMasterSheet, type Grid, type ParsedAnnual, type ParseWarning } from './parser/index.ts';

const MISSING_MASTER: ParseWarning = {
  code: 'missing-master',
  message: '「銘柄マスタ」シートが見つからないため、すべての銘柄を未分類として表示しています',
};

/** 2シートの生データを、銘柄マスタの分類つきの ParsedAnnual にまとめる（純粋関数）。master が null ならマスタなし。 */
export function buildParsedData(annual: Grid, master: Grid | null): ParsedAnnual {
  const parsed = parseAnnualSheet(annual);
  const parsedMaster = parseMasterSheet(master ?? []);
  if (master === null) parsedMaster.warnings.push(MISSING_MASTER);
  return {
    ...parsed,
    holdings: applyMaster(parsed.holdings, parsedMaster),
    warnings: [...parsed.warnings, ...parsedMaster.warnings],
  };
}
