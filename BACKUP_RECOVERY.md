# GitHub Activity Aggregator - バックアップ・リカバリ計画

**作成日**: 2025-11-20
**バージョン**: 1.0.0

---

## 目次

1. [バックアップ概要](#バックアップ概要)
2. [Supabaseバックアップ](#supabaseバックアップ)
3. [コードバックアップ](#コードバックアップ)
4. [シークレットバックアップ](#シークレットバックアップ)
5. [リカバリ手順](#リカバリ手順)
6. [データアーカイブ](#データアーカイブ)
7. [災害復旧計画](#災害復旧計画)

---

## バックアップ概要

### バックアップ対象

| 対象 | 重要度 | バックアップ方法 | 頻度 |
|-----|-------|----------------|------|
| Supabase Database | 高 | 自動バックアップ + 手動エクスポート | 日次/週次 |
| Supabase Storage | 中 | 手動エクスポート | 月次 |
| Lambda コード | 高 | GitHub + S3 | コミット時 |
| 環境変数/シークレット | 高 | AWS Secrets Manager | 変更時 |
| CloudFormation/SAM | 高 | GitHub | コミット時 |

### RPO/RTO目標

| 指標 | 目標値 | 説明 |
|-----|-------|------|
| RPO (Recovery Point Objective) | 24時間 | データ損失許容時間 |
| RTO (Recovery Time Objective) | 4時間 | 復旧目標時間 |

---

## Supabaseバックアップ

### 自動バックアップ（Pro プラン）

Supabase Pro プランでは自動バックアップが有効:

- **頻度**: 日次
- **保持期間**: 7日間
- **Point-in-Time Recovery**: 対応

#### バックアップ確認

```
Supabase Dashboard > Settings > Database > Backups
```

### 手動バックアップスクリプト

#### データベースエクスポート

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

# 設定
BACKUP_DIR="$HOME/supabase-backups"
DATE=$(date +%Y-%m-%d)
SUPABASE_PROJECT_ID="your-project-id"
SUPABASE_DB_PASSWORD="your-db-password"

# バックアップディレクトリ作成
mkdir -p "$BACKUP_DIR"

# pg_dumpでエクスポート
PGPASSWORD=$SUPABASE_DB_PASSWORD pg_dump \
  -h db.$SUPABASE_PROJECT_ID.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -F c \
  -f "$BACKUP_DIR/backup-$DATE.dump"

# 圧縮
gzip "$BACKUP_DIR/backup-$DATE.dump"

# 古いバックアップを削除（30日以上）
find "$BACKUP_DIR" -name "backup-*.dump.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/backup-$DATE.dump.gz"
```

#### テーブル別エクスポート（CSV）

```typescript
// scripts/export-tables.ts
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const tables = [
  'repositories',
  'commits',
  'weekly_activities',
  'weekly_reports',
  'generated_reports',
  'platform_stats'
]

async function exportTables() {
  const date = new Date().toISOString().split('T')[0]
  const backupDir = path.join(process.env.HOME!, 'supabase-backups', date)

  fs.mkdirSync(backupDir, { recursive: true })

  for (const table of tables) {
    console.log(`Exporting ${table}...`)

    const { data, error } = await supabase
      .from(table)
      .select('*')

    if (error) {
      console.error(`Error exporting ${table}:`, error)
      continue
    }

    const filePath = path.join(backupDir, `${table}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

    console.log(`Exported ${data.length} rows to ${filePath}`)
  }

  console.log(`Backup completed: ${backupDir}`)
}

exportTables()
```

実行:
```bash
npx tsx scripts/export-tables.ts
```

### Storageバックアップ

```typescript
// scripts/backup-storage.ts
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function backupStorage() {
  const date = new Date().toISOString().split('T')[0]
  const backupDir = path.join(process.env.HOME!, 'supabase-backups', date, 'storage')

  fs.mkdirSync(backupDir, { recursive: true })

  // reportsバケットのファイル一覧取得
  const { data: files, error } = await supabase.storage
    .from('reports')
    .list('', { limit: 1000 })

  if (error) {
    console.error('Error listing files:', error)
    return
  }

  for (const file of files) {
    if (file.name) {
      const { data, error: downloadError } = await supabase.storage
        .from('reports')
        .download(file.name)

      if (downloadError) {
        console.error(`Error downloading ${file.name}:`, downloadError)
        continue
      }

      const filePath = path.join(backupDir, file.name)
      const buffer = Buffer.from(await data.arrayBuffer())
      fs.writeFileSync(filePath, buffer)

      console.log(`Downloaded: ${file.name}`)
    }
  }

  console.log(`Storage backup completed: ${backupDir}`)
}

backupStorage()
```

### S3へのバックアップ転送

```bash
#!/bin/bash
# scripts/upload-backup-to-s3.sh

BACKUP_DIR="$HOME/supabase-backups"
S3_BUCKET="s3://github-activity-backups"
DATE=$(date +%Y-%m-%d)

# S3にアップロード
aws s3 sync "$BACKUP_DIR/$DATE" "$S3_BUCKET/$DATE/" \
  --storage-class STANDARD_IA

# 90日以上古いバックアップをGlacierに移動（ライフサイクルで自動化推奨）
echo "Backup uploaded to $S3_BUCKET/$DATE/"
```

---

## コードバックアップ

### GitHubリポジトリ

プライマリのコードバックアップはGitHubで管理。

```bash
# ローカルクローン
git clone git@github.com:Gaku52/github-activity-aggregator.git

# ミラークローン（完全バックアップ）
git clone --mirror git@github.com:Gaku52/github-activity-aggregator.git

# S3にアップロード
tar -czf github-activity-aggregator.tar.gz github-activity-aggregator.git
aws s3 cp github-activity-aggregator.tar.gz s3://github-activity-backups/code/
```

### Lambda デプロイパッケージ

デプロイ済みのLambdaコードをバックアップ。

```bash
#!/bin/bash
# scripts/backup-lambda.sh

BACKUP_DIR="$HOME/lambda-backups"
DATE=$(date +%Y-%m-%d)
FUNCTIONS=("github-activity-collector" "github-activity-generator" "github-activity-publisher")

mkdir -p "$BACKUP_DIR/$DATE"

for FUNC in "${FUNCTIONS[@]}"; do
  echo "Backing up $FUNC..."

  # 現在のバージョンを取得
  aws lambda get-function \
    --function-name $FUNC \
    --query 'Code.Location' \
    --output text | xargs curl -o "$BACKUP_DIR/$DATE/$FUNC.zip"

  # 設定をエクスポート
  aws lambda get-function-configuration \
    --function-name $FUNC \
    > "$BACKUP_DIR/$DATE/$FUNC-config.json"

  echo "Backed up: $BACKUP_DIR/$DATE/$FUNC.zip"
done
```

---

## シークレットバックアップ

### AWS Secrets Manager エクスポート

```bash
#!/bin/bash
# scripts/backup-secrets.sh
# ⚠️ セキュリティ注意: このファイルは暗号化して保管

BACKUP_DIR="$HOME/secrets-backup"
DATE=$(date +%Y-%m-%d)
SECRETS=("github-token" "supabase" "claude" "notion")

mkdir -p "$BACKUP_DIR"

for SECRET in "${SECRETS[@]}"; do
  aws secretsmanager get-secret-value \
    --secret-id "github-activity-aggregator/$SECRET" \
    --query 'SecretString' \
    --output text \
    > "$BACKUP_DIR/$SECRET-$DATE.json"
done

# 暗号化
tar -czf "$BACKUP_DIR/secrets-$DATE.tar.gz" -C "$BACKUP_DIR" .
gpg --symmetric --cipher-algo AES256 "$BACKUP_DIR/secrets-$DATE.tar.gz"

# 元ファイル削除
rm "$BACKUP_DIR"/*.json "$BACKUP_DIR/secrets-$DATE.tar.gz"

echo "Secrets backed up and encrypted: $BACKUP_DIR/secrets-$DATE.tar.gz.gpg"
```

### 復号化

```bash
gpg --decrypt secrets-2025-11-17.tar.gz.gpg > secrets.tar.gz
tar -xzf secrets.tar.gz
```

---

## リカバリ手順

### シナリオ1: Supabaseデータ破損

#### 手順

1. **被害範囲の特定**
   ```sql
   -- 最新のデータを確認
   SELECT table_name, MAX(created_at)
   FROM information_schema.tables
   WHERE table_schema = 'public'
   GROUP BY table_name;
   ```

2. **Point-in-Time Recoveryを使用**
   - Supabase Dashboard > Settings > Database > Backups
   - 「Restore to a point in time」を選択
   - 破損前の時点を指定

3. **または手動リストア**
   ```bash
   # バックアップから復元
   PGPASSWORD=$SUPABASE_DB_PASSWORD pg_restore \
     -h db.$SUPABASE_PROJECT_ID.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -c \
     backup-2025-11-16.dump
   ```

4. **データ整合性確認**
   ```sql
   SELECT COUNT(*) FROM repositories;
   SELECT COUNT(*) FROM commits;
   SELECT MAX(created_at) FROM weekly_reports;
   ```

### シナリオ2: Lambda関数破損

#### 手順

1. **現在の状態を確認**
   ```bash
   aws lambda get-function --function-name github-activity-collector
   ```

2. **バックアップから復元**
   ```bash
   # コードを復元
   aws lambda update-function-code \
     --function-name github-activity-collector \
     --zip-file fileb://lambda-backups/2025-11-16/github-activity-collector.zip

   # 設定を復元
   aws lambda update-function-configuration \
     --function-name github-activity-collector \
     --cli-input-json file://lambda-backups/2025-11-16/github-activity-collector-config.json
   ```

3. **テスト実行**
   ```bash
   aws lambda invoke \
     --function-name github-activity-collector \
     --payload '{"test": true}' \
     response.json
   ```

### シナリオ3: シークレット漏洩

#### 手順

1. **即座に全キーを無効化**
   - GitHub: Settings > Developer settings > Personal access tokens
   - Supabase: Dashboard > Settings > API > Regenerate
   - Claude: Console > API Keys > Delete
   - Notion: Settings > Integrations > Regenerate

2. **新しいキーを生成**

3. **Secrets Manager を更新**
   ```bash
   aws secretsmanager update-secret \
     --secret-id github-activity-aggregator/github-token \
     --secret-string '{"token":"ghp_NEW_TOKEN"}'
   ```

4. **Lambda関数をテスト**

5. **アクセスログを調査**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/github-activity-collector \
     --start-time $(date -d '24 hours ago' +%s000) \
     --filter-pattern "ERROR"
   ```

### シナリオ4: 完全復旧（災害復旧）

#### 手順

1. **新しいAWSアカウント/リージョンの準備**

2. **インフラ再構築**
   ```bash
   cd github-activity-aggregator
   sam build
   sam deploy --guided
   ```

3. **シークレット復元**
   ```bash
   # 暗号化バックアップから復元
   gpg --decrypt secrets-backup.tar.gz.gpg > secrets.tar.gz
   tar -xzf secrets.tar.gz

   # Secrets Managerに登録
   for file in *.json; do
     secret_name=$(basename $file .json)
     aws secretsmanager create-secret \
       --name "github-activity-aggregator/$secret_name" \
       --secret-string "$(cat $file)"
   done
   ```

4. **Supabaseデータベース復元**
   ```bash
   pg_restore -h db.xxx.supabase.co -U postgres -d postgres backup.dump
   ```

5. **動作確認**
   ```bash
   aws lambda invoke \
     --function-name github-activity-collector \
     --payload '{}' \
     response.json
   ```

---

## データアーカイブ

### アーカイブポリシー

| データ種別 | アクティブ保持 | アーカイブ保持 | 削除 |
|-----------|--------------|--------------|------|
| commits | 1年 | 5年 | 5年後 |
| weekly_activities | 2年 | 5年 | 5年後 |
| generated_reports | 3年 | 永久 | - |
| platform_stats | 5年 | 永久 | - |

### アーカイブスクリプト

```typescript
// scripts/archive-old-data.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function archiveOldData() {
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const cutoffDate = oneYearAgo.toISOString()

  console.log(`Archiving data older than ${cutoffDate}`)

  // 1. 古いコミットをエクスポート
  const { data: oldCommits, error: fetchError } = await supabase
    .from('commits')
    .select('*')
    .lt('committed_at', cutoffDate)

  if (fetchError) {
    console.error('Error fetching old commits:', fetchError)
    return
  }

  console.log(`Found ${oldCommits.length} commits to archive`)

  if (oldCommits.length === 0) {
    console.log('No data to archive')
    return
  }

  // 2. Storageにアーカイブ保存
  const archiveData = JSON.stringify(oldCommits, null, 2)
  const archiveFileName = `archives/commits-before-${cutoffDate.split('T')[0]}.json`

  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(archiveFileName, archiveData, {
      contentType: 'application/json',
      upsert: true
    })

  if (uploadError) {
    console.error('Error uploading archive:', uploadError)
    return
  }

  console.log(`Archived to: ${archiveFileName}`)

  // 3. 古いデータを削除（確認後に有効化）
  // const { error: deleteError } = await supabase
  //   .from('commits')
  //   .delete()
  //   .lt('committed_at', cutoffDate)

  // if (deleteError) {
  //   console.error('Error deleting old data:', deleteError)
  //   return
  // }

  console.log('Archive completed successfully')
}

archiveOldData()
```

### S3 Glacierへの移行

```yaml
# cloudformation/s3-lifecycle.yaml
Resources:
  BackupBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: github-activity-backups
      LifecycleConfiguration:
        Rules:
          - Id: ArchiveToGlacier
            Status: Enabled
            Prefix: archives/
            Transitions:
              - StorageClass: GLACIER
                TransitionInDays: 90
            ExpirationInDays: 1825  # 5年

          - Id: DeleteOldBackups
            Status: Enabled
            Prefix: daily/
            ExpirationInDays: 30
```

---

## 災害復旧計画

### DRシナリオ

| シナリオ | 影響 | RTO | RPO |
|---------|------|-----|-----|
| Lambda障害 | サービス停止 | 1時間 | 0 |
| Supabase障害 | データアクセス不可 | 2時間 | 24時間 |
| AWSリージョン障害 | 全サービス停止 | 4時間 | 24時間 |
| セキュリティインシデント | サービス停止 | 2時間 | 0 |

### 復旧優先順位

1. **セキュリティ**: キー漏洩の場合は即座に全キー無効化
2. **データ保護**: データ損失を最小化
3. **サービス復旧**: 週次実行の復旧
4. **通知**: 関係者への状況報告

### 連絡先リスト

| 役割 | 連絡先 | 担当範囲 |
|-----|-------|---------|
| AWS サポート | AWS Console | インフラ障害 |
| Supabase サポート | support@supabase.io | DB障害 |
| GitHub サポート | support.github.com | API障害 |

### DR訓練

**四半期ごとに以下を実施**:

1. バックアップからのリストアテスト
2. シークレットローテーション訓練
3. 障害対応フロー確認
4. 連絡網テスト

### チェックリスト

```markdown
## 災害復旧チェックリスト

### 初動対応（15分以内）
- [ ] 障害内容の特定
- [ ] 影響範囲の確認
- [ ] 関係者への一次報告

### 復旧作業（4時間以内）
- [ ] バックアップの確認
- [ ] リストア手順の選択
- [ ] リストア実行
- [ ] 動作確認

### 事後対応
- [ ] 根本原因分析
- [ ] 再発防止策の策定
- [ ] ドキュメント更新
- [ ] 振り返りミーティング
```

---

## バックアップスケジュール

### 自動化設定

```yaml
# .github/workflows/backup.yml
name: Scheduled Backup

on:
  schedule:
    # 毎週日曜 00:00 UTC (日曜 09:00 JST)
    - cron: '0 0 * * 0'
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Export database
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npx tsx scripts/export-tables.ts

      - name: Upload to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ap-northeast-1
        run: |
          DATE=$(date +%Y-%m-%d)
          aws s3 sync ~/supabase-backups/$DATE s3://github-activity-backups/$DATE/
```

### カレンダー

| 頻度 | 対象 | 実行日時 |
|-----|------|---------|
| 日次 | Supabase自動バックアップ | 自動 |
| 週次 | データベースエクスポート | 日曜 09:00 JST |
| 月次 | Storageバックアップ | 1日 09:00 JST |
| 四半期 | DR訓練 | 1,4,7,10月の第1週 |

---

**最終確認日**: 2025-11-20
**次回レビュー**: 2026-02-20
