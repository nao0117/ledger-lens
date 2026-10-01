import { getGapi, getGoogle } from '../auth/googleTypes.ts';
import { GAPI_SCRIPT_URL, loadScript } from '../auth/loadScript.ts';
import { saveSpreadsheetId } from './spreadsheetId.ts';

async function loadPickerLib(): Promise<void> {
  await loadScript(GAPI_SCRIPT_URL);
  const gapi = getGapi();
  if (!gapi) throw new Error('Google Picker を初期化できませんでした');
  await new Promise<void>((resolve, reject) => {
    gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('Google Picker を読み込めませんでした')) });
  });
}

/**
 * Picker でスプレッドシートを1つ選ばせる。選ばれたら ID を localStorage に保存して返す。
 * キャンセル時は null。token は呼び出し側がメモリから渡す。
 */
export async function pickSpreadsheet(token: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const appId = import.meta.env.VITE_GOOGLE_APP_ID;
  if (!apiKey || !appId) throw new Error('VITE_GOOGLE_API_KEY / VITE_GOOGLE_APP_ID が設定されていません');
  await loadPickerLib();
  const picker = getGoogle()?.picker;
  if (!picker) throw new Error('Google Picker を初期化できませんでした');

  return new Promise<string | null>((resolve) => {
    const view = new picker.DocsView(picker.ViewId.SPREADSHEETS);
    view.setMimeTypes('application/vnd.google-apps.spreadsheet');
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setLocale('ja')
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) {
          const id = data.docs?.[0]?.id;
          if (id) {
            saveSpreadsheetId(id);
            resolve(id);
          } else resolve(null);
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build()
      .setVisible(true);
  });
}
