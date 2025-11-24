# AWS デプロイガイド - Phase 5

**所要時間**: 約4時間
**前提条件**: ローカルで全Lambda関数の動作確認済み

---

## 📋 事前準備

### 必要な情報

以下の情報を`.env`ファイルから確認しておく：

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_USERNAME=Gaku52
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxxxxxxxxxx
NOTION_API_KEY=secret_xxxxxxxxxxxxx
NOTION_DATABASE_ID=298a438d-9c2d-8061-bda1-d538e8a81ed6
SLACK_WEBHOOK_URL=（オプション）
```

---

## Step 1: デプロイパッケージ作成（20分）

### 1.1 Collector Lambda パッケージ

```bash
cd lambda/collector
npm install --production
npm run build

# zipパッケージ作成
cd dist
zip -r ../../collector-lambda.zip .
cd ..
zip -r ../collector-lambda.zip node_modules
cd ..
```

### 1.2 Generator Lambda パッケージ

```bash
cd lambda/generator
npm install --production
npm run build

cd dist
zip -r ../../generator-lambda.zip .
cd ..
zip -r ../generator-lambda.zip node_modules
cd ..
```

### 1.3 Publisher Lambda パッケージ

```bash
cd lambda/publisher
npm install --production
npm run build

cd dist
zip -r ../../publisher-lambda.zip .
cd ..
zip -r ../publisher-lambda.zip node_modules
cd ..
```

**確認**: 以下の3つのzipファイルが作成される
- `collector-lambda.zip`
- `generator-lambda.zip`
- `publisher-lambda.zip`

---

## Step 2: AWS Lambda 関数作成（30分）

### 2.1 Collector Lambda 作成

1. **AWS Management Console** を開く
2. サービス検索で **Lambda** を検索して移動
3. 「**関数の作成**」ボタンをクリック
4. 以下を設定：
   - **関数名**: `github-activity-collector`
   - **ランタイム**: `Node.js 20.x`
   - **アーキテクチャ**: `x86_64`
   - **実行ロール**: 「基本的なLambda アクセス権限で新しいロールを作成」を選択
5. 「**関数の作成**」をクリック

### 2.2 Generator Lambda 作成

同様の手順で作成：
- **関数名**: `github-activity-generator`
- **ランタイム**: `Node.js 20.x`
- その他は同じ

### 2.3 Publisher Lambda 作成

同様の手順で作成：
- **関数名**: `github-activity-publisher`
- **ランタイム**: `Node.js 20.x`
- その他は同じ

---

## Step 3: コードアップロード（15分）

### 3.1 Collector Lambda にコードアップロード

1. `github-activity-collector` 関数を開く
2. 「**コード**」タブを選択
3. 「**アップロード元**」→ 「**.zip ファイル**」を選択
4. `collector-lambda.zip` をアップロード
5. 「**保存**」をクリック

### 3.2 Generator Lambda にコードアップロード

同様に `generator-lambda.zip` をアップロード

### 3.3 Publisher Lambda にコードアップロード

同様に `publisher-lambda.zip` をアップロード

---

## Step 4: 環境変数設定（30分）

### 4.1 Collector Lambda の環境変数

1. `github-activity-collector` 関数を開く
2. 「**設定**」タブ → 「**環境変数**」を選択
3. 「**編集**」をクリック
4. 以下の環境変数を追加：

| キー | 値 |
|-----|-----|
| `GITHUB_TOKEN` | ghp_xxxxxxxxxxxxx |
| `GITHUB_USERNAME` | Gaku52 |
| `SUPABASE_URL` | https://xxxxx.supabase.co |
| `SUPABASE_SERVICE_KEY` | eyJxxxxxxxxxxxxx |

5. 「**保存**」をクリック

### 4.2 Generator Lambda の環境変数

同様に以下を設定：

| キー | 値 |
|-----|-----|
| `SUPABASE_URL` | https://xxxxx.supabase.co |
| `SUPABASE_SERVICE_KEY` | eyJxxxxxxxxxxxxx |

### 4.3 Publisher Lambda の環境変数

同様に以下を設定：

| キー | 値 |
|-----|-----|
| `SUPABASE_URL` | https://xxxxx.supabase.co |
| `SUPABASE_SERVICE_KEY` | eyJxxxxxxxxxxxxx |
| `NOTION_API_KEY` | secret_xxxxxxxxxxxxx |
| `NOTION_DATABASE_ID` | 298a438d-9c2d-8061-bda1-d538e8a81ed6 |
| `SLACK_WEBHOOK_URL` | （オプション） |

---

## Step 5: Lambda 関数設定（20分）

各Lambda関数で以下を設定：

### 5.1 タイムアウト・メモリ設定

1. 「**設定**」タブ → 「**一般設定**」を選択
2. 「**編集**」をクリック
3. 以下を設定：
   - **メモリ**: `512 MB`
   - **タイムアウト**: `5分`
   - **エフェメラルストレージ**: `512 MB`（デフォルト）
4. 「**保存**」をクリック

**3つの関数すべてに適用**

### 5.2 ハンドラー設定の確認

1. 「**コード**」タブを開く
2. 「**ランタイム設定**」で「**編集**」をクリック
3. **ハンドラー**: `index.handler` になっていることを確認
4. なっていなければ修正して「**保存**」

---

## Step 6: IAM ロール権限追加（20分）

### 6.1 CloudWatch Logs 権限を追加

各Lambda関数で：

1. 「**設定**」タブ → 「**アクセス権限**」を選択
2. 「**ロール名**」のリンクをクリック（IAMコンソールに移動）
3. 「**許可ポリシーをアタッチ**」をクリック
4. 検索ボックスに `CloudWatchLogsFullAccess` と入力
5. チェックボックスを選択して「**ポリシーのアタッチ**」をクリック

**3つの関数すべてに適用**

---

## Step 7: 手動テスト実行（30分）

### 7.1 Collector Lambda のテスト

1. `github-activity-collector` 関数を開く
2. 「**テスト**」タブを選択
3. 「**新しいイベントを作成**」を選択
4. **イベント名**: `test-event`
5. **イベントJSON**: 以下を入力
```json
{
  "since": "2025-11-16T00:00:00Z"
}
```
6. 「**保存**」をクリック
7. 「**テスト**」ボタンをクリック
8. **実行結果**を確認：
   - ステータス: `成功`
   - レスポンス: `statusCode: 200`
   - ログに「✅ 環境変数確認完了」などが表示される

### 7.2 Generator Lambda のテスト

同様に以下のイベントでテスト：

```json
{
  "week_offset": 1
}
```

### 7.3 Publisher Lambda のテスト

同様に空のイベントでテスト：

```json
{}
```

---

## Step 8: EventBridge スケジュール設定（20分）

### 8.1 Collector のスケジュール作成

1. AWS Console で **EventBridge** を検索して移動
2. 左メニューから「**スケジュール**」を選択
3. 「**スケジュールを作成**」をクリック
4. 以下を設定：

**スケジュールの詳細:**
- **スケジュール名**: `github-collector-weekly`
- **説明**: `週次でGitHubデータを収集`
- **スケジュールグループ**: `default`

**スケジュールパターン:**
- **頻度ベースのスケジュール** を選択
- **繰り返し**: `毎週`
- **曜日**: `月曜日`
- **時刻**: `09:00`（JST = UTC 00:00）
- **タイムゾーン**: `Asia/Tokyo`

**ターゲット:**
- **ターゲットタイプ**: `AWS Lambda Invoke`
- **Lambda 関数**: `github-activity-collector` を選択
- **ペイロード**: 以下を入力
```json
{
  "since": "2025-11-16T00:00:00Z"
}
```

**実行ロール:**
- **新しいロールを作成** を選択

5. 「**スケジュールを作成**」をクリック

### 8.2 Generator のスケジュール作成

同様に作成：
- **スケジュール名**: `github-generator-weekly`
- **時刻**: `09:30`（Collector の30分後）
- **Lambda 関数**: `github-activity-generator`
- **ペイロード**:
```json
{
  "week_offset": 0
}
```

### 8.3 Publisher のスケジュール作成

同様に作成：
- **スケジュール名**: `github-publisher-weekly`
- **時刻**: `10:00`（Generator の30分後）
- **Lambda 関数**: `github-activity-publisher`
- **ペイロード**:
```json
{}
```

---

## Step 9: CloudWatch ログ確認（30分）

### 9.1 ログストリームの確認

1. AWS Console で **CloudWatch** を検索して移動
2. 左メニューから「**ロググループ**」を選択
3. 以下のロググループを確認：
   - `/aws/lambda/github-activity-collector`
   - `/aws/lambda/github-activity-generator`
   - `/aws/lambda/github-activity-publisher`
4. 各ロググループをクリックして最新のログストリームを確認
5. エラーがないか確認

### 9.2 エラーハンドリング

もしエラーが出た場合：
1. エラーメッセージを確認
2. 環境変数が正しく設定されているか確認
3. IAMロールの権限を確認
4. 再度テスト実行

---

## Step 10: E2Eテスト（45分）

### 10.1 手動で全体フローを実行

1. **Collector** を手動実行
   - テストイベントで実行
   - ログで「🎉 収集完了！」を確認
   - Supabaseで `commits` テーブルにデータが追加されたか確認

2. **Generator** を手動実行
   - テストイベントで実行
   - ログで「🎉 レポート生成完了！」を確認
   - Supabaseで `generated_reports` テーブルにデータが追加されたか確認

3. **Publisher** を手動実行
   - テストイベントで実行
   - ログで「🎉 配信完了！」を確認
   - **Notionで新しいページが作成されたか確認** ✨

### 10.2 スケジュールの動作確認

次の月曜日まで待って、自動実行されることを確認

---

## 🎉 完了！

全てのステップが完了したら、Phase 5（AWSデプロイ）は完了です！

### 確認チェックリスト

- [ ] 3つのLambda関数がデプロイされている
- [ ] 環境変数が正しく設定されている
- [ ] 手動テストが全て成功している
- [ ] EventBridgeスケジュールが作成されている
- [ ] CloudWatchログでエラーがない
- [ ] Notionにレポートが正常に配信される
- [ ] E2Eテストが成功している

---

## トラブルシューティング

### エラー: "Task timed out after 3.00 seconds"

**原因**: タイムアウト時間が短すぎる
**解決**: Lambda設定でタイムアウトを5分に延長

### エラー: "Cannot find module 'xxxx'"

**原因**: node_modulesがzipに含まれていない
**解決**: デプロイパッケージを再作成（node_modules含める）

### エラー: "SUPABASE_URL is not defined"

**原因**: 環境変数が設定されていない
**解決**: Lambda設定で環境変数を追加

### Notionページが作成されない

**原因**: Notion APIキーまたはDatabase IDが間違っている
**解決**: 環境変数を再確認、Notionの権限も確認

---

## 次のステップ

Phase 5完了後：
- 運用監視の設定
- エラー通知の設定
- バックアップ戦略の実装
- ドキュメントの最終更新
