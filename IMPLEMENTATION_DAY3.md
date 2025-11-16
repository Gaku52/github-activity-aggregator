# 実装計画書 - 3日目（Lambda デプロイ）

**作業時間**: 21:00-23:00（2時間）
**前提**: 2日目（ローカル統合）が完了している

---

## 🎯 3日目の目標

**ゴール**: AWS Lambda にデプロイして手動実行できる

```
[ ] IAM Role 作成
[ ] Lambda 関数作成
[ ] デプロイパッケージ作成
[ ] Lambda にアップロード
[ ] 環境変数設定
[ ] 手動実行してNotion投稿成功
```

**所要時間**: 2時間

---

## 📋 作業開始前の確認

### 確認事項

```
[ ] 2日目の統合テストが成功している
[ ] npm run start でローカル実行できる
[ ] AWS アカウントにログインできる
[ ] AWS CLI がインストールされている（推奨）
```

### AWS CLI インストール（まだの場合）

**Mac**:
```bash
brew install awscli
```

**その他**:
https://aws.amazon.com/jp/cli/

### AWS CLI 設定

```bash
aws configure

# 入力項目:
# AWS Access Key ID: (AWS Console → IAM → ユーザー → 認証情報で取得)
# AWS Secret Access Key: (同上)
# Default region name: ap-northeast-1 (東京リージョン)
# Default output format: json
```

---

## 🔐 Step 6-1: IAM Role 作成（20分）

Lambda が実行するための権限を作成します。

### AWS Console で作成

```
[ ] 1. AWS Console にログイン
[ ] 2. 検索バーに「IAM」と入力 → IAM をクリック
[ ] 3. 左メニュー「ロール」→「ロールを作成」
[ ] 4. 信頼されたエンティティタイプ: 「AWS のサービス」
[ ] 5. ユースケース: 「Lambda」を選択
[ ] 6. 「次へ」をクリック
```

### 許可ポリシーの選択

```
[ ] 7. 検索バーに「AWSLambdaBasicExecutionRole」と入力
[ ] 8. チェックを入れる
[ ] 9. 「次へ」をクリック
```

### ロール名の設定

```
[ ] 10. ロール名: lambda-github-activity-role
[ ] 11. 説明: GitHub Activity Aggregator用のLambda実行ロール
[ ] 12. 「ロールを作成」をクリック
```

### ARN をコピー

```
[ ] 13. 作成されたロールをクリック
[ ] 14. ARN をコピー:
         arn:aws:iam::123456789012:role/lambda-github-activity-role
[ ] 15. メモ帳に保存（後で使います）
```

### AWS CLI で作成（代替方法）

```bash
# 信頼ポリシー作成
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# ロール作成
aws iam create-role \
  --role-name lambda-github-activity-role \
  --assume-role-policy-document file://trust-policy.json

# 基本実行ポリシーをアタッチ
aws iam attach-role-policy \
  --role-name lambda-github-activity-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# ARN 確認
aws iam get-role --role-name lambda-github-activity-role --query 'Role.Arn' --output text
```

### ✅ 完了チェック

```
[ ] IAM Role が作成された
[ ] ARN をコピーした
```

---

## 📦 Step 6-2: Lambda 用のコード準備（15分）

### src/index.ts を Lambda 用に修正

既存の `src/index.ts` は変更不要です。
Lambda のエントリーポイントを別ファイルで作成します。

### src/lambda.ts 作成

```bash
cat > src/lambda.ts << 'EOF'
import { Handler } from 'aws-lambda'
import { fetchWeeklyActivity } from './github/client'
import { analyzeCommits } from './claude/analyzer'
import { saveWeeklyReport, updateNotionUrl } from './supabase/client'
import { postToNotion } from './notion/client'

export const handler: Handler = async (event, context) => {
  console.log('=== Lambda 実行開始 ===')
  console.log('Event:', JSON.stringify(event, null, 2))

  const startTime = Date.now()

  try {
    // 期間設定（過去7日間）
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    console.log(`期間: ${weekAgo.toISOString()} 〜 ${now.toISOString()}`)

    // GitHub データ取得
    const { repos, commits } = await fetchWeeklyActivity(weekAgo, now)

    if (commits.length === 0) {
      console.log('今週のコミットはありませんでした。')
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'コミットなし' })
      }
    }

    // Claude で分析
    const summary = await analyzeCommits(commits)

    // レポート作成
    const report = {
      week_start: weekAgo.toISOString().split('T')[0],
      week_end: now.toISOString().split('T')[0],
      total_commits: commits.length,
      summary
    }

    // Supabase に保存
    const { id: reportId } = await saveWeeklyReport(report)

    // Notion に投稿
    const { url: notionUrl } = await postToNotion({
      date: report.week_end,
      total_commits: report.total_commits,
      summary: report.summary
    })

    // Notion URL を記録
    await updateNotionUrl(reportId, notionUrl)

    const duration = Date.now() - startTime

    console.log(`=== 完了（${duration}ms）===`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        commits: commits.length,
        notionUrl,
        duration
      })
    }

  } catch (error) {
    console.error('❌ エラー:', error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}
EOF
```

