# Daily Recorder Lambda - AWS デプロイガイド

**所要時間**: 約1.5時間
**前提条件**: ローカルで `npm run daily` の動作確認済み

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
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

---

## Step 1: デプロイパッケージ作成（10分）

### 1.1 Daily Recorder Lambda パッケージ

```bash
cd lambda/daily-recorder
npm install --production
npm run build

# zipパッケージ作成
cd dist
zip -r ../../daily-recorder-lambda.zip .
cd ..
zip -r ../daily-recorder-lambda.zip node_modules
cd ..
```

**確認**: `daily-recorder-lambda.zip` ファイルが作成される

---

## Step 2: AWS Lambda 関数作成（10分）

### 2.1 Daily Recorder Lambda 作成

1. **AWS Management Console** を開く
2. サービス検索で **Lambda** を検索して移動
3. 「**関数の作成**」ボタンをクリック
4. 以下を設定：
   - **関数名**: `github-daily-recorder`
   - **ランタイム**: `Node.js 20.x`
   - **アーキテクチャ**: `x86_64`
   - **実行ロール**: 「基本的なLambda アクセス権限で新しいロールを作成」を選択
5. 「**関数の作成**」をクリック

---

## Step 3: コードアップロード（5分）

### 3.1 Daily Recorder Lambda にコードアップロード

1. `github-daily-recorder` 関数を開く
2. 「**コード**」タブを選択
3. 「**アップロード元**」→ 「**.zip ファイル**」を選択
4. `daily-recorder-lambda.zip` をアップロード
5. 「**保存**」をクリック

---

## Step 4: 環境変数設定（10分）

### 4.1 Daily Recorder Lambda の環境変数

1. `github-daily-recorder` 関数を開く
2. 「**設定**」タブ → 「**環境変数**」を選択
3. 「**編集**」をクリック
4. 以下の環境変数を追加：

| キー | 値 |
|-----|-----|
| `GITHUB_TOKEN` | ghp_xxxxxxxxxxxxx |
| `GITHUB_USERNAME` | Gaku52 |
| `SUPABASE_URL` | https://xxxxx.supabase.co |
| `SUPABASE_SERVICE_KEY` | eyJxxxxxxxxxxxxx |
| `NOTION_API_KEY` | secret_xxxxxxxxxxxxx |
| `NOTION_DATABASE_ID` | 298a438d-9c2d-8061-bda1-d538e8a81ed6 |
| `ANTHROPIC_API_KEY` | sk-ant-xxxxxxxxxxxxx |

5. 「**保存**」をクリック

---

## Step 5: Lambda 関数設定（10分）

### 5.1 タイムアウト・メモリ設定

1. 「**設定**」タブ → 「**一般設定**」を選択
2. 「**編集**」をクリック
3. 以下を設定：
   - **メモリ**: `512 MB`
   - **タイムアウト**: `5分` (Claude API呼び出しのため)
   - **エフェメラルストレージ**: `512 MB`（デフォルト）
4. 「**保存**」をクリック

### 5.2 ハンドラー設定の確認

1. 「**コード**」タブを開く
2. 「**ランタイム設定**」で「**編集**」をクリック
3. **ハンドラー**: `index.handler` になっていることを確認
4. なっていなければ修正して「**保存**」

---

## Step 6: IAM ロール権限追加（5分）

### 6.1 CloudWatch Logs 権限を追加

1. 「**設定**」タブ → 「**アクセス権限**」を選択
2. 「**ロール名**」のリンクをクリック（IAMコンソールに移動）
3. 「**許可ポリシーをアタッチ**」をクリック
4. 検索ボックスに `CloudWatchLogsFullAccess` と入力
5. チェックボックスを選択して「**ポリシーのアタッチ**」をクリック

---

## Step 7: 手動テスト実行（10分）

### 7.1 Daily Recorder Lambda のテスト

1. `github-daily-recorder` 関数を開く
2. 「**テスト**」タブを選択
3. 「**新しいイベントを作成**」を選択
4. **イベント名**: `test-daily`
5. **イベントJSON**: 以下を入力（昨日の日付を指定）
```json
{
  "date": "2025-11-24"
}
```
6. 「**保存**」をクリック
7. 「**テスト**」ボタンをクリック
8. **実行結果**を確認：
   - ステータス: `成功`
   - レスポンス: `statusCode: 200`
   - ログに「=== 完了 ===」が表示される
   - **Notionで新しいページが作成されたか確認** ✨
   - プロパティ（日付、カテゴリ、ステータス、所要時間）が設定されているか確認

---

## Step 8: EventBridge スケジュール設定（15分）

