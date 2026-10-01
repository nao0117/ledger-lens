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
};

export type Snapshot = {
  /** YYYY-MM-DD */
  date: string;
  holdingId: string;
  value: number;
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
  | 'unknown-region';

export type ParseWarning = {
  code: WarningCode;
  /** 画面に出す日本語の説明。金額は含めない（マスク時にも出せるように）。 */
  message: string;
  date?: string;
};

export class ParseError extends Error {
  override name = 'ParseError';
}