### tsconfig.json 確認

```bash
# tsconfig.json が正しいか確認
cat tsconfig.json

# "outDir": "./dist" になっているか確認
```

### ✅ 完了チェック

```
[ ] src/lambda.ts 作成完了
```

---

## 🏗️ Step 6-3: デプロイパッケージ作成（20分）

### ビルド

```bash
# TypeScript をビルド
npm run build

# dist/ フォルダができているか確認
ls -la dist/

# lambda.js が存在するか確認
ls dist/lambda.js
```

### 本番用依存関係インストール

```bash
# 開発用依存関係を削除
rm -rf node_modules

# 本番用のみインストール
npm install --production

# 確認
ls node_modules/
```

### zip ファイル作成

```bash
# function.zip を作成
zip -r function.zip dist node_modules package.json

# サイズ確認
ls -lh function.zip
# → 数MB〜数十MBになるはず
```

### ✅ 完了チェック

```
[ ] npm run build が成功
[ ] dist/lambda.js が存在
[ ] function.zip が作成された
```

---

## ☁️ Step 6-4: Lambda 関数作成（15分）

### AWS Console で作成

```
[ ] 1. AWS Console → Lambda
[ ] 2. 「関数の作成」をクリック
[ ] 3. 「一から作成」を選択
[ ] 4. 関数名: github-activity-collector
[ ] 5. ランタイム: Node.js 20.x
[ ] 6. アーキテクチャ: x86_64
[ ] 7. アクセス許可 → 既存のロールを使用
[ ] 8. 既存のロール: lambda-github-activity-role
[ ] 9. 「関数の作成」をクリック
```

### AWS CLI で作成（代替方法）

```bash
# ARN を環境変数に設定（実際の値に置き換え）
export ROLE_ARN="arn:aws:iam::123456789012:role/lambda-github-activity-role"

# Lambda 関数作成
aws lambda create-function \
  --function-name github-activity-collector \
  --runtime nodejs20.x \
  --role $ROLE_ARN \
  --handler dist/lambda.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 512 \
  --region ap-northeast-1
```

### ✅ 完了チェック

```
[ ] Lambda 関数が作成された
[ ] 関数名: github-activity-collector
```

---

## ⬆️ Step 6-5: コードアップロード（10分）

### AWS Console でアップロード

```
[ ] 1. Lambda → 関数 → github-activity-collector
[ ] 2. 「コード」タブ
[ ] 3. 「アップロード元」→「.zip ファイル」
[ ] 4. function.zip を選択
[ ] 5. 「保存」をクリック
[ ] 6. アップロード完了を待つ（数秒〜数分）
```

### AWS CLI でアップロード（代替方法）

```bash
aws lambda update-function-code \
  --function-name github-activity-collector \
  --zip-file fileb://function.zip \
  --region ap-northeast-1
```

### ハンドラー設定確認

```
[ ] 「コード」タブ → 「ランタイム設定」→「編集」
[ ] ハンドラー: dist/lambda.handler
[ ] 「保存」をクリック
```

### ✅ 完了チェック

```
[ ] コードがアップロードされた
[ ] ハンドラーが dist/lambda.handler になっている
```

---

## 🔧 Step 6-6: 環境変数設定（15分）

### AWS Console で設定

```
[ ] 1. 「設定」タブ → 「環境変数」→「編集」
[ ] 2. 以下を1つずつ追加:
```

| キー | 値 |
|-----|-----|
| GITHUB_TOKEN | ghp_xxxxxxxxxxxxx |
| GITHUB_USERNAME | Gaku52 |
| SUPABASE_URL | https://xxxxx.supabase.co |
| SUPABASE_KEY | eyJxxxxxxxxxxxxx |
| CLAUDE_API_KEY | sk-ant-xxxxxxxxxxxxx |
| NOTION_API_KEY | ntn_xxxxxxxxxxxxx |
| NOTION_DATABASE_ID | xxxxxxxxxxxxx |

```
[ ] 3. 「保存」をクリック
```

### AWS CLI で設定（代替方法）

