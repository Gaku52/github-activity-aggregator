# Supabase セットアップチェックリスト

## 現在の状況（スクリーンショットより）

✅ テーブル作成済み:
- `public.repositories`
- `public.commits`
- `public.weekly_activities`
- `public.generated_reports`
- `public.platform_stats`

⚠️ セキュリティ警告:
- **RLS Disabled**: 5つ（意図的な設計なので問題なし）
- **Security Definer View**: 2つ（要修正）

---

## 必要な作業

### 1. Security Definer View の修正（必須）

Supabaseダッシュボードで以下を実行：

1. SQL Editorを開く
2. `supabase/fix-security-definer-views.sql` の内容をコピー＆実行
3. セキュリティアドバイザーで警告が消えたことを確認

**実行するSQL**: `/Users/gaku/github-activity-aggregator/supabase/fix-security-definer-views.sql`

---

### 2. RLS無効化の確認（オプション）

RLSが無効になっているのは**意図的な設計**です：
- Lambda関数のみがアクセス
- ユーザー認証は不要
- `service_role`キーで全アクセス

確認したい場合は `supabase/disable-rls.sql` を実行：

```sql
ALTER TABLE repositories DISABLE ROW LEVEL SECURITY;
ALTER TABLE commits DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats DISABLE ROW LEVEL SECURITY;
```

---

## セキュリティ警告について

### 🟢 RLS Disabled（問題なし）

これらの警告は**無視してOK**です：

**理由**:
- このプロジェクトはLambda関数専用
- 一般ユーザーがデータベースに直接アクセスしない
- `service_role`キーで安全に管理

**プロダクション環境での注意**:
- `service_role`キーは絶対に公開しない
- 環境変数で安全に管理
- Lambda関数のみが使用

---

### 🔴 Security Definer View（要修正）

この警告は**修正が必要**です：

**問題**:
- ビューが `SECURITY DEFINER` で作成されている
- 実行時にビュー作成者の権限で動作（セキュリティリスク）

**解決策**:
- `SECURITY INVOKER` に変更
- 実行時に呼び出し側の権限で動作

---

## 修正後の確認

### 1. セキュリティアドバイザーで確認

SupabaseダッシュボードのSecurity Advisorで：
- ✅ Errors: 0 errors（エラーなし）
- ⚠️ Warnings: 0 warnings または RLS関連のみ
- ℹ️ Info: 0 suggestions

### 2. テーブル一覧を確認

Table Editorで5つのテーブルが表示されることを確認：
- repositories
- commits
- weekly_activities
- generated_reports
- platform_stats

### 3. ビューの動作確認

SQL Editorで実行：

```sql
-- 最新週のサマリーが取得できるか確認
SELECT * FROM latest_week_summary LIMIT 5;

-- 月次統計が取得できるか確認
SELECT * FROM monthly_stats LIMIT 5;
```

データがない場合は空の結果が返りますが、エラーが出なければOKです。

---

## 次のステップ

セキュリティ警告の修正が完了したら：

1. **環境変数の設定**
   ```bash
   # .env ファイルを作成
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_KEY=eyJhbGc...  # Lambda用
   ```

2. **接続テスト**
   ```bash
   # Lambda関数から接続できるか確認
   npm run test:connection
   ```

3. **データ取り込みテスト**
   ```bash
   # GitHubからデータを取得してSupabaseに保存
   npm run sync:repos
   ```

---

## トラブルシューティング

### Q: "uuid-ossp extension already exists" エラー

**A**: 無視してOK（Supabaseにデフォルトで入っています）

### Q: テーブルが表示されない

**A**:
1. `schema.sql`を再実行
2. ブラウザをリフレッシュ
3. Table Editorのサイドバーを確認

### Q: 接続エラー

**A**:
1. Project Settings → APIで接続情報を確認
2. URLとキーが正しいか確認
3. IPアドレス制限を確認（Free tierは制限なし）

---

## 参考ファイル

- `supabase/schema.sql` - 完全なデータベーススキーマ
- `supabase/disable-rls.sql` - RLS無効化スクリプト
- `supabase/fix-security-definer-views.sql` - Security Definer修正スクリプト（本ファイル）
- `supabase/README.md` - 詳細なセットアップガイド
