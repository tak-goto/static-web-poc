# static-web-poc

Markdownベースの軽量静的CMSです。デザイントークン・テンプレートシステム・GitHub Actions自動デプロイで構成されています。

## セットアップ

```bash
npm install
```

## ローカルビルド（CIと等価）

```bash
npm run preview   # lint → build → lint
```

`dist/` に出力されます。CSSはビルドごとにハッシュが付与され、ブラウザキャッシュが自動的に無効化されます（`style.css?v=xxxxxxxx`）。

## ページ追加

```bash
# content/pages/ に Markdown を置くだけ
cat > content/pages/team.md << 'EOF'
---
title: チーム
meta_description: Acme Corp のチーム紹介です。
---

## メンバー
...
EOF

npm run preview   # → dist/team.html が生成される
```

## ブランチ戦略

```
feature/* ─┐
            ├──▶  main  ──▶  staging  ──▶  production
fix/*      ─┘
```

| branch | 役割 | デプロイ | 直接push |
|---|---|---|---|
| `main` | 開発・統合 | Staging 自動 | ✅ content/ のみ |
| `production` | 本番リリース | GitHub Pages 本番 | ❌ PRのみ |

詳細は [GOVERNANCE.md](GOVERNANCE.md) を参照。

## HITL ルール

`templates/` または `design-system/` への変更は **PRが必須** です。
直接pushするとCI（staging.yml）が失敗します。

## ファイル構成

```
content/          ← ここを編集してページを追加・更新
  site.json       ← ナビ・フッター・サイト共通設定
  index.md        ← トップページ
  pages/          ← 各ページ (ファイル名 = URL)
templates/        ← ⚠️ HITL必須 — 変更はPR経由で
  base.html
  components/
design-system/    ← ⚠️ HITL必須 — 変更はPR経由で
  tokens.css
  base.css
build.js          ← ビルドスクリプト（CSSハッシュ生成を含む）
scripts/lint.js   ← テンプレートlinter
docs/             ← セットアップ・設計ドキュメント
  SETUP_GITHUB_MCP.md  ← GitHub MCP + Claude.ai 連携手順
```

## GitHub MCP 連携

Claude.ai からこのリポジトリを直接操作する設定手順は  
[docs/SETUP_GITHUB_MCP.md](docs/SETUP_GITHUB_MCP.md) を参照してください。

GitHub App の作成・インストール・Claude.ai 側の Client ID / Secret 設定まで  
必要なすべての手順をまとめています。
