import { findClassConflicts, suggestSameSecurities } from './domain/index.ts';
import { applyMaster, parseAnnualSheet, parseMasterSheet, type Grid, type Holding, type ParsedAnnual, type ParseWarning } from './parser/index.ts';

const MISSING_MASTER: ParseWarning = {
  code: 'missing-master',
  message: '「銘柄マスタ」シートが見つからないため、すべての銘柄を未分類として表示しています',
};

/** 2シートの生データを、銘柄マスタの分類つきの ParsedAnnual にまとめる（純粋関数）。master が null ならマスタなし。 */
export function buildParsedData(annual: Grid, master: Grid | null): ParsedAnnual {
  const parsed = parseAnnualSheet(annual);
  const parsedMaster = parseMasterSheet(master ?? []);
  if (master === null) parsedMaster.warnings.push(MISSING_MASTER);
  const holdings = applyMaster(parsed.holdings, parsedMaster);
  return {
    ...parsed,
    holdings,
    warnings: [...parsed.warnings, ...parsedMaster.warnings, ...securityWarnings(holdings)],
  };
}

/** 名寄せ（口座をまたいだ同じ銘柄の合算）に関する確認事項。銘柄名は出すが金額は含めない。 */
function securityWarnings(holdings: Holding[]): ParseWarning[] {
  const conflicts = findClassConflicts(holdings).map((name): ParseWarning => ({
    code: 'security-class-conflict',
    message: `「${name}」としてまとめた銘柄どうしで、資産クラスか地域が違います。銘柄マスタを確認してください`,
  }));
  const suggestions = suggestSameSecurities(holdings).map((names): ParseWarning => ({
    code: 'security-alias-suggestion',
    message: `同じ銘柄かもしれません:「${names.join('」「')}」。同じ銘柄なら、銘柄マスタの D 列（名寄せ名）に同じ名前を入れると、まとめて集計します`,
  }));
  return [...conflicts, ...suggestions];
}
