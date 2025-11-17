# Supabase CLI 完全自動セットアップガイド

このガイドでは、ブラウザを一切使わずにSupabaseを完全にCLIで管理します。

---

## 🚀 クイックスタート（完全CLI版）

### 前提条件

- ✅ Supabase CLI インストール済み
- ✅ Docker Desktop インストール済み
- ✅ Supabaseアカウント作成済み

---

## 📦 Step 1: ローカル開発環境構築（今すぐ試せる）

### 1-1. プロジェクト初期化

```bash
cd /Users/gaku/github-activity-aggregator

# Supabaseプロジェクト初期化
supabase init
```

**生成されるファイル**:
```
supabase/
├── config.toml          # Supabase設定
├── seed.sql             # 初期データ
└── migrations/          # マイグレーションファイル
```

### 1-2. スキーマをマイグレーションに移動

```bash
# 既存のschema.sqlをマイグレーションに変換
mkdir -p supabase/migrations
cp supabase/schema.sql supabase/migrations/20251117000000_initial_schema.sql
```

### 1-3. ローカルSupabase起動

```bash
# Docker経由でローカルSupabaseを起動
supabase start

# 出力例:
# Started supabase local development setup.
#
#          API URL: http://localhost:54321
#      GraphQL URL: http://localhost:54321/graphql/v1
#           DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#       Studio URL: http://localhost:54323
#     Inbucket URL: http://localhost:54324
#       JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
#         anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**重要**: この出力をコピーして保存！

### 1-4. スキーマ適用

```bash
# マイグレーション適用
supabase db reset

# 確認
supabase db diff
```

### 1-5. ローカルStudioで確認

```bash
# ブラウザで自動的に開く
open http://localhost:54323
```

**または**、完全CLIで確認:

```bash
# テーブル一覧
supabase db list

# PostgreSQLに直接接続
psql postgresql://postgres:postgres@localhost:54322/postgres

# SQL実行
\dt  -- テーブル一覧
SELECT * FROM repositories;
\q   -- 終了
```

---

## 🌐 Step 2: リモート（本番）プロジェクト作成

### 2-1. Supabaseにログイン

```bash
# ブラウザでOAuth認証
supabase login

# 成功メッセージ確認
# Logged in successfully!
```

### 2-2. Organization ID確認

```bash
# Organization一覧表示
supabase orgs list

# 出力例:
# ORGANIZATION ID                        NAME
# xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   Personal
```

### 2-3. リモートプロジェクト作成

```bash
# プロジェクト作成
supabase projects create github-activity-aggregator \
  --org-id <your-org-id> \
  --db-password '<strong-password>' \
  --region ap-northeast-1

# 出力例:
# Created a new project github-activity-aggregator at https://xxxxx.supabase.co
# Project ID: xxxxxxxxxxxxxxxxxxxxx
```

**パスワード要件**:
- 最低12文字
- 大文字・小文字・数字を含む

### 2-4. ローカルとリンク

```bash
# プロジェクト一覧
supabase projects list

# リンク
supabase link --project-ref <project-ref>

# 確認
supabase status
```

### 2-5. 本番環境にスキーマデプロイ

```bash
# マイグレーション適用
supabase db push

# 成功メッセージ確認
# Applying migration 20251117000000_initial_schema.sql...
# Finished supabase db push.
```

---

## 🔄 Step 3: 開発ワークフロー

### スキーマ変更の流れ

```bash
# 1. ローカルで新しいマイグレーション作成
supabase migration new add_topics_column

# 2. 生成されたファイルを編集
# supabase/migrations/20251117120000_add_topics_column.sql
vim supabase/migrations/20251117120000_add_topics_column.sql
```

```sql
-- 例: topics列追加
ALTER TABLE repositories
ADD COLUMN topics TEXT[] DEFAULT '{}';
```

```bash
# 3. ローカルで適用
supabase db reset

# 4. 確認
psql postgresql://postgres:postgres@localhost:54322/postgres
SELECT column_name FROM information_schema.columns WHERE table_name = 'repositories';

# 5. 本番にデプロイ
supabase db push
```

---

## 🧪 Step 4: テストデータ投入

### seed.sqlに初期データ記述

```bash
# supabase/seed.sql を編集
cat > supabase/seed.sql <<'EOF'
-- テストデータ
INSERT INTO repositories (name, full_name, url, language, created_at, updated_at) VALUES
('github-activity-aggregator', 'Gaku52/github-activity-aggregator', 'https://github.com/Gaku52/github-activity-aggregator', 'TypeScript', NOW(), NOW()),
('test-repo', 'Gaku52/test-repo', 'https://github.com/Gaku52/test-repo', 'JavaScript', NOW(), NOW());
EOF
```

```bash
# データ投入（ローカル）
supabase db reset

