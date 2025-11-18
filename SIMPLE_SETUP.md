# 最もシンプルなセットアップ手順

**Docker不要・5分で完了**

---

## 🚀 Step 1: Supabaseプロジェクト作成

### 1-1. ログイン

```bash
supabase login
```

ブラウザが開いて認証完了

### 1-2. プロジェクト作成

```bash
supabase projects create github-activity-aggregator \
  --org-id bepsfxlmxnjvnpwthrhq \
  --db-password 'YourStrongPassword123!' \
  --region ap-northeast-1
```

**出力例**:
```
Created a new project github-activity-aggregator
Project ID: abcdefghijklmnopqrst
Database URL: https://abcdefghijklmnopqrst.supabase.co
```

**パスワード要件**:
- 12文字以上
- 大文字・小文字・数字を含む
- **必ず安全に保管！**

---

## 🔗 Step 2: プロジェクトにリンク

```bash
# プロジェクト一覧表示
supabase projects list

# 今作成したプロジェクトのREFERENCE IDをコピー

# リンク
supabase link --project-ref <REFERENCE_ID>
```

---

## 📊 Step 3: データベーススキーマ適用

### 3-1. マイグレーション準備

```bash
# マイグレーションディレクトリ作成
mkdir -p supabase/migrations

# スキーマをマイグレーションに変換
cp supabase/schema.sql supabase/migrations/20251117000000_initial_schema.sql
```

### 3-2. リモートにデプロイ

```bash
supabase db push
```

**成功メッセージ**:
```
Applying migration 20251117000000_initial_schema.sql...
Finished supabase db push.
```

---

## ✅ Step 4: 確認

### ブラウザで確認

```bash
# プロジェクト一覧から今作成したプロジェクトを確認
supabase projects list

# ブラウザでStudioを開く
# https://supabase.com/dashboard/project/<REFERENCE_ID>
```

左サイドバー → Table Editor で以下が表示されればOK:
- ✅ repositories
- ✅ commits
- ✅ weekly_activities
- ✅ generated_reports
- ✅ platform_stats

### CLIで確認

```bash
# テーブル一覧表示
supabase db diff --linked
```

---

## 🔐 Step 5: 接続情報取得

```bash
# APIキー表示
supabase projects api-keys --project-ref <REFERENCE_ID>
```

**出力**:
```
anon key: eyJhbGc...
service_role key: eyJhbGc...
```

### .env作成

```bash
cat > .env <<EOF
# GitHub Activity Aggregator - 本番環境

# GitHub API
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
GITHUB_USERNAME=Gaku52

# Supabase
SUPABASE_URL=https://<REFERENCE_ID>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>

# Notion (後で設定)
NOTION_API_KEY=
NOTION_DATABASE_ID=

# Slack (後で設定)
SLACK_WEBHOOK_URL=
EOF
```

---

## 🎉 完了！

### 準備できたもの

- ✅ Supabaseクラウドプロジェクト（5つ目）
- ✅ データベース（5テーブル）
- ✅ 接続情報（.env）

### 次のステップ

1. **GitHub API トークン取得**
   - https://github.com/settings/tokens
   - `repo` スコープ選択
   - `.env` に追加

2. **Lambda関数実装**（Phase 2）
   - Collector実装
   - ローカルでテスト

3. **AWS デプロイ**（Phase 5）

---

## 💡 重要なポイント

### Docker不要な理由

- ✅ Supabaseクラウドを直接使用
- ✅ AWS Lambdaはサーバーレス
- ✅ すべてクラウドで完結

### ローカル開発したい場合

**その場合のみ**Dockerが必要:
```bash
brew install --cask docker
supabase start
```

でも**本番運用には不要**

---

**所要時間**: 5分
**必要なもの**: Supabase CLI のみ
**Docker**: 不要
