# Ledger Lens

Google スプレッドシートの資産データを、ブラウザから Sheets API で直接読んでグラフ表示する、個人用の静的 SPA です。
データはブラウザのメモリ上でだけ扱い、リポジトリ、ビルド成果物、ブラウザの保存領域には置きません。

要件は [docs/requirements.md](docs/requirements.md) を参照してください。

## 画面

| 画面 | 内容 |
|---|---|
| ホーム | 総資産と前回比・前年同期比、推移のグラフ（期間の切り替えと、資産クラス・証券会社・口座・銘柄ごとの内訳）、今月の動き（前回比の寄与が大きい銘柄）、資産クラスの配分、確認が必要な事項 |
| 構成 | 証券会社 → 口座区分 → 銘柄のツリーマップ（色は資産クラス）。「銘柄別」に切り替えると、資産クラス → 銘柄（口座をまたいでまとめた銘柄）で表示。セルを選ぶと詳細（銘柄別では口座ごとの内訳）を表示 |
| 銘柄 | 銘柄ごとの評価額・構成比・前回比。口座をまたいで同じ銘柄はまとめて表示（口座ごとの表示にも切り替え可）。絞り込み・並べ替えと、未分類の銘柄の確認 |

UI は日本語で、スマホ優先のレスポンシブです（スマホは下部タブ、PC はサイドバー）。ダークモードと金額マスクに対応し、15 分間操作がないと自動でロックします（1 分前に予告します）。

## スプレッドシートの形式

アプリが読むのは、次の 2 つのシートだけです（シート名は固定）。詳細は [docs/requirements.md](docs/requirements.md) の「4. 入力データの仕様」を参照してください。

- **年次推移**: 2 行目が日付、B〜E 列がラベル（大分類・証券会社・口座区分・銘柄名）、F 列以降が評価額（円）。
- **銘柄マスタ**（任意）: A 列が銘柄名、B 列が資産クラス、C 列が地域、D 列が名寄せ名（任意）。無い場合や載っていない銘柄は「未分類」になります。
  - 証券会社によって同じ銘柄の表記が違うときは、それぞれの行の D 列に同じ名前を入れると、1 つの銘柄としてまとめて集計します。表記違いの候補はホームの「確認が必要」に出ます（自動ではまとめません）。

シートの集計行（全資産・現金・株式）は使わず、明細行から計算します。シートの値とずれていたら、画面に警告を出します。

## Google Cloud の設定

ログインと、シートの選択に使います。リポジトリには値を置かず、環境変数で渡します。

1. プロジェクトを作り、**Google Sheets API** と **Google Picker API** を有効にする。
2. OAuth 同意画面を設定する。スコープは **`drive.file` だけ**にする。
3. **OAuth クライアント ID**（ウェブアプリケーション）を作る。承認済みの JavaScript 生成元に、`http://localhost:5173` と `https://<ユーザー名>.github.io` を入れる。
4. **API キー**を作る。API の制限は Google Picker API だけ、HTTP リファラーは `https://<ユーザー名>.github.io/*` と `http://localhost:5173/*` だけにする。
5. 3 つの値を設定する。

| 変数 | 内容 |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | OAuth クライアント ID |
| `VITE_GOOGLE_API_KEY` | API キー（Picker 用） |
| `VITE_GOOGLE_APP_ID` | プロジェクト番号 |

ローカルでは `.env.local` に書きます（コミットしません）。GitHub Pages では、リポジトリの Settings → Secrets and variables → Actions → **Variables** に同じ名前で登録します。

## 公開（GitHub Pages）

`main` に push すると、GitHub Actions が lint・テスト・ビルドを行い、GitHub Pages に公開します（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）。Settings → Pages の Source は「GitHub Actions」にします。

## セキュリティの方針

公開リポジトリで、個人の資産データを扱うため、次を守っています。詳細は [CLAUDE.md](CLAUDE.md) を参照してください。

- 実際の金額・銘柄名は、コード・テスト・コミットに含めない（テストデータは架空）。
- トークンとシートのデータは、メモリにだけ置く。localStorage に保存するのは、スプレッドシートの ID と表示設定だけ。
- OAuth のスコープは `drive.file` だけ。通信先は Google API だけ（CSP で制限）。
- 外部 CDN、アクセス解析、エラー監視は使わない。
- コミット前に、データファイルや `.env` の混入を [scripts/pre-commit](scripts/pre-commit) で検査する。

## 開発環境

Node.js は Anaconda の仮想環境で管理しています。

```sh
# 初回のみ（macOS の場合、conda が OS バージョンを誤認するので上書きする）
CONDA_OVERRIDE_OSX=$(sw_vers -productVersion) conda create -n ledger-lens -c conda-forge --override-channels nodejs=22
conda activate ledger-lens
npm ci
sh scripts/install-hooks.sh   # 実データの混入を防ぐ pre-commit フック
cp .env.example .env.local    # Google Cloud で発行した値を入れる
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー（http://localhost:5173） |
| `npm test` | テスト |
| `npm run lint` | lint |
| `npm run build` | 本番ビルド（CSP の挿入と console の除去を行う） |
