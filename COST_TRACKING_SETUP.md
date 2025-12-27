# Claude API コスト追跡・メール通知機能

github-activity-aggregatorに、Claude APIの使用コストを追跡し、メール通知する機能が追加されました。

## 機能概要

1. **コスト追跡**: すべてのClaude API呼び出しをSupabaseデータベースに記録
2. **残高管理**: クレジット残高から自動的に使用料を差し引き
3. **メール通知**: 日次/週次/月次のコストレポートをメール送信
4. **閾値アラート**: コストが設定した閾値を超えた場合にアラートメール送信

## セットアップ

### 1. Supabaseマイグレーションの実行

新しく追加されたテーブルを作成するため、マイグレーションを実行してください:

```bash
# Supabase CLIでマイグレーション実行
cd supabase
supabase db push
```

または、Supabase Dashboardから手動で実行:
1. https://supabase.com/dashboard/project/YOUR_PROJECT/editor にアクセス
2. `supabase/migrations/20251227000000_add_cost_tracking.sql` の内容をコピー
3. SQL Editorに貼り付けて実行

### 2. 環境変数の設定

`.env`ファイルに以下を追加してください（`.env.example`を参照）:

```bash
# Email Notification (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password      # Gmailアプリパスワード
SMTP_FROM=your-email@gmail.com
NOTIFY_EMAIL=notification-recipient@example.com

# Cost Thresholds (USD)
COST_THRESHOLD_DAILY=1.00
COST_THRESHOLD_WEEKLY=5.00
COST_THRESHOLD_MONTHLY=20.00

# Credit Balance Management
CREDIT_BALANCE=4.84                 # Anthropic Consoleで確認した現在の残高
CREDIT_ALERT_THRESHOLD=1.00         # この残高以下になったら警告
```

### 3. Gmailアプリパスワードの取得

1. https://myaccount.google.com/security にアクセス
2. "2段階認証プロセス" を有効化
3. "アプリ パスワード" を検索
4. "メール" と "その他のデバイス" を選択
5. 生成されたパスワードを `SMTP_PASS` に設定

## 使い方

### コストレポートの送信

```bash
# 日次レポートを送信
npm run cost:daily

# 週次レポートを送信
npm run cost:weekly

# 月次レポートを送信
npm run cost:monthly
```

### レポートの内容

メールレポートには以下の情報が含まれます:

- **期間**: レポート対象期間
- **モデル別使用状況**:
  - リクエスト数
  - 入力/出力トークン数
  - コスト（USD）
- **合計コスト**: 期間中の総コスト
- **閾値**: 設定した閾値
- **警告**: 閾値超過時のアラート
- **残りクレジット**: 現在のクレジット残高（日次レポートのみ）

### 自動コスト追跡

Claude APIを使用すると、自動的にコストが記録されます:

1. `src/claude/analyzer.ts` - コミット分析時
2. `lambda/generator/src/claude-ai-summary.ts` - 日次/週次サマリー生成時

これらの関数を呼び出すたびに:
- Supabaseの`claude_usage_history`テーブルにレコードが追加されます
- `credit_balance`テーブルの残高が自動的に更新されます

## データベーステーブル

### claude_usage_history

Claude APIの全使用履歴を記録:

```sql
- id: UUID
- request_id: Claude APIのリクエストID
- model_id: 使用したモデル (claude-3-5-haiku-20241022)
- input_tokens: 入力トークン数
- output_tokens: 出力トークン数
- input_cost: 入力コスト (USD)
- output_cost: 出力コスト (USD)
- total_cost: 合計コスト (USD)
- operation_type: 操作種別 (analyze_commits, daily_summary, etc.)
- metadata: その他のメタデータ (JSONB)
- timestamp: 使用日時
```

### credit_balance

クレジット残高管理:

```sql
- id: UUID
- balance: 現在の残高 (USD)
- initial_balance: 初期残高 (USD)
- last_recharge_at: 最後のチャージ日時
- updated_at: 更新日時
```

### cost_thresholds

コスト閾値設定:

```sql
- id: UUID
- period: 期間 (daily, weekly, monthly)
- threshold_amount: 閾値金額 (USD)
- notify_email: 通知先メールアドレス
- enabled: 有効/無効
```

## ビュー

便利なビューも作成されています:

- **daily_cost_summary**: 日別コストサマリー
- **monthly_cost_summary**: 月別コストサマリー
- **current_month_usage**: 今月の使用量

```sql
-- 今月の使用状況を確認
SELECT * FROM current_month_usage;

-- 日別のコストを確認
SELECT * FROM daily_cost_summary LIMIT 30;
```

## GitHub Actions (自動レポート送信)

GitHub Actionsで自動的にレポートを送信するには、以下の環境変数をSecretsに追加してください:

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
NOTIFY_EMAIL
CREDIT_BALANCE
```

そして、`.github/workflows/daily-cost-report.yml` を作成:

```yaml
name: Daily Cost Report

on:
  schedule:
    - cron: '0 0 * * *'  # 毎日午前9時 (JST)
  workflow_dispatch:

jobs:
  send-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run cost:daily
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SMTP_HOST: ${{ secrets.SMTP_HOST }}
          SMTP_PORT: ${{ secrets.SMTP_PORT }}
          SMTP_USER: ${{ secrets.SMTP_USER }}
          SMTP_PASS: ${{ secrets.SMTP_PASS }}
          SMTP_FROM: ${{ secrets.SMTP_FROM }}
          NOTIFY_EMAIL: ${{ secrets.NOTIFY_EMAIL }}
          CREDIT_BALANCE: ${{ secrets.CREDIT_BALANCE }}
```

## トラブルシューティング

### メールが送信されない

1. SMTPクレデンシャルが正しいか確認
2. Gmailの場合、アプリパスワードを使用しているか確認
3. 2段階認証が有効になっているか確認

### 残高が更新されない

1. `CREDIT_BALANCE`環境変数が設定されているか確認
2. Supabaseマイグレーションが実行されているか確認
3. `credit_balance`テーブルにレコードが存在するか確認:

```sql
SELECT * FROM credit_balance;
```

### コストが記録されない

1. Supabase接続情報が正しいか確認
2. `SUPABASE_SERVICE_KEY`を使用しているか確認（`SUPABASE_KEY`ではなく）
3. Row Level Security (RLS) ポリシーが正しく設定されているか確認

## 価格情報

Claude 3.5 Haiku (20241022) の料金:

- 入力: $0.80 / 1M tokens
- 出力: $4.00 / 1M tokens

例: 1,000トークンの入力と500トークンの出力の場合:
- 入力コスト: $0.0008
- 出力コスト: $0.0020
- 合計: $0.0028

## 注意事項

1. **残高の手動更新**: クレジットを追加購入した場合、`.env`の`CREDIT_BALANCE`を手動で更新してください
2. **月初のリセット**: 毎月1日に、`CREDIT_BALANCE`を新しい月の初期残高に更新してください
3. **セキュリティ**: `.env`ファイルは絶対にGitにコミットしないでください

## さらなる改善案

- [ ] クレジット残高の自動更新（Anthropic APIが対応した場合）
- [ ] Slack通知の追加
- [ ] コストグラフの生成（Chart.js等）
- [ ] 予算アラートの強化
- [ ] Lambda関数での自動レポート送信
