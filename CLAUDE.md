# CLAUDE.md — Claude へのプロジェクト作業指示

このファイルは Claude (AI) がこのリポジトリで作業するときの動作ルールを定義します。

---

## 作業前に必ず確認すること

1. **変更対象のブランチ・ファイルを特定する**
2. **templates/ や design-system/ を変更する場合は HITL フラグを立てる**
3. **push 前に必ずプレビュービルドを実行する**

---

## プレビュービルド手順

```bash
# リポジトリのファイルを /tmp/site-build/ にセットアップして実行
npm install
npm run preview   # lint → build → lint
```

`npm run preview` は GitHub Actions の CI ステップと完全に同一です:

| ステップ | CI (staging.yml / production.yml) | ローカルプレビュー |
|---|---|---|
| 依存インストール | `npm install` | `npm install` |
| pre-lint | `npm run lint` | `npm run lint` |
| build | `npm run build` | `npm run build` |
| post-lint | `npm run lint` | `npm run lint` |

**等価性の保証:** `preview` と `ci` スクリプトは package.json 内で同一のコマンド列として定義されています。
変更する場合は必ず両方を同じ内容に保つこと。

---

## ファイル変更ルール

### ✅ content/ — 自由に変更可
- `content/site.json` : ナビ・フッター・サイト名
- `content/index.md` : トップページ
- `content/pages/*.md` : 各ページ（ファイル名 = URL）
- 変更後 `npm run preview` → 問題なければ main に直接 push 可

### ⚠️ templates/ — HITL 必須
- **直接 main push 禁止**
- `feature/*` ブランチで作業 → PR → レビュー → merge
- PR 作成時に pr-check.yml が HITL 警告コメントを自動投稿する
- Staging でビジュアル確認必須

### ⚠️ design-system/ — HITL 必須
- templates/ と同じルール
- `tokens.css` の変更は全ページに影響するため特に慎重に

### ⚠️ .github/workflows/ — HITL 必須
- ワークフロー変更は権限昇格リスクあり
- 必ず PR 経由・`@tak-goto` のレビュー必須

---

## ページ追加の手順

```bash
# 1. Markdown ファイルを作成
cat > content/pages/newpage.md << 'EOF'
---
title: ページタイトル
meta_description: ページの説明文。
---

## 見出し

本文...
EOF

# 2. プレビュー確認
npm run preview
# → dist/newpage.html が生成される

# 3. push（content/ の変更なので main 直接 push 可）
```

---

## 本番リリース手順

```
main → (staging 確認) → production への PR → レビュー → merge → 本番自動デプロイ
```

---

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|---|---|---|
| `Unresolved {{variables}}` | frontmatter のキーが未定義 | content/*.md の frontmatter を確認 |
| `missing partial` | components/*.html が存在しない | templates/components/ にファイルを追加 |
| `unknown CSS var` | tokens.css に未定義のトークン | design-system/tokens.css にトークンを追加 |
| `YAML parse error` | frontmatter の書式エラー | --- の前後、インデント、クォートを確認 |
