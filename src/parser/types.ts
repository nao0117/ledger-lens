/** Sheets API（valueRenderOption=UNFORMATTED_VALUE）が返すセルの値。末尾の空セルは省略される。 */
export type Cell = string | number | boolean | null | undefined;
export type Grid = readonly (readonly Cell[])[];

export type Holding = {
  /** `${broker}|${account}|${name}` */
  id: string;
  broker: string;
  account: string;
  name: string;
  assetClass: string;
  region: string;
  /** 名寄せ名（銘柄マスタの D 列）。口座をまたいで同じ銘柄として合算するときの名前。なければ name を使う。 */
  securityName?: string;
};

export type Snapshot = {
  /** YYYY-MM-DD */
  date: string;
  holdingId: string;
  value: number;
  /** シートのセルが空欄だった（保有していない）。0 と入力されたセルは含まない。value は 0 になる。 */
  blank?: true;
};

export type WarningCode =
  | 'duplicate-date'
  | 'invalid-date-header'
  | 'invalid-value'
  | 'duplicate-holding'
  | 'missing-label'
  | 'unlabeled-row'
  | 'total-mismatch'
  | 'duplicate-master-row'
  | 'incomplete-master-row'
  | 'unknown-asset-class'
  | 'unknown-region'
  | 'missing-master'
  | 'security-class-conflict'
  | 'security-alias-suggestion';

export type ParseWarning = {
  code: WarningCode;
  /** 画面に出す日本語の説明。金額は含めない（マスク時にも出せるように）。 */
  message: string;
  date?: string;
  /** total-mismatch のとき、シートの集計値 − 明細からの計算値（円）。金額なので画面ではマスクの対象にする。 */
  difference?: number;
};

export class ParseError extends Error {
  override name = 'ParseError';
}