```bash
aws lambda update-function-configuration \
  --function-name github-activity-collector \
  --environment "Variables={
    GITHUB_TOKEN=ghp_xxxxxxxxxxxxx,
    GITHUB_USERNAME=Gaku52,
    SUPABASE_URL=https://xxxxx.supabase.co,
    SUPABASE_KEY=eyJxxxxxxxxxxxxx,
    CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx,
    NOTION_API_KEY=ntn_xxxxxxxxxxxxx,
    NOTION_DATABASE_ID=xxxxxxxxxxxxx
  }" \
  --region ap-northeast-1
```

### タイムアウト・メモリ設定

```
[ ] 「設定」タブ → 「一般設定」→「編集」
[ ] メモリ: 512 MB
[ ] タイムアウト: 1分 0秒
[ ] 「保存」をクリック
```

### ✅ 完了チェック

```
[ ] 7つの環境変数がすべて設定された
[ ] タイムアウトが60秒に設定された
[ ] メモリが512MBに設定された
```

---

## 🧪 Step 6-7: テスト実行（20分）

### テストイベント作成

```
[ ] 1. Lambda → github-activity-collector
[ ] 2. 「テスト」タブ
[ ] 3. 「テストイベントを作成」
[ ] 4. イベント名: weekly-trigger
[ ] 5. イベントJSON: {}（空のオブジェクト）
[ ] 6. 「保存」をクリック
```

### 実行

```
[ ] 7. 「テスト」ボタンをクリック
[ ] 8. 実行結果を確認（30秒〜1分程度かかる）
```

### 期待される結果

**実行結果タブ**:
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"commits\":15,\"notionUrl\":\"https://www.notion.so/xxxxx\",\"duration\":12345}"
}
```

**ログ出力タブ**:
```
=== Lambda 実行開始 ===
Event: {}
期間: 2025-11-09T... 〜 2025-11-16T...
📥 GitHub データ取得中...
  ✓ 50個のリポジトリを取得
  ✓ spark-vault: 5件
  ...
🤖 Claude で分析中...
  ✓ 分析完了（150 tokens）
💾 Supabase に保存中...
  ✓ 保存完了: 123e4567-...
📤 Notion に投稿中...
  ✓ 投稿完了: https://www.notion.so/xxxxx
=== 完了（12345ms）===
```

### Notion で確認

```
[ ] Notion を開く
[ ] 新しいページが作成されている
[ ] 内容が正しい
```

### CloudWatch Logs で確認（詳細ログ）

```
[ ] Lambda → モニタリング
[ ] 「CloudWatch のログを表示」をクリック
[ ] 最新のログストリームを開く
[ ] エラーがないか確認
```

---

## ❌ トラブルシューティング

### エラー: `Task timed out after 3.00 seconds`

```
原因: タイムアウトが短すぎる
対処: 設定 → 一般設定 → タイムアウトを60秒に変更
```

### エラー: `Runtime.ImportModuleError`

```
原因: node_modules が正しく含まれていない
対処:
1. zip ファイル再作成
2. npm install --production 確認
3. 再アップロード
```

### エラー: `Cannot find module '@supabase/supabase-js'`

```
原因: 依存関係がインストールされていない
対処:
1. ローカルで npm install --production
2. zip 再作成
3. 再アップロード
```

### エラー: `GITHUB_TOKEN is not defined`

```
原因: 環境変数が設定されていない
対処: 設定 → 環境変数 を再確認
```

### エラー: `Invalid API key (Claude/Notion)`

```
原因: API キーが間違っている
対処: .env の値と環境変数を比較
```

---

## ✅ 3日目完了チェックリスト

```
[ ] IAM Role 作成完了
[ ] Lambda 関数作成完了
[ ] デプロイパッケージ作成完了
[ ] コードアップロード完了
[ ] 環境変数設定完了
[ ] タイムアウト・メモリ設定完了
[ ] テスト実行成功
[ ] Notion にページが作成された
```

**すべてチェックがついたら3日目完了！**

---

## 🎉 ここまでの達成事項

- ✅ Lambda で手動実行できる
- ✅ GitHub → Claude → Supabase → Notion がクラウドで動く
- ✅ サーバーレスで週次レポート生成可能

---

## 📅 次回（4日目）の予告

**4日目の作業内容**:
- EventBridge Scheduler 作成
- Lambda トリガー設定
- Cron式設定（毎週日曜22:00 JST）
- 次回実行日時の確認
- **完成！**

**所要時間**: 30分〜1時間（21:00-22:00）

詳細は `IMPLEMENTATION_DAY4.md` を参照してください（次に作成します）。

---

**3日目お疲れ様でした！あと1日で完成です！**
