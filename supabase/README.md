# Supabase セットアップガイド

このディレクトリには、GitHub Activity AggregatorのSupabaseデータベース設定が含まれています。

---

## 🚀 クイックスタート（5分で完了）

### Step 1: Supabaseプロジェクト作成

1. **Supabaseにアクセス**
   ```
   https://supabase.com
   ```

2. **サインイン**
   - GitHubアカウントでログイン

3. **新規プロジェクト作成**
   - 「New Project」をクリック
   - プロジェクト名: `github-activity-aggregator`
   - データベースパスワード: **安全な場所に保存！**
   - リージョン: `Northeast Asia (Tokyo)` 推奨
   - プラン: **Free** でOK（開発用）

### Step 2: データベーススキーマ実行

1. **SQL Editorを開く**
   - 左サイドバー → 「SQL Editor」

2. **スキーマをコピペ実行**
   ```bash
   # supabase/schema.sql の内容をコピー
   cat supabase/schema.sql
   ```

   - SQL Editorに貼り付け
   - 「RUN」ボタンをクリック

3. **確認**
   - 左サイドバー → 「Table Editor」
   - 以下の5つのテーブルが表示されればOK:
     - ✅ `repositories`
     - ✅ `commits`
     - ✅ `weekly_activities`
     - ✅ `generated_reports`
     - ✅ `platform_stats`

### Step 3: 接続情報を取得

1. **Project Settings**
   - 左サイドバー → ⚙️ Settings → API

2. **環境変数をコピー**
   ```bash
   # プロジェクトURL
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

   # anon/public key（開発用）
   SUPABASE_ANON_KEY=eyJhbGc...

   # service_role key（Lambda用）※重要: 外部に漏らさない
   SUPABASE_SERVICE_KEY=eyJhbGc...
   ```

3. **`.env`ファイルに保存**（後で使用）
   ```bash
   # プロジェクトルートに作成
   touch .env
   ```

---

## 📊 テーブル構造

### 1. `repositories` - リポジトリマスタ
全GitHubリポジトリの基本情報

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | プライマリキー |
| name | TEXT | リポジトリ名 |
| full_name | TEXT | owner/repo形式（一意） |
| language | TEXT | 主要言語 |
| stars | INT | スター数 |
| updated_at | TIMESTAMP | 最終更新日 |

### 2. `commits` - コミット履歴
各コミットの詳細データ

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | プライマリキー |
| repo_id | UUID | リポジトリ外部キー |
| sha | TEXT | コミットハッシュ |
| message | TEXT | コミットメッセージ |
| additions | INT | 追加行数 |
| deletions | INT | 削除行数 |
| committed_at | TIMESTAMP | コミット日時 |

### 3. `weekly_activities` - 週次集計
リポジトリ別・週別の集計データ

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | プライマリキー |
| repo_id | UUID | リポジトリ外部キー |
| week_start | DATE | 週の開始日（月曜） |
| commits_count | INT | 週のコミット数 |
| lines_added | INT | 週の追加行数 |
| contributors | TEXT[] | コントリビューター配列 |

### 4. `generated_reports` - 生成レポート
各フォーマットのレポート

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | プライマリキー |
| period_start | DATE | レポート期間開始 |
| format | TEXT | notion/markdown/json/slack |
| content | JSONB | レポート本体 |
| published_at | TIMESTAMP | 配信日時 |

### 5. `platform_stats` - 統計
全リポジトリ統合の統計

| カラム名 | 型 | 説明 |
|---------|---|------|
| id | UUID | プライマリキー |
| date | DATE | 統計日付 |
| total_repos | INT | 総リポジトリ数 |
| active_repos | INT | アクティブリポジトリ数 |
| language_distribution | JSONB | 言語分布 |

---

## 🧪 動作確認（テストクエリ）

### 1. リポジトリ一覧取得
```sql
SELECT name, language, stars, updated_at
FROM repositories
ORDER BY updated_at DESC
LIMIT 10;
```

### 2. 最新週のアクティビティ
```sql
SELECT * FROM latest_week_summary;
```

### 3. 月次統計
```sql
SELECT * FROM monthly_stats
LIMIT 12;
```

---

## 🔒 セキュリティ設定（本番運用前）

### Row Level Security (RLS) 有効化

```sql
-- テーブル毎にRLSを有効化
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- ポリシー作成（Lambda用）
CREATE POLICY "Allow service role full access" ON repositories
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 📦 バックアップ

### 自動バックアップ（Supabase Pro）
- 日次バックアップ: 自動
- Point-in-Time Recovery: 7日間

### 手動バックアップ
```bash
# pg_dumpでエクスポート
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

---

## 🔄 マイグレーション管理

### スキーマ変更の手順

1. **新しいマイグレーションファイル作成**
   ```bash
   touch supabase/migrations/001_add_new_column.sql
   ```

2. **変更内容を記述**
   ```sql
   -- supabase/migrations/001_add_new_column.sql
   ALTER TABLE repositories
   ADD COLUMN topics TEXT[] DEFAULT '{}';
   ```

3. **SQL Editorで実行**

---

## 📊 容量管理

### 現在の使用量確認
```sql
-- データベースサイズ
SELECT pg_size_pretty(pg_database_size('postgres'));

-- テーブル別サイズ
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 推定データ量（1年運用）
- repositories: ~1MB
- commits: ~50MB（週100コミット想定）
- weekly_activities: ~5MB
- generated_reports: ~10MB
- platform_stats: ~1MB

**合計**: ~67MB/年（100GB上限に対して余裕）

---

## 🐛 トラブルシューティング

### Q1: スキーマ実行でエラーが出る
```
ERROR: extension "uuid-ossp" already exists
```
**対処**: 無視してOK（既にインストール済み）

### Q2: テーブルが表示されない
**対処**:
1. SQL Editorで再度実行
2. ブラウザリフレッシュ
3. 左サイドバー → Table Editorを確認

### Q3: 接続できない
**対処**:
1. Project Settings → API で接続情報確認
2. IPアドレス制限を確認（Freeプランは制限なし）
3. パスワードを再確認

---

## 📚 参考リンク

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [SQL入門チュートリアル](https://www.postgresqltutorial.com/)

---

## ✅ 次のステップ

データベース準備完了後:

1. [ ] `.env`ファイルに接続情報を記載
2. [ ] Lambda関数から接続テスト
3. [ ] GitHub APIトークン取得
4. [ ] Collector Lambda実装開始

---

**作成日**: 2025-11-17
**最終更新**: 2025-11-17
