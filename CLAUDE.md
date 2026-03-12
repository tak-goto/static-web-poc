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
npm install
npm run preview   # lint → build → lint
```

`npm run preview` と各 CI ワークフローのステップ対応:

| ステップ | staging.yml / production.yml | pr-check.yml | ローカル preview |
|---|---|---|---|
| 依存インストール | `npm install` | `npm install` | `npm install` |
| pre-lint | `npm run lint` | `npm run lint` | `npm run lint` |
| HITL guard / detect | push 時にブロック | テンプレート変更を検知・コメント | なし（CI専用） |
| build | `npm run build` | `npm run build` | `npm run build` |
| post-lint | `npm run lint` | `npm run lint` | `npm run lint` |

> HITL guard / detect は CI 専用ステップです。ローカルに相当するものはありません。
> ローカルで templates/ を変更した場合は `feature/*` ブランチを使い PR 経由で push してください。

**等価性の保証:** lint・build のステップは全 CI と完全に同一です。
`package.json` の `preview` と `ci` スクリプトは同一コマンド列で定義されています。
変更する場合は必ず両方を同じ内容に保つこと。

---

## ファイル変更ルール

### ✅ content/ — 自由に変更可（直接 main push 可）
- `content/site.json` : ナビ・フッター・サイト名
- `content/index.md` : トップページ
- `content/pages/*.md` : 各ページ（ファイル名 = URL）
- 変更後 `npm run preview` → 問題なければ main に直接 push 可

### ✅ public/ — 自由に変更可（直接 main push 可）
- `public/images/` : 画像ファイル（PNG / JPEG / WebP / SVG）
- `public/fonts/` : セルフホストフォント（任意）
- ビルド時に `dist/` へ自動コピーされる
- Markdown から `![alt](images/filename.jpg)` で参照

### ⚠️ templates/ — HITL 必須（CODEOWNERS: @tak-goto）
- **直接 main push 禁止** — staging.yml HITL guard が CI を失敗させる
- `feature/*` ブランチで作業 → PR → レビュー → merge（通常 merge commit 使用）
- PR 作成時に pr-check.yml が HITL 警告コメントを自動投稿する（1 PR 1 コメント）

### ⚠️ design-system/ — HITL 必須（CODEOWNERS: @tak-goto）
- templates/ と同じルール
- `tokens.css` の変更は全ページに影響するため特に慎重に

### ⚠️ build.js / scripts/ — HITL 必須（CODEOWNERS: @tak-goto）
- ビルドインフラ。変更は全ページに影響する
- PR 経由・@tak-goto のレビュー必須

### ⚠️ .github/workflows/ — HITL 必須（CODEOWNERS: @tak-goto）
- ワークフロー変更は権限昇格リスクあり
- 必ず PR 経由・`@tak-goto` のレビュー必須

### ⚠️ GOVERNANCE.md / CLAUDE.md — HITL 必須（CODEOWNERS: @tak-goto）
- 運用ルールを定義するポリシー文書
- 変更には PR 経由・@tak-goto のレビュー必須

---

## 画像アップロードのワークフロー

```
画像ファイル
  └─ 置く場所: public/images/<filename>
  └─ Markdown での参照: ![説明](images/<filename>)
  └─ 生成される URL: /static-web-poc/images/<filename>
```

### アップロード方法（優先順）

**① GitHub Web UI（非エンジニア向け・推奨）**
```
1. GitHub リポジトリを開く
2. public/images/ フォルダに移動
3. Add file → Upload files
4. 画像をドラッグ&ドロップ
5. Commit directly to main（content 扱いのため）
→ staging.yml が自動起動してデプロイ
```

**② Git CLI（エンジニア向け）**
```bash
cp path/to/image.jpg public/images/
git add public/images/image.jpg
git commit -m "content: add image for news page"
git push origin main
```

**③ 外部 CDN（画像が大量 / 変換が必要な場合）**
```markdown
![説明](https://res.cloudinary.com/acme/image/upload/...)
```
リポジトリに置かず、URL を Markdown に直接記載。
build.js の変更は不要。

### 画像最適化のガイドライン
- 形式: WebP 優先（JPEG / PNG も可）
- サイズ: 幅 1600px 以下にリサイズしてからアップロード
- ファイル名: `kebab-case`（例: `osaka-office-2025.webp`）
- Claude (MCP) 経由では**バイナリファイルを push できない** → Web UI か CLI を使うこと

---

## ページ追加の手順

```bash
# 1. Markdown ファイルを作成
cat > content/pages/newpage.md << 'EOF'
---
title: ページタイトル（10〜60字）
meta_description: ページの説明文（50〜160字）。
---

# 見出し（h1 必須）

本文...

![画像](images/photo.webp)
EOF

# 2. プレビュー確認
npm run preview
# → dist/newpage.html が生成される

# 3. push（content/ の変更なので main 直接 push 可）
```

---

## 本番リリース手順

```
main → (GitHub Pages で目視確認) → production への PR → レビュー → merge → 本番自動デプロイ
```

詳細は README Section 7 を参照。

---

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|---|---|---|
| `Unresolved {{variables}}` | frontmatter のキーが未定義 | content/*.md の frontmatter を確認 |
| `missing partial` | components/*.html が存在しない | templates/components/ にファイルを追加 |
| `unknown CSS var` | tokens.css に未定義のトークン | design-system/tokens.css にトークンを追加 |
| `YAML parse error` | frontmatter の書式エラー | --- の前後、インデント、クォートを確認 |
| `HITL violation` | templates/ を直接 push した | feature/* ブランチから PR を作成すること |
| `title too short/long` | SEO lint (check 5) に引っかかった | title を 10〜60 字に調整 |
| `description too short/long` | SEO lint (check 6) に引っかかった | meta_description を 50〜160 字に調整 |
| `no <h1> found` | SEO lint (check 7) に引っかかった | ページに `# 見出し` を追加 |
