/**
 * 使う範囲だけの Google 型宣言（@types/* は追加しない）。
 * GIS: https://accounts.google.com/gsi/client / Picker: https://apis.google.com/js/api.js
 */
export type TokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
  error_description?: string;
};

export type TokenClientError = { type?: string; message?: string };

export type TokenClient = {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
};

export type PickerDoc = { id: string; name?: string; mimeType?: string };
export type PickerResponse = { action: string; docs?: PickerDoc[] };

export type PickerBuilderLike = {
  addView(view: unknown): PickerBuilderLike;
  setOAuthToken(token: string): PickerBuilderLike;
  setDeveloperKey(key: string): PickerBuilderLike;
  setAppId(appId: string): PickerBuilderLike;
  setLocale(locale: string): PickerBuilderLike;
  setCallback(cb: (data: PickerResponse) => void): PickerBuilderLike;
  build(): { setVisible(visible: boolean): void };
};

export type GoogleGlobal = {
  accounts?: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: TokenClientError) => void;
      }): TokenClient;
      revoke(token: string, done?: () => void): void;
    };
  };
  picker?: {
    PickerBuilder: new () => PickerBuilderLike;
    DocsView: new (viewId?: string) => { setMimeTypes(types: string): unknown; setMode?(m: string): unknown };
    ViewId: { SPREADSHEETS: string };
    Action: { PICKED: string; CANCEL: string };
  };
};

export type GapiGlobal = {
  load(name: string, opts: { callback: () => void; onerror?: () => void }): void;
};

export function getGoogle(): GoogleGlobal | undefined {
  return (globalThis as { google?: GoogleGlobal }).google;
}

export function getGapi(): GapiGlobal | undefined {
  return (globalThis as { gapi?: GapiGlobal }).gapi;
}
