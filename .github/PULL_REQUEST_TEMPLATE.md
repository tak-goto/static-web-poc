## 変更内容

<!-- このPRで変更した内容を箇条書きで記載してください -->
-
-

## 変更の種別

<!-- 当てはまるものにチェックを入れてください -->
- [ ] コンテンツ更新（content/*.md / public/images/）
- [ ] テンプレート変更（templates/ / design-system/）⚠️ HITL 必須
- [ ] ビルドインフラ変更（build.js / scripts/）⚠️ HITL 必須
- [ ] ワークフロー変更（.github/workflows/）⚠️ HITL 必須
- [ ] その他（README / GOVERNANCE 等）

## マージ前チェックリスト

### 全変更共通
- [ ] `pr-check.yml`（lint-and-build）が ✅ になっている
- [ ] 変更内容を上記に記載した

### テンプレート・インフラ変更の場合（HITL）
- [ ] GitHub Pages URL で目視確認済み
- [ ] デザイントークンが壊れていない
- [ ] 全ページが正常にレンダリングされる
- [ ] CODEOWNERS レビュー（@tak-goto）が完了している

## マージ後に自動実行されること

**main ブランチへの merge:**
- `staging.yml` → GitHub Pages にデプロイ（staging 確認）

**production ブランチへの merge（リリース PR）:**
- `production.yml` → GitHub Pages 本番デプロイ
- GitHub Release 自動作成（タグ `v{YYYY}.{MM}.{DD}-{n}`、dist.zip 添付）

---
<!-- リリースPRの場合はタイトルを "Release v2026.XX.XX-N" 形式にしてください -->
