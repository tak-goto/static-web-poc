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
8. [本番リリース手順](#7-本番リリース手順)
9. [ファイル構成](#ファイル構成)
10. [ロールバック手順](#ロールバック手順)

---

## 前提条件

| 必要なもの | 用途 |
|---|---|
| GitHub アカウント | リポジトリ管理・GitHub Pages |
| Claude.ai アカウント (Pro以上推奨) | MCP経由でのリポジトリ操作 |
| Node.js 20以上 | ローカルビルド（任意） |

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
| Metadata | **Read**（必須） | リポジトリ基本情報 |

4. **Where can this GitHub App be installed?** → **Only on this account**
5. **Create GitHub App** をクリック

### 1-2. Client Secret を生成する

1. 作成した App のページ → **General** → **Client secrets** → **Generate a new client secret**
2. 表示された Secret を**必ずコピーして保管**（再表示されません）

### 1-3. メモしておく値

後の手順で使用します：

```
Client ID     : Iv23li...（App ページ上部に表示）
Client Secret : （上記でコピーした値）
```

---

## 2. Claude Web での MCP 連携設定

1. [claude.ai](https://claude.ai) を開く
2. 左下の **☰ メニュー** または **Settings** → **Connectors**
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

> ⚠️ **All repositories** は選ばない。MCP が操作できるリポジトリを明示的に絞る。

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
3. **Deployment branches** → **Selected branches** → `production` のみ
4. （任意）**Wait timer** : `5` 分（デプロイ前の確認猶予）

### 4-3. Branch Protection Rules

**Settings** → **Branches** → **Add branch protection rule**

**`production` ブランチ（厳格に保護）：**

| 設定 | 値 |
|---|---|
| Branch name pattern | `production` |
| Require a pull request before merging | ✅ |
| Required number of approvals | `1` |
| Require status checks to pass before merging | ✅ |
| Required status checks | `lint-and-build`（pr-check.yml のジョブ名） |
| Require branches to be up to date | ✅ |
| Do not allow bypassing the above settings | ✅（管理者も含めて強制） |

> ⚠️ **直接 push を禁止することで、必ず PR 経由のマージのみが production に入るようになります。**
> production.yml の HITL guard はこれと二重になりますが、`workflow_dispatch` 手動起動のケースにも対応するため両方有効にします。

**`main` ブランチ（推奨）：**

| 設定 | 値 |
|---|---|
| Branch name pattern | `main` |
| Require status checks to pass before merging | ✅ |
| Required status checks | `lint-and-build` |

### 4-4. CODEOWNERS の確認

`.github/CODEOWNERS` で `templates/` `design-system/` `workflows/` の変更には `@tak-goto` のレビューが必須になっています。

---

## 5. ローカル開発セットアップ

```bash
git clone https://github.com/tak-goto/static-web-poc.git
cd static-web-poc
npm install
npm run preview   # lint → build → lint（CI と完全に同一）
```

---

## 6. 日常的なワークフロー

### ブランチ構成と流れ

```
feature/* ─┐
fix/*      ─┤──▶  main  ──▶（Staging 自動デプロイ）
            │
            └──[PR: main → production]──▶  production  ──▶（本番デプロイ + Release）
```

### コンテンツ更新（Claude Web 経由・推奨）

```
1. Claude に依頼
     → MCP 経由で content/*.md / content/site.json / public/images/ を編集
     → main に push（content/ は直接 push 可）

2. staging.yml が自動起動
     → Staging URL で目視確認

3. 問題なければ → 本番リリース手順へ（下記セクション7）
```

### ページ追加

`content/pages/` に Markdown を置くだけでページが増えます：

```markdown
---
title: ページタイトル（10〜60字 — lint チェックあり）
meta_description: 50〜160字の説明文（lint チェックあり）
---

# 見出し（h1 は必須 — lint チェックあり）

本文...
```

### テンプレート・デザイン変更（HITL 必須）

```bash
# 1. feature ブランチで作業
git checkout -b feature/update-hero

# 2. templates/ または design-system/ を変更・確認
npm run preview

# 3. PR を main に作成
#    → pr-check.yml が lint + HITL 警告コメントを自動投稿
#    → CODEOWNERS による @tak-goto のレビューが必須

# 4. Approve → main へ merge → Staging 確認
# 5. 本番リリース手順へ
```

> `templates/` `design-system/` を直接 main に push すると staging.yml の HITL guard が CI を失敗させます。

### 画像アップロード

| 方法 | 手順 |
|---|---|
| GitHub Web UI（推奨） | リポジトリ → `public/images/` → Add file → Upload → commit to main |
| Git CLI | `cp image.webp public/images/ && git add && git push origin main` |
| 外部 CDN | Markdown に URL を直接記載（リポジトリに置かない） |

```markdown
![説明テキスト](images/filename.webp)
```

---

## 7. 本番リリース手順

> **production ブランチへの直接 push は Branch Protection により禁止されています。**
> **必ず `main → production` の Pull Request を作成・レビュー・マージしてください。**

### ステップごとの手順

```
Step 1  Staging 確認
        └─ https://{user}.github.io/{repo}/ （staging 環境）で目視確認

Step 2  PR 作成（main → production）
        └─ GitHub UI または Claude 経由で作成
           タイトル例: "Release v2026.03.12-1"
           本文: 変更内容・確認チェックリストを記載

Step 3  PR レビュー・CI 確認
        └─ pr-check.yml (lint-and-build) が ✅ になるまで待つ
        └─ Approver（Required reviewers に設定したユーザー）が Approve

Step 4  Merge
        └─ "Merge pull request" をクリック
           ※ Squash merge / Rebase merge は HITL guard の検知に影響するため
              通常の Merge commit を推奨

Step 5  自動実行（production.yml）
        ├─ lint → HITL guard（PR merge のため通過）→ build → lint
        ├─ GitHub Pages 本番デプロイ
        └─ GitHub Release 自動作成
              tag: v{YYYY}.{MM}.{DD}-{n}（例: v2026.03.12-1）
              assets: dist.zip（ロールバック用）
              body: 前回 Release 以降の commit 一覧（自動生成）
```

### Release の命名規則

```
v{YYYY}.{MM}.{DD}-{n}
例: v2026.03.12-1（同日2回目は v2026.03.12-2）
```

### CI が通過しない場合

| 原因 | 対処 |
|---|---|
| lint エラー（unresolved変数など） | main で修正して push → PR が自動更新 |
| SEO lint（title短すぎ等） | content/ を修正 |
| HITL violation | templates/ を直接 push した場合は PR 経由にする |

---

## ファイル構成

```
content/               ← ✅ 自由に編集可（main 直接 push 可）
  site.json            ← ナビ・フッター・OGP・base_url
  index.md             ← トップページ
  pages/               ← 各ページ（ファイル名 = URL）
public/                ← ✅ 自由に編集可（main 直接 push 可）
  images/              ← 画像ファイル（build 時に dist/ へコピー）
templates/             ← ⚠️ HITL 必須（PR 経由のみ）
  base.html            ← OGP・canonical・CSS リンクを含む
  components/          ← header / hero / footer
design-system/         ← ⚠️ HITL 必須（PR 経由のみ）
  tokens.css           ← デザイントークン（全ページに影響）
  base.css             ← コンポーネントスタイル
build.js               ← ビルドスクリプト（sitemap / robots 自動生成）
scripts/lint.js        ← Linter（11項目: SEO・performance・template）
.github/
  CODEOWNERS           ← templates/ 等のレビュー必須設定
  workflows/
    staging.yml        ← main push → Staging 自動デプロイ + HITL guard
    production.yml     ← production PR merge → 本番デプロイ + Release 作成
    pr-check.yml       ← PR 時 lint-and-build + HITL コメント自動投稿
GOVERNANCE.md          ← ブランチ戦略・運用ルール詳細
CLAUDE.md              ← Claude 作業時のルール（preview 必須・HITL 対象）
```

---

## ロールバック手順

```bash
# 1. ロールバックしたいバージョンの dist.zip を取得
gh release download v2026.03.12-1 -p "dist.zip"
unzip dist.zip -d rollback/

# 2. Actions → production.yml → Run workflow（workflow_dispatch）
#    で rollback/ の内容を手動デプロイ
#    （または dist.zip を展開して production ブランチに PR）
```

リポジトリ → **Releases** タブから全バージョンの dist.zip を参照・ダウンロードできます。
