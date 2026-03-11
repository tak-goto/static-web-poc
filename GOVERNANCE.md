# Governance — Branch Strategy & Review Process

## Branch Structure

```
feature/* ──┐
            ├──▶  main  ──▶  staging  ──▶  production
 fix/*    ──┘
```

| Branch | 役割 | デプロイ先 | 直接push |
|---|---|---|---|
| `main` | 開発・統合 | Staging環境 (自動) | ✅ 可 |
| `staging` | リリース候補 | Staging確認 | ❌ PRのみ |
| `production` | 本番リリース | GitHub Pages (本番) | ❌ PRのみ |

## ワークフロー

### コンテンツ更新 (content/*.md, site.json)
```
1. main に直接 push
2. staging.yml が自動実行
3. Staging URLで確認
4. 問題なければ production へ PR
5. PR承認後 production.yml が本番デプロイ
```

### テンプレート・デザインシステム変更 (templates/, design-system/)
```
1. feature/* ブランチで作業
2. main へ PR を作成
3. HITL: pr-check.yml がテンプレート変更を検知
4. PR に自動コメント（チェックリスト付き）
5. CODEOWNERS による必須レビュー
6. 目視確認（Staging環境）
7. 承認後 merge → staging 自動デプロイ
8. Staging確認後 production へ PR
```

## HITL (Human-in-the-Loop) ルール

`templates/` または `design-system/` を含む変更は:

- PRを経由せず直接 main/production へ push **禁止**
- `pr-check.yml` が変更を検知し、PRに警告コメントを自動投稿
- CODEOWNERS により `@tak-goto` のレビューが必須
- Stagingで目視確認してから production PR を作成

## 本番デプロイの制限 (将来対応)

現在: `production` ブランチへのPRを承認した人がデプロイをトリガー

将来の強化手順:
1. GitHub → Settings → Environments → `production`
2. **Required reviewers** に許可するユーザーを追加
3. **Wait timer** (例: 5分) を設定してデプロイ前に確認時間を確保
4. **Deployment branches** を `production` のみに制限

→ これにより、指定ユーザーが承認しない限り本番デプロイがブロックされる。

## Branch Protection (GitHub設定で手動追加が必要)

### main ブランチ
- [x] Require status checks to pass (pr-check)
- [x] Require branches to be up to date

### production ブランチ
- [x] Require a pull request before merging
- [x] Require approvals: 1
- [x] Require status checks to pass (lint-and-build)
- [x] Restrict pushes — 直接pushを禁止
- [x] Required reviewers (Environments設定)
