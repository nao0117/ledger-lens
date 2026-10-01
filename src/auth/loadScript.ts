/** index.html の CSP（script-src）で許可済みの URL だけ。ここに無い URL は読み込まない。 */
export const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
export const GAPI_SCRIPT_URL = 'https://apis.google.com/js/api.js';
const ALLOWED = new Set([GIS_SCRIPT_URL, GAPI_SCRIPT_URL]);

const pending = new Map<string, Promise<void>>();

export function loadScript(url: string): Promise<void> {
  if (!ALLOWED.has(url)) return Promise.reject(new Error('許可されていないスクリプトです'));
  const cached = pending.get(url);
  if (cached) return cached;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = url;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      pending.delete(url); // 再試行できるようにする
      el.remove();
      reject(new Error('Google のスクリプトを読み込めませんでした'));
    };
    document.head.appendChild(el);
  });
  pending.set(url, p);
  return p;
}
