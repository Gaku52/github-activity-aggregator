# Supabase CLI でセキュリティエラーを修正する手順

## 前提条件

- Supabase CLI インストール済み（✅ 完了）
- Supabaseアカウントがある

## ステップ1: アクセストークンを取得

1. https://supabase.com/dashboard/account/tokens にアクセス
2. 「Generate new token」をクリック
3. トークン名を入力（例: "CLI Access"）
4. トークンをコピー

## ステップ2: 環境変数に設定

```bash
export SUPABASE_ACCESS_TOKEN="your-access-token-here"
```

または`.env`ファイルに追加：

```bash
echo "SUPABASE_ACCESS_TOKEN=your-access-token-here" >> .env
```

## ステップ3: プロジェクトをリンク

```bash
cd /Users/gaku/github-activity-aggregator
supabase link --project-ref your-project-ref
```

プロジェクトリファレンスは、Supabaseダッシュボードの Project Settings → General → Reference ID から取得できます。

## ステップ4: SQLを実行

```bash
supabase db execute --remote --file supabase/fix-security-definer-views.sql
```

## ステップ5: 確認

```bash
# ビューが正しく作成されたか確認
supabase db execute --remote --command "SELECT schemaname, viewname FROM pg_views WHERE schemaname = 'public' AND viewname IN ('latest_week_summary', 'monthly_stats');"
```

---

## トラブルシューティング

### Q: "Cannot connect to the Docker daemon" エラー

**A**: これはローカル開発環境の問題です。`--remote`フラグを付けることでリモートデータベースに接続します。

### Q: "Authentication failed" エラー

**A**:
1. アクセストークンが正しいか確認
2. トークンの有効期限を確認
3. 新しいトークンを生成

### Q: プロジェクトリファレンスがわからない

**A**: Supabaseダッシュボード → Project Settings → General → Reference ID

---

## 推奨方法

**Supabase Dashboardで直接実行する方が簡単です**:
1. SQL Editorを開く
2. `supabase/fix-security-definer-views.sql` の内容をペースト
3. 実行

これで同じ結果が得られます。
