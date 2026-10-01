/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 本番ビルドの index.html にだけ挿入する（開発中の Vite は inline スクリプトを使うため）。
// connect-src に Google 以外のドメインを追加しないこと（docs/requirements.md 7.2）。
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com/gsi/client https://apis.google.com",
  "connect-src 'self' https://sheets.googleapis.com https://www.googleapis.com https://oauth2.googleapis.com",
  'frame-src https://accounts.google.com https://docs.google.com',
  "img-src 'self' data: https://*.googleusercontent.com https://*.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      // charset の直後に置き、以降に読み込むすべてのリソースに CSP を効かせる
      handler(html) {
        const charset = '<meta charset="UTF-8" />';
        if (!html.includes(charset)) throw new Error('index.html に charset の meta が見つかりません');
        return html.replace(
          charset,
          `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        );
      },
    },
  };
}

export default defineConfig({
  // GitHub Pages のサブパス（/<repo>/）でも動くように相対パスにする
  base: './',
  plugins: [react(), cspPlugin()],
  build: {
    sourcemap: false,
    rolldownOptions: {
      output: {
        // 本番ビルドでは console 出力を除去する
        minify: { compress: { dropConsole: true } },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