### 8.1 Daily Recorder のスケジュール作成

1. AWS Console で **EventBridge** を検索して移動
2. 左メニューから「**スケジュール**」を選択
3. 「**スケジュールを作成**」をクリック
4. 以下を設定：

**スケジュールの詳細:**
- **スケジュール名**: `github-daily-recorder`
- **説明**: `毎日GitHubアクティビティを記録してNotionに投稿`
- **スケジュールグループ**: `default`

**スケジュールパターン:**
- **頻度ベースのスケジュール** を選択
- **繰り返し**: `毎日`
- **時刻**: `09:00`（JST = UTC 00:00）
- **タイムゾーン**: `Asia/Tokyo`

**ターゲット:**
- **ターゲットタイプ**: `AWS Lambda Invoke`
- **Lambda 関数**: `github-daily-recorder` を選択
- **ペイロード**: 空のまま（前日のデータを自動取得）
```json
{}
```

**実行ロール:**
- **新しいロールを作成** を選択

5. 「**スケジュールを作成**」をクリック

---

## Step 9: CloudWatch ログ確認（10分）

### 9.1 ログストリームの確認

1. AWS Console で **CloudWatch** を検索して移動
2. 左メニューから「**ロググループ**」を選択
3. 以下のロググループを確認：
   - `/aws/lambda/github-daily-recorder`
4. ロググループをクリックして最新のログストリームを確認
5. 以下が表示されているか確認：
   - `=== 日次記録生成開始 ===`
   - `Claude APIで分析中...`
   - `Categories: xxx, xxx`
   - `Notionに投稿中...`
   - `=== 完了 ===`

### 9.2 エラーハンドリング

もしエラーが出た場合：
1. エラーメッセージを確認
2. 環境変数が正しく設定されているか確認
3. Supabaseのテーブル（daily_reports）が存在するか確認
4. Notionのプロパティ（日付、カテゴリ、ステータス、所要時間）が設定されているか確認
5. IAMロールの権限を確認
6. 再度テスト実行

---

## 🎉 完了！

全てのステップが完了したら、Daily Recorder Lambdaのデプロイは完了です！

### 確認チェックリスト

- [ ] Lambda関数がデプロイされている
- [ ] 環境変数が正しく設定されている
- [ ] 手動テストが成功している
- [ ] EventBridgeスケジュールが作成されている（毎日09:00 JST）
- [ ] CloudWatchログでエラーがない
- [ ] Notionにレポートが正常に配信される
- [ ] Notionのプロパティ（日付、カテゴリ、ステータス、所要時間）が設定される

---

## トラブルシューティング

### エラー: "Task timed out after 3.00 seconds"

**原因**: タイムアウト時間が短すぎる（Claude API呼び出しに時間がかかる）
**解決**: Lambda設定でタイムアウトを5分に延長

### エラー: "Cannot find module 'xxxx'"

**原因**: node_modulesがzipに含まれていない
**解決**: デプロイパッケージを再作成（node_modules含める）

### エラー: "ANTHROPIC_API_KEY is not defined"

**原因**: 環境変数が設定されていない
**解決**: Lambda設定で環境変数を追加

### エラー: "Supabase: No data returned"

**原因**: Supabaseのテーブル（daily_reports）が存在しない
**解決**: マイグレーションを実行
```bash
npm run migrate
```

### Notionページが作成されない

**原因**: Notion APIキーまたはDatabase IDが間違っている
**解決**: 環境変数を再確認、Notionの権限も確認

### Notionのプロパティが設定されない

**原因**: Notionデータベースに必要なプロパティが存在しない
**解決**: `NOTION_PROPERTIES_SETUP.md` を参照してプロパティを追加

---

## 運用について

### 毎日のフロー

1. **毎日09:00（JST）**に自動実行
2. 前日（昨日）のGitHubアクティビティを取得
3. Claude APIで学習内容を分析（カテゴリ抽出）
4. 所要時間とステータスを推定
5. Supabaseに保存
6. Notionの月別ページに追記（プロパティ付き）

### コスト見積もり

- **Lambda実行**: 1日1回 × 約30秒 = 約$0.0001/日
- **Claude API**: 1日1回 × 約1,500トークン = 約$0.005/日
- **月額合計**: 約$0.15（約¥22）

非常に低コストで運用できます！

---

## 次のステップ

Daily Recorder Lambda デプロイ完了後：
- 1週間運用して動作確認
- エラー通知の設定（CloudWatch Alarms）
- バックアップ戦略の実装
- 既存の週次Lambda（collector, generator, publisher）との連携確認
