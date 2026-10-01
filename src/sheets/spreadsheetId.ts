/** localStorage に保存してよいのはスプレッドシートの ID だけ（CLAUDE.md ルール2）。 */
const KEY = 'ledger-lens:spreadsheetId';
const ID_RE = /^[A-Za-z0-9_-]+$/;

export function loadSpreadsheetId(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): string | null {
  try {
    const v = storage?.getItem(KEY);
    return v && ID_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function saveSpreadsheetId(id: string, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  if (!ID_RE.test(id)) return;
  try {
    storage?.setItem(KEY, id);
  } catch {
    // 保存できなくても動作は続ける
  }
}

export function clearSpreadsheetId(storage: Pick<Storage, 'removeItem'> | undefined = safeStorage()): void {
  try {
    storage?.removeItem(KEY);
  } catch {
    // 無視
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
