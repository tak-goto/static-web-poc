# Governance — Branch Strategy & Review Process

## Branch Structure

```
feature/* ──┐
 fix/*    ──┴──▶  main  ──[PR]──▶  production
```

コードは `main` → `production` の2ブランチのみを経由します。
`staging` はブランチではなく **GitHub Actions の environment 名** です。

| Branch | 役割 | デプロイ | 直接push |
|---|---|---|---|
| `main` | 開発・統合 | staging environment へ自動デプロイ | ✅ 可（content/ / public/ のみ） |
| `production` | 本番リリース | production environment へデプロイ | ❌ PRのみ |
| `feature/*` | 機能開発 | なし | ✅ 可 |

### GitHub Pages とデプロイ環境の実態

`staging.yml`（main push）と `production.yml`（production push）は
**どちらも同一の GitHub Pages URL**（`https://tak-goto.github.io/static-web-poc`）
にデプロイします。GitHub Pages は1リポジトリ1URLのため、別URLの staging は存在しません。

```
main push  → staging.yml  → GitHub Pages（上書き）← staging 確認はここで行う
PR merge   → production.yml → GitHub Pages（上書き）← 本番リリース
```

"staging 確認" は production デプロイ前の最終チェックとして同一 URL で行います。
本番ロールバックが必要になった場合は `production.yml` の `rollback_tag` input を使用します。

---

## ワークフロー

### コンテンツ更新（content/*.md, site.json, public/images/）
```
1. main に直接 push（content/ / public/ は HITL 対象外）
2. staging.yml が自動実行 → GitHub Pages に反映
3. URL で目視確認
4. 問題なければ production へ PR を作成
5. PR 承認・merge → production.yml が本番デプロイ + GitHub Release 作成
```

### テンプレート・デザインシステム変更（templates/, design-system/）
```
1. feature/* ブランチで作業
2. main へ PR を作成
3. pr-check.yml が自動実行:
   - lint-and-build ジョブ（CI ゲート）
   - templates/ / design-system/ 変更を検知 → HITL 警告コメントを PR に投稿
4. CODEOWNERS により @tak-goto のレビューが必須
5. 目視確認（同一 URL で確認）
6. Approve → merge → staging.yml が自動デプロイ
7. 確認後 production へ PR → 本番リリース
```

### ビルドインフラ変更（build.js, scripts/lint.js）
テンプレートと同じ手順。CODEOWNERS により @tak-goto のレビュー必須。

### CI/CD ワークフロー変更（.github/workflows/）
テンプレートと同じ手順。権限昇格リスクがあるため CODEOWNERS で強制レビュー。

---

## HITL（Human-in-the-Loop）ルール

`templates/` `design-system/` を含む変更は:

- PR を経由せず直接 main へ push すると **staging.yml の HITL guard が CI を失敗させる**
- PR 経由の場合: `pr-check.yml` が検知し、HITL 警告コメントを PR に自動投稿（1 PR 1 コメント、重複なし）
- CODEOWNERS により `@tak-goto` のレビューが必須

| push 経路 | HITL guard の挙動 |
|---|---|
| 直接 push + templates/ 変更 | ❌ staging.yml が CI fail |
| PR merge（通常 merge commit）| ✅ "Merge pull request" を検知して通過 |
| PR merge（squash / rebase）+ templates/ 変更 | ❌ CI fail（通常 merge を使うこと） |
| `workflow_dispatch`（手動実行） | ⏭ スキップ（ロールバック用途のため意図的） |

---

## Branch Protection（GitHub Settings で設定が必要）

> ⚠️ この設定が完了するまでは production への直接 push が可能な状態です。
> HITL guard のみが防衛線となります。リポジトリ作成直後に設定してください。

**`production` ブランチ:**

| 設定 | 値 |
|---|---|
| Require a pull request before merging | ✅ |
| Required number of approvals | `1` |
| Require status checks to pass | ✅ → `lint-and-build` |
| Require branches to be up to date | ✅ |
| Do not allow bypassing | ✅（管理者含む） |

**`main` ブランチ（推奨）:**

| 設定 | 値 |
|---|---|
| Require status checks to pass | ✅ → `lint-and-build` |

---

## Environment 保護設定（GitHub Settings で設定が必要）

**`production` environment:**

| 設定 | 値 |
|---|---|
| Required reviewers | `@tak-goto`（デプロイ承認者） |
| Deployment branches | `production` ブランチのみ |
| Wait timer | 5分（任意・デプロイ前の確認猶予） |

詳細手順は README Section 4-2 を参照。

---

## リリース管理

`production` ブランチへの merge ごとに GitHub Release が自動作成されます。
タグ形式: `v{YYYY}.{MM}.{DD}-{n}`（例: `v2026.03.12-1`）

ロールバックは Actions → `production.yml` → **Run workflow** → `rollback_tag` に対象タグを入力。
ビルドをスキップして dist.zip を直接再デプロイします。
