# GitHub MCP セットアップガイド

Claude.ai から GitHub リポジトリを直接操作するための設定手順です。
このプロジェクトは **GitHub Remote MCP Server** を利用して構築しました。

---

## 概要：何ができるか

Claude.ai のチャット画面から：
- ファイルの読み書き・コミット・プッシュ
- ブランチ作成・PR作成・マージ
- GitHub Actions の確認

---

## 1. GitHub App の作成

GitHub MCP は OAuth App ではなく **GitHub App** として登録します。

### 1-1. App 登録

1. https://github.com/settings/apps/new を開く
2. 以下を入力：

| 項目 | 値 |
|---|---|
| GitHub App name | 任意（例: `my-claude-mcp`） |
| Homepage URL | 任意（例: `https://claude.ai`） |
| Callback URL | `https://claude.ai/oauth/callback` |
| Webhook | **Active のチェックを外す**（不要） |

3. **Permissions（Repository permissions）** を設定：

| Permission | Level |
|---|---|
| Contents | Read & Write |
| Actions | Read & Write |
| Workflows | Read & Write |
| Pull requests | Read & Write |
| Metadata | Read（自動付与） |

4. **Where can this GitHub App be installed?** → `Only on this account`

5. 「Create GitHub App」をクリック

### 1-2. 認証情報を控える

App 作成後の画面で以下を確認・保存：

| 項目 | 用途 |
|---|---|
| **Client ID** | Claude.ai の MCP 設定に入力 |
| **Client Secret**（Generate a new client secret） | Claude.ai の MCP 設定に入力 |

> ⚠️ Client Secret は作成直後しか表示されません。必ずコピーしておく。

### 1-3. App をリポジトリにインストール

1. GitHub App ページ左メニュー「Install App」
2. 対象アカウントの「Install」をクリック
3. **対象リポジトリを選択**（"All repositories" または個別指定）
4. 「Install」をクリック

> インストール前は App が認識されていても対象リポジトリへの書き込みが拒否されます。
> `Contents: Write` エラーが出た場合はこのステップを確認してください。

---

## 2. Claude.ai での MCP 設定

### 2-1. MCP Server の追加

1. Claude.ai → **Settings（歯車アイコン）**
2. 「**Integrations**」または「**Connectors**」タブ
3. 「Add MCP Server」または「Connect」から GitHub を選択
4. 接続方式として **Remote MCP Server (URL方式)** を選択

### 2-2. パラメータ入力

以下を入力：

| 項目 | 値 |
|---|---|
| MCP Server URL | `https://api.githubcopilot.com/mcp` |
| Client ID | 手順 1-2 で取得した Client ID |
| Client Secret | 手順 1-2 で取得した Client Secret |

> **注意:** Claude.ai の UI は変更されることがあります。
> 「GitHub」コネクタとして既定で表示される場合は Client ID/Secret の入力欄が
> 別途展開されるので確認してください。

### 2-3. OAuth 認証の完了

設定後、GitHub の OAuth 認証画面にリダイレクトされます。
「Authorize」をクリックして連携を完了します。

---

## 3. 権限の確認

接続後、Claude から以下を確認できます：

```
GitHub MCP が接続されていることを確認して
```

Claude が `get_me` ツールを呼び出し、認証ユーザー名が返れば成功です。

---

## 4. よくあるトラブル

| 症状 | 原因 | 対処 |
|---|---|---|
| `Contents: Write` エラー | App がリポジトリにインストールされていない | 手順 1-3 を実施 |
| `Actions: Write` エラー | App の Actions 権限が不足 | GitHub App の Permission を更新し再インストール |
| `Workflows: Write` エラー | Workflows 権限が未付与 | 同上 |
| OAuth 認証が完了しない | Callback URL の不一致 | App の Callback URL が `https://claude.ai/oauth/callback` か確認 |
| 接続できるがリポジトリが見えない | インストール先リポジトリの絞り込みミス | Install App → リポジトリ選択を確認 |

---

## 5. セキュリティ上の注意

- Client Secret は **絶対にリポジトリにコミットしない**
- GitHub App は **必要最小限の権限のみ付与**する
- 不要になった場合は GitHub App 設定から Revoke / Delete を行う
- このプロジェクトでは `Workflows: Read & Write` が必要です
  （`.github/workflows/` を Claude が直接編集するため）
