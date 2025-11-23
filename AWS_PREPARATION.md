# AWS デプロイ事前準備チェックリスト

Phase 5 (AWS デプロイ) をスムーズに進めるための事前準備項目

---

## ✅ 今すぐできる準備（Phase 3-4 の間に）

### 1. AWS アカウント確認

- [ ] AWS アカウントにログイン可能か確認
- [ ] MFA（多要素認証）が設定されているか確認
- [ ] 請求アラートが設定されているか確認

**URL**: https://console.aws.amazon.com/

---

### 2. IAM ユーザー/権限確認

デプロイに必要な権限：
- [ ] Lambda 作成権限
- [ ] EventBridge 作成権限
- [ ] CloudWatch Logs 作成権限
- [ ] IAM Role 作成権限

**確認方法**:
1. AWS Console → IAM → Users
2. 自分のユーザーをクリック
3. "Permissions" タブで上記権限があるか確認

**推奨**: `AdministratorAccess` または `PowerUserAccess` ポリシーがアタッチされていればOK

---

### 3. AWS CLI インストール（オプション）

手動デプロイなら不要ですが、あると便利：

```bash
# インストール確認
aws --version

# 未インストールの場合
brew install awscli  # macOS

# 認証設定
aws configure
```

---

### 4. Lambda デプロイパッケージの準備

各 Lambda のビルド確認：

```bash
# Collector
cd lambda/collector
npm run build
ls dist/  # index.js が生成されているか確認

# Generator (Phase 3 完了後)
cd lambda/generator
npm run build
ls dist/

# Publisher (Phase 4 完了後)
cd lambda/publisher
npm run build
ls dist/
```

---

### 5. 環境変数の整理

`.env` から AWS Lambda 用の環境変数リストを作成：

**必要な環境変数**:
```bash
# GitHub
GITHUB_TOKEN=ghp_xxxxx
GITHUB_USERNAME=Gaku52

# Supabase
SUPABASE_URL=https://oxpcyexxuryxaitboiaa.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...

# Notion (Phase 4 完了後)
NOTION_ENABLED=true
NOTION_API_KEY=ntn_xxxxx
NOTION_DATABASE_ID=xxxxx

# Slack (Phase 4 完了後)
SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx
```

**チェック**:
- [ ] 全ての値が `.env` に存在するか確認
- [ ] トークンが有効期限切れでないか確認（GitHub Token等）

---

### 6. Lambda 関数の設定値を決める

| 設定項目 | Collector | Generator | Publisher |
|---------|-----------|-----------|-----------|
| **Runtime** | Node.js 20.x | Node.js 20.x | Node.js 20.x |
| **Memory** | 512 MB | 256 MB | 256 MB |
| **Timeout** | 5 分 (300秒) | 2 分 (120秒) | 2 分 (120秒) |
| **Handler** | index.handler | index.handler | index.handler |

---

### 7. EventBridge スケジュール設定

**Collector Lambda スケジュール**:
- **頻度**: 毎週日曜日 22:00 (JST)
- **Cron式**: `cron(0 13 ? * SUN *)`  ※ UTC時間（JST-9h）
- **タイムゾーン**: UTC

**確認事項**:
- [ ] スケジュールの時間帯は問題ないか？
- [ ] 週次実行で良いか？（日次に変更する可能性は？）

---

## 📋 Phase 5 実行時のチェックリスト

### Step 1: Lambda 関数作成（3つ）

**Collector Lambda**:
1. AWS Console → Lambda → Create function
2. Function name: `github-activity-collector`
3. Runtime: Node.js 20.x
4. Architecture: x86_64
5. Execution role: Create new role
6. Advanced settings → Enable VPC: No

**同様に**:
- `github-activity-generator`
- `github-activity-publisher`

---

### Step 2: コードアップロード

**方法1: コンソールから直接（推奨）**:
```bash
# 各Lambdaディレクトリで
cd lambda/collector
zip -r function.zip dist/ node_modules/
# AWS Console → Lambda → Upload from → .zip file
```

**方法2: AWS CLI**:
```bash
aws lambda update-function-code \
  --function-name github-activity-collector \
  --zip-file fileb://function.zip
```

---

### Step 3: 環境変数設定

各Lambda関数で Configuration → Environment variables から設定

**Collector & Generator**:
- `GITHUB_TOKEN`
- `GITHUB_USERNAME`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

**Publisher (追加)**:
- `NOTION_ENABLED`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `SLACK_ENABLED`
- `SLACK_WEBHOOK_URL`

---

### Step 4: EventBridge スケジュール作成

1. EventBridge → Rules → Create rule
2. Name: `github-collector-weekly`
3. Rule type: Schedule
4. Schedule pattern: Cron expression
   ```
   cron(0 13 ? * SUN *)
   ```
5. Target: Lambda function
6. Select: `github-activity-collector`

---

### Step 5: テスト実行

各Lambda関数で Test タブから手動実行：

**Collector**:
```json
{}
```

**Generator**:
```json
{
  "week_offset": 0
}
```

**Publisher**:
```json
{}
```

---

### Step 6: CloudWatch Logs 確認

1. CloudWatch → Logs → Log groups
2. `/aws/lambda/github-activity-collector` を開く
3. 最新のログストリームを確認
4. エラーがないか確認

---

## 🔧 トラブルシューティング

### よくあるエラー

**1. "Cannot find module" エラー**
→ `node_modules` を zip に含めたか確認

**2. "Task timed out" エラー**
→ Timeout 設定を延長（Configuration → General → Timeout）

**3. "Permission denied" エラー**
→ IAM Role に必要な権限があるか確認

**4. "Environment variable not set" エラー**
→ 環境変数が正しく設定されているか確認

---

## 💰 コスト見積もり

### 無料枠内での運用

**Lambda**:
- 月間実行回数: 約4回（週次）× 3関数 = 12回
- 実行時間: 各5分 = 60分/月
- **無料枠**: 100万リクエスト/月、40万GB秒/月
- **実際のコスト**: $0

**EventBridge**:
- ルール数: 1個
- **無料枠**: 無制限
- **実際のコスト**: $0

**合計**: **$0/月**

---

## 📝 次のステップ

- [ ] このチェックリストを印刷/ブックマーク
- [ ] Phase 3, 4 の実装を完了
- [ ] デプロイ前日に AWS Console にログインして動作確認
- [ ] Phase 5 実行時はこのドキュメントに従って進める

---

**作成日**: 2025-11-23
**対象**: Phase 5 デプロイ準備
