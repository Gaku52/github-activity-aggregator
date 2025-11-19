# Supabase "Project not specified" エラー - トラブルシューティング

## 診断結果

### 症状
- ✅ 環境変数: すべて正しく設定済み
- ✅ Supabase URL: 正しい形式 (`https://pzsrzoxdixcmaeialfjh.supabase.co`)
- ✅ Service Role JWT: 正しい形式とペイロード
- ❌ REST API: Status 400 - "Project not specified."
- ❌ PostgreSQL: 接続拒否 (ECONNREFUSED)

### 根本原因
**Supabaseプロジェクトのデータベースが起動していない**

考えられる理由:
1. プロジェクトが新規作成されたばかり(約1時間前)で、初期化が完了していない
2. プロジェクトが一時停止(Paused)状態
3. データベースの設定が完了していない

## 解決手順

### ステップ1: Supabaseダッシュボードでプロジェクト状態を確認

1. ブラウザで開く: https://supabase.com/dashboard/project/pzsrzoxdixcmaeialfjh

2. プロジェクトステータスを確認:
   - **"Active"** または **"Healthy"** - 正常
   - **"Paused"** または **"Inactive"** - 一時停止中
   - **"Restoring"** または **"Setting up"** - 初期化中

3. もし一時停止中なら:
   - "Resume Project" ボタンをクリック
   - 再起動完了まで数分待つ

### ステップ2: データベース設定を確認

1. 左メニュー → **"Database"** をクリック

2. **"Connection Info"** で確認:
   - Host: `db.pzsrzoxdixcmaeialfjh.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`

3. **"Tables"** タブで確認:
   - テーブルが存在するか確認
   - 存在しない場合は、スキーマをセットアップ

### ステップ3: スキーマをセットアップ

もしテーブルがまだ作成されていない場合:

1. Supabase Dashboard → **"SQL Editor"** を開く

2. 以下のSQLファイルを実行:
   ```
   supabase/migrations/20251117000000_initial_schema.sql
   ```

3. または、ローカルのSQLファイルの内容をコピー&ペーストして実行

### ステップ4: 接続テストを再実行

プロジェクトが起動したら、以下のコマンドでテスト:

```bash
cd lambda/collector
node diagnose-supabase.js
```

期待される結果:
```
Test 2: REST API (HTTPリクエスト)
  Status Code: 200

Test 3: Supabase JS Client
  ✅ Query success: [...]

Test 4: 直接PostgreSQL接続
  ✅ 接続成功
  Tables: repositories, commits, weekly_activities, ...
```

## 代替手段: ローカルSupabase環境

もしリモートプロジェクトの問題が解決しない場合、ローカル環境で開発を進めることも可能:

1. Docker Desktopをインストール
2. `supabase start` でローカルSupabaseを起動
3. 環境変数を更新:
   ```
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_KEY=(ローカルキー)
   ```

## 参考情報

- Supabase Project: https://supabase.com/dashboard/project/pzsrzoxdixcmaeialfjh
- Project Reference ID: `pzsrzoxdixcmaeialfjh`
- Region: Northeast Asia (Tokyo)
- Created: 2025-11-18 12:46:04

## 次のステップ

プロジェクトが起動したら:

1. ✅ `lambda/collector/test-supabase.js` でSupabase接続確認
2. ✅ `npm run build && npm run test` でLambda関数のローカルテスト
3. ✅ GitHub APIとの統合テスト
