# CLAUDE.md

個人用の資産ダッシュボード。Google スプレッドシートを、ブラウザから Sheets API で直接読み、グラフで表示する静的 SPA（GitHub Pages で公開）。
詳細な要件は `docs/requirements.md` を必ず参照すること。

## 技術スタック

- Vite、React、TypeScript（strict）、Recharts、Vitest
- Node.js は conda 環境 `ledger-lens` にある。コマンドは `conda activate ledger-lens` の後か、`conda run -n ledger-lens npm ...` で実行する。
- コマンド:
  - `npm run dev`（開発サーバー）
  - `npm test`（テスト）
  - `npm run build`（本番ビルド）
  - `npm run lint`（lint）

## 絶対に守るルール（セキュリティ）

このリポジトリは**公開リポジトリ**で、扱うのは**個人の資産データ**です。

1. **実データを扱わない**
   - 実際の金額や保有銘柄名を、コード、テスト、コメント、コミットメッセージに書かない。
   - テストデータは `src/**/fixtures/` に、架空の銘柄名と乱数の金額で作る。
   - `*.xlsx`、`*.csv`、データ JSON を見つけたら、読まずに利用者に知らせる。
2. **トークンとシートのデータはメモリにだけ置く**
   - localStorage、sessionStorage、IndexedDB、Cookie、URL、Service Worker のキャッシュに保存しない。
   - localStorage に保存してよいのは、スプレッドシートの ID と表示設定だけ。
3. **OAuth のスコープは `drive.file` だけ**
   - `spreadsheets.readonly` や `drive.readonly` などに広げない。
4. **通信先は Google API だけ**
   - CSP の `connect-src` に、Google 以外のドメインを追加しない。
   - 外部 CDN、Google Fonts、アクセス解析、エラー監視は導入しない。
5. **依存パッケージを勝手に追加しない**
   - `dependencies` は react、react-dom、recharts だけ。
   - これ以外（devDependencies も含む）を追加するときは、理由を説明して利用者の承認を得る。
6. **危険な書き方をしない**
   - `dangerouslySetInnerHTML`、`eval`、`new Function` は使わない。
   - データやトークンを `console.log` に出さない。
7. **CI の設定**
   - GitHub Actions のアクションは、コミット SHA でバージョンを固定する。
8. **コミットと push は、利用者が指示したときだけ行う**

上のルールに反する変更が必要に見えるときは、実装せずに利用者に相談すること。

## 設計方針

- **パーサー（`src/parser`）と集計（`src/domain`）は、副作用のない純粋関数にしてテストを書く。** UI と API 呼び出しから分離する。
- **シートのセル番地を決め打ちしない。** 2行目の日付と、B〜E列のラベルから位置を特定する。
- **シートの集計行（全資産・現金・株式）は使わない。** 明細行から計算し、シートの値とずれていたら警告を出す。
- **UI は日本語、スマホ優先のレスポンシブ。** ダークモードに対応する。
