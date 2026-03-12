# static-web-poc

Markdownベースの軽量静的CMSです。デザイントークン・テンプレートシステム・GitHub Actions自動デプロイで構成されています。

---

## 目次

1. [前提条件](#前提条件)
2. [GitHub App の作成](#1-github-app-の作成)
3. [Claude Web での MCP 連携設定](#2-claude-web-での-mcp-連携設定)
4. [リポジトリの選択とインストール](#3-リポジトリの選択とインストール)
5. [GitHub リポジトリの設定](#4-github-リポジトリの設定)
6. [ローカル開発セットアップ](#5-ローカル開発セットアップ)
7. [日常的なワークフロー](#6-日常的なワークフロー)
8. [ファイル構成](#ファイル構成)
9. [リリース管理](#リリース管理)

---

## 前提条件

| 必要なもの | 用途 |
|---|---|
| GitHub アカウント | リポジトリ管理・GitHub Pages |
| Claude.ai アカウント (Pro以上推奨) | MCP経由でのリポジトリ操作 |
| Node.js 20以上 | ローカルビルド (任意) |

---

## 1. GitHub App の作成

Claude Web から GitHub MCP Server 経由でリポジトリを操作するために、GitHub App が必要です。

### 1-1. App を作成する

1. GitHub → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**
2. 以下を入力：

| 項目 | 値 |
|---|---|
| GitHub App name | 任意（例: `my-claude-mcp`） |
| Homepage URL | 任意（例: `https://github.com/your-username`） |
| Callback URL | `https://claude.ai/oauth/callback` |
| Webhook | **Active のチェックを外す** |

3. **Permissions** を以下のように設定：

**Repository permissions:**

| Permission | Level | 用途 |
|---|---|---|
| Contents | **Read & Write** | ファイル読み書き・ブランチ操作 |
| Actions | **Read & Write** | Workflow の読み取り・手動トリガー |
| Workflows | **Read & Write** | `.github/workflows/` の更新 |
| Pull requests | **Read & Write** | PR 作成・コメント |
| Metadata | **Read** (必須) | リポジトリ基本情報 |

4. **Where can this GitHub App be installed?** → **Only on this account**
5. **Create GitHub App** をクリック

### 1-2. Client Secret を生成する

1. 作成した App のページ → **General** → **Client secrets** → **Generate a new client secret**
2. 表示された Secret を**必ずコピーして保管**（再表示されません）

### 1-3. メモしておく値

後の手順で使用します：

```
Client ID  : Iv23li...（App ページ上部に表示）
Client Secret : （上記でコピーした値）
```

---

## 2. Claude Web での MCP 連携設定

1. [claude.ai](https://claude.ai) を開く
2. 左下の **☰ メニュー** または **Settings** → **Connectors** または **Integrations**
3. **GitHub** を探して **Connect** をクリック
4. MCP Server として `https://api.githubcopilot.com/mcp` が使用されます（公式 GitHub Remote MCP Server）
5. 認証フローが始まり、以下を求められます：
   - **Client ID** : [1-3](#1-3-メモしておく値) でメモした値
   - **Client Secret** : [1-3](#1-3-メモしておく値) でメモした値
6. GitHub の OAuth 認証画面にリダイレクトされるので **Authorize** をクリック

---

## 3. リポジトリの選択とインストール

GitHub App を特定のリポジトリだけにインストールすることで、Claude に渡す権限を最小化できます。

### 3-1. App をリポジトリにインストール

1. GitHub → **Settings** → **Developer settings** → **GitHub Apps** → 作成した App → **Install App**
2. **Install** をクリック
3. **Only select repositories** を選択 → このリポジトリ（`static-web-poc`）を選択
4. **Install** をクリック

> ⚠️ **All repositories** は選ばない。MCPが操作できるリポジトリを明示的に絞る。

---

## 4. GitHub リポジトリの設定

### 4-1. GitHub Pages の設定

1. リポジトリ → **Settings** → **Pages**
2. **Source** → **GitHub Actions** を選択

### 4-2. Environments の設定

**staging 環境：**
1. **Settings** → **Environments** → **New environment** → `staging`
2. 特に制限なし（自動デプロイ）

**production 環境：**
1. **Settings** → **Environments** → **New environment** → `production`
2. **Required reviewers** → 本番デプロイを承認できるユーザーを追加
3. **Deployment branches** → `production` ブランチのみに制限
4. (任意) **Wait timer** : `5` 分（デプロイ前の確認猶予）

### 4-3. Branch Protection Rules

**Settings** → **Branches** → **Add branch protection rule**

`production` ブランチ：

| 設定 | 値 |
|---|---|
| Branch name pattern | `production` |
| Require a pull request before merging | ✅ |
| Required number of approvals | `1` |
| Require status checks to pass | ✅ → `lint-and-build` を選択 |
| Restrict who can push | ✅ → 管理者のみ |

`main` ブランチ（任意・推奨）：

| 設定 | 値 |
|---|---|
| Branch name pattern | `main` |
| Require status checks to pass | ✅ → `lint-and-build` を選択 |

### 4-4. CODEOWNERS の確認

`.github/CODEOWNERS` で `templates/` `design-system/` `workflows/` の変更には `@tak-goto` のレビューが必須になっています。変更する場合はこのファイルも更新してください。

---

## 5. ローカル開発セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/tak-goto/static-web-poc.git
cd static-web-poc

# 依存関係インストール
npm install

# プレビュービルド (CI と完全に同一)
npm run preview
```

`dist/` に出力されます。ブラウザで `dist/index.html` を開いて確認できます。

---

## 6. 日常的なワークフロー

### コンテンツ更新（Claude Web 経由・推奨）

```
Claude に依頼
  → MCP 経由で content/*.md または content/site.json を直接編集
  → main に push
  → staging.yml が自動起動 → Staging 確認
  → production への PR → レビュー → merge → 本番デプロイ + Release 作成
```

### ページ追加

`content/pages/` に Markdown を置くだけで自動的にページが増えます：

```markdown
---
title: ページタイトル
meta_description: 50〜160字の説明文（SEO lint チェックあり）
---

# 見出し（h1 は必須 — lint チェックあり）

本文...
```

### テンプレート・デザイン変更（HITL 必須）

```bash
# 1. feature ブランチを作成
git checkout -b feature/update-hero

# 2. templates/ または design-system/ を変更
# 3. プレビュー確認
npm run preview

# 4. PR 作成 → pr-check.yml が HITL 警告コメントを自動投稿
# 5. レビュー・目視確認 → Approve → merge
```

> 直接 main に push すると staging.yml の HITL guard が CI を失敗させます。

### 画像アップロード

| 方法 | 手順 |
|---|---|
| GitHub Web UI（推奨） | リポジトリ → `public/images/` → Add file → Upload |
| Git CLI | `cp image.webp public/images/ && git add && git push` |
| 外部 CDN | Markdown に URL を直接記載 |

Markdown での参照：
```markdown
![説明テキスト](images/filename.webp)
```

---

## ファイル構成

```
content/               ← ✅ 自由に編集可（main 直接 push 可）
  site.json            ← ナビ・フッター・OGP・base_url
  index.md             ← トップページ
  pages/               ← 各ページ（ファイル名 = URL）
public/                ← ✅ 自由に編集可（main 直接 push 可）
  images/              ← 画像ファイル
templates/             ← ⚠️ HITL必須（PR 経由のみ）
  base.html            ← OGP・canonical・CSS リンクを含む
  components/          ← header / hero / footer
design-system/         ← ⚠️ HITL必須（PR 経由のみ）
  tokens.css           ← デザイントークン（全ページに影響）
  base.css             ← コンポーネントスタイル
build.js               ← ビルドスクリプト（sitemap / robots 自動生成）
scripts/lint.js        ← Linter（SEO チェック含む 11項目）
.github/
  CODEOWNERS           ← templates/ 等のレビュー必須設定
  workflows/
    staging.yml        ← main push → Staging 自動デプロイ
    production.yml     ← production merge → 本番デプロイ + Release
    pr-check.yml       ← PR 時 lint + HITL 検知
```

---

## リリース管理

`production` ブランチへの merge ごとに GitHub Release が自動作成されます。

### Release の命名規則

```
v{YYYY}.{MM}.{DD}-{n}
例: v2026.03.12-1, v2026.03.12-2
```

### Release に含まれるもの

- 前回 Release からのコミット一覧（自動生成）
- CSS フィンガープリント（バージョン識別用）
- **dist.zip** — ビルド成果物（ロールバック用）

### ロールバック手順

```bash
# GitHub CLI を使用
gh release download v2026.03.12-1 -p "dist.zip"
unzip dist.zip

# dist/ を GitHub Pages に再デプロイ
# → Actions の workflow_dispatch から production.yml を手動実行
```

### リリース履歴の確認

リポジトリ → **Releases** タブ から全バージョンを参照できます。
