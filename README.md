# static-web-poc

Markdownベースの軽量静的CMSです。デザイントークン・テンプレートシステム・GitHub Actions自動デプロイで構成されています。

## セットアップ

```bash
npm install
```

## ローカルビルド

```bash
npm run preview   # lint → build → lint (CI と完全に同一)
```

`dist/` に出力されます。

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

| branch | 役割 | デプロイ |
|---|---|---|
| `main` | 開発・統合 | Staging 自動 |
| `production` | 本番リリース | GitHub Pages 本番 |

詳細は [GOVERNANCE.md](GOVERNANCE.md) を参照。

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
build.js          ← ビルドスクリプト
scripts/lint.js   ← テンプレートlinter
```