# 確認
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT name, language FROM repositories;"
```

---

## 🔐 Step 5: 環境変数取得（完全CLI）

### ローカル環境

```bash
# ローカル接続情報表示
supabase status

# .envファイル自動生成
cat > .env <<EOF
# ローカル開発用
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=$(supabase status | grep 'anon key' | awk '{print $3}')
SUPABASE_SERVICE_KEY=$(supabase status | grep 'service_role key' | awk '{print $3}')
EOF
```

### 本番環境

```bash
# APIキー表示
supabase projects api-keys --project-ref <project-ref>

# .env.production生成
cat > .env.production <<EOF
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>
EOF
```

---

## 📊 Step 6: データベース操作（CLI）

### バックアップ

```bash
# ローカル
supabase db dump -f backup_local.sql

# リモート
supabase db dump --linked -f backup_production.sql
```

### リストア

```bash
# ローカル
psql postgresql://postgres:postgres@localhost:54322/postgres < backup_local.sql

# リモート（要注意）
supabase db push --include-all
```

### 差分確認

```bash
# ローカルとリモートの差分
supabase db diff --linked

# 特定のスキーマとの差分
supabase db diff --schema public
```

---

## 🛠️ Step 7: 便利なコマンド集

### プロジェクト管理

```bash
# プロジェクト一覧
supabase projects list

# プロジェクト削除
supabase projects delete <project-ref>

# ログ表示
supabase logs --project-ref <project-ref>
```

### データベース管理

```bash
# マイグレーション一覧
supabase migration list

# マイグレーション修復（エラー時）
supabase migration repair <version> --status applied

# ローカルDB完全リセット
supabase db reset --linked
```

### 開発環境

```bash
# ローカルSupabase起動
supabase start

# ローカルSupabase停止
supabase stop

# ローカルSupabase完全削除（データ含む）
supabase stop --no-backup

# ステータス確認
supabase status
```

---

## 🔄 Step 8: CI/CDでの自動化

### GitHub Actions例

```yaml
# .github/workflows/supabase-deploy.yml
name: Deploy to Supabase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link to Supabase
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy migrations
        run: supabase db push
```

---

## 📋 完全自動化スクリプト

### 初回セットアップスクリプト

```bash
#!/bin/bash
# setup-supabase.sh - 完全自動セットアップ

set -e

echo "🚀 Supabase完全自動セットアップ開始..."

# 1. 初期化
echo "📦 Step 1: プロジェクト初期化"
supabase init

# 2. スキーマ移動
echo "📝 Step 2: スキーマ準備"
mkdir -p supabase/migrations
cp supabase/schema.sql supabase/migrations/20251117000000_initial_schema.sql

# 3. ローカル起動
echo "🐳 Step 3: ローカルSupabase起動"
supabase start

# 4. スキーマ適用
echo "🗄️ Step 4: スキーマ適用"
supabase db reset

# 5. 確認
echo "✅ Step 5: 確認"
supabase status

echo ""
echo "🎉 セットアップ完了！"
echo ""
echo "次のステップ:"
echo "  1. http://localhost:54323 でStudio確認"
echo "  2. supabase login でリモート接続"
echo "  3. supabase projects create で本番環境作成"
```

実行:
```bash
chmod +x setup-supabase.sh
./setup-supabase.sh
```

---

## 🎯 まとめ

### CLI版のメリット

| 項目 | ブラウザ版 | CLI版 |
|-----|----------|-------|
| **速度** | 遅い | 超高速 |
| **自動化** | ❌ 不可 | ✅ 完全自動 |
| **Git管理** | ❌ 不可 | ✅ 可能 |
| **ローカル開発** | ❌ 不可 | ✅ 可能 |
| **CI/CD** | ❌ 困難 | ✅ 簡単 |

### 推奨ワークフロー

```
1. ローカル開発（supabase start）
   ↓
2. スキーマ変更（migration new）
   ↓
3. テスト（supabase db reset）
   ↓
4. Git commit & push
   ↓
5. 本番デプロイ（supabase db push）
   ↓
6. 自動実行（GitHub Actions）
```

---

## 🔍 次のステップ

- [ ] `./setup-supabase.sh` 実行
- [ ] ローカル環境でテスト
- [ ] リモートプロジェクト作成
- [ ] GitHub Actionsでデプロイ自動化

---

**作成日**: 2025-11-17
