# Ledger Lens

Google スプレッドシートの資産データを、ブラウザから Sheets API で直接読んでグラフ表示する、個人用の静的 SPA です。
データはブラウザのメモリ上でだけ扱い、リポジトリ、ビルド成果物、ブラウザの保存領域には置きません。

要件は [docs/requirements.md](docs/requirements.md) を参照してください。

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
