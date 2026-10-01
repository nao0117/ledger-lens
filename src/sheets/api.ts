import type { Cell, Grid } from '../parser/types.ts';

/** 通信先は Google の Sheets API だけ（CLAUDE.md ルール4）。 */
export const SHEETS_API_ORIGIN = 'https://sheets.googleapis.com';
export const ANNUAL_SHEET_TITLE = '年次推移';
export const MASTER_SHEET_TITLE = '銘柄マスタ';

export class SheetsApiError extends Error {
  override name = 'SheetsApiError';
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
  /** トークン切れ・権限なし。再ログインが必要。 */
  get needsReauth(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/** values.get の URL。トークンや API キーは URL に入れない（Authorization ヘッダーで渡す）。 */
export function buildValuesUrl(spreadsheetId: string, range: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) throw new Error('スプレッドシート ID の形式が不正です');
  const params = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE' });
  // range にシート名だけを渡すと、そのシート全体が返る（セル番地を決め打ちしない）
  return `${SHEETS_API_ORIGIN}/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    quoteSheetTitle(range),
  )}?${params.toString()}`;
}

/** A1 表記でシート名を安全に指定する（'...' で囲み、' は '' にする）。 */
export function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

function toCell(v: unknown): Cell {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null;
}

/** values.get のレスポンスを Grid に変換する。values が無い（空シート）場合は空の Grid。 */
export function responseToGrid(json: unknown): Grid {
  if (typeof json !== 'object' || json === null) throw new Error('Sheets API の応答の形式が不正です');
  const values = (json as { values?: unknown }).values;
  if (values === undefined) return [];
  if (!Array.isArray(values)) throw new Error('Sheets API の応答の形式が不正です');
  return values.map((row) => (Array.isArray(row) ? row.map(toCell) : []));
}

export async function fetchSheetGrid(
  token: string,
  spreadsheetId: string,
  sheetTitle: string,
  fetchFn: typeof fetch = fetch,
): Promise<Grid> {
  const res = await fetchFn(buildValuesUrl(spreadsheetId, sheetTitle), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store', // データをブラウザのキャッシュに残さない
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!res.ok) {
    // 応答本文は（シートの内容を含みうるので）メッセージに入れない
    throw new SheetsApiError(
      res.status === 404 ? `シート「${sheetTitle}」が見つかりません` : `Sheets API エラー (${res.status})`,
      res.status,
    );
  }
  return responseToGrid(await res.json());
}

/** master は「銘柄マスタ」シートが無いとき null（全銘柄を未分類として扱えるようにする）。 */
export type SheetGrids = { annual: Grid; master: Grid | null };

/** 「年次推移」と「銘柄マスタ」を読む。 */
export async function fetchSheetGrids(
  token: string,
  spreadsheetId: string,
  fetchFn: typeof fetch = fetch,
): Promise<SheetGrids> {
  const [annual, master] = await Promise.all([
    fetchSheetGrid(token, spreadsheetId, ANNUAL_SHEET_TITLE, fetchFn),
    fetchSheetGrid(token, spreadsheetId, MASTER_SHEET_TITLE, fetchFn).catch((e: unknown) => {
      // 存在しないシート名は 400（Unable to parse range）か 404 で返る
      if (e instanceof SheetsApiError && (e.status === 400 || e.status === 404)) return null;
      throw e;
    }),
  ]);
  return { annual, master };
}
