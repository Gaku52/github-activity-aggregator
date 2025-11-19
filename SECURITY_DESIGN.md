# GitHub Activity Aggregator - セキュリティ設計書

**作成日**: 2025-11-20
**バージョン**: 1.0.0

---

## 目次

1. [セキュリティ概要](#セキュリティ概要)
2. [認証情報管理](#認証情報管理)
3. [IAMロール設計](#iamロール設計)
4. [Supabase RLS設計](#supabase-rls設計)
5. [API キーローテーション](#apiキーローテーション)
6. [ネットワークセキュリティ](#ネットワークセキュリティ)
7. [監査ログ](#監査ログ)

---

## セキュリティ概要

### セキュリティ原則

1. **最小権限の原則**: 必要最小限の権限のみ付与
2. **多層防御**: 複数のセキュリティレイヤーで保護
3. **暗号化**: 保存時・転送時のデータ暗号化
4. **監査可能性**: すべてのアクセスをログ記録

### 脅威モデル

| 脅威 | リスク | 対策 |
|-----|-------|------|
| APIキー漏洩 | 高 | Secrets Manager、環境変数暗号化 |
| 不正アクセス | 中 | IAM最小権限、RLS |
| データ改ざん | 中 | 監査ログ、バージョン管理 |
| DoS攻撃 | 低 | Lambda同時実行制限 |

---

## 認証情報管理

### AWS Secrets Manager 設定

#### シークレット作成

```bash
# GitHub Token
aws secretsmanager create-secret \
  --name github-activity-aggregator/github-token \
  --description "GitHub Personal Access Token" \
  --secret-string '{"token":"ghp_xxxxxxxxxxxxx"}'

# Supabase認証情報
aws secretsmanager create-secret \
  --name github-activity-aggregator/supabase \
  --description "Supabase connection info" \
  --secret-string '{
    "url": "https://xxxxx.supabase.co",
    "anon_key": "eyJxxxxx",
    "service_role_key": "eyJxxxxx"
  }'

# Claude API Key
aws secretsmanager create-secret \
  --name github-activity-aggregator/claude \
  --description "Anthropic Claude API Key" \
  --secret-string '{"api_key":"sk-ant-xxxxxxxxxxxxx"}'

# Notion API Key
aws secretsmanager create-secret \
  --name github-activity-aggregator/notion \
  --description "Notion API credentials" \
  --secret-string '{
    "api_key": "ntn_xxxxxxxxxxxxx",
    "database_id": "xxxxxxxxxxxxx"
  }'
```

#### Lambda からの取得コード

```typescript
// src/utils/secrets.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({ region: 'ap-northeast-1' })

interface SecretCache {
  value: string
  expiry: number
}

const cache: Map<string, SecretCache> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5分

export async function getSecret(secretName: string): Promise<Record<string, string>> {
  const cached = cache.get(secretName)
  if (cached && cached.expiry > Date.now()) {
    return JSON.parse(cached.value)
  }

  const command = new GetSecretValueCommand({
    SecretId: `github-activity-aggregator/${secretName}`,
  })

  const response = await client.send(command)
  const secretValue = response.SecretString!

  cache.set(secretName, {
    value: secretValue,
    expiry: Date.now() + CACHE_TTL,
  })

  return JSON.parse(secretValue)
}

// 使用例
export async function getGitHubToken(): Promise<string> {
  const secret = await getSecret('github-token')
  return secret.token
}

export async function getSupabaseConfig(): Promise<{
  url: string
  anonKey: string
  serviceRoleKey: string
}> {
  const secret = await getSecret('supabase')
  return {
    url: secret.url,
    anonKey: secret.anon_key,
    serviceRoleKey: secret.service_role_key,
  }
}
```

### 環境変数の暗号化

Lambda の環境変数は AWS KMS で自動暗号化されます。

```yaml
# template.yaml (SAM)
Resources:
  CollectorFunction:
    Type: AWS::Serverless::Function
    Properties:
      # カスタムKMSキーを使用する場合
      KmsKeyArn: !GetAtt LambdaKmsKey.Arn
      Environment:
        Variables:
          # 非機密情報のみ環境変数に
          LOG_LEVEL: info
          TIMEZONE: Asia/Tokyo
          # 機密情報はSecrets Managerから取得

  LambdaKmsKey:
    Type: AWS::KMS::Key
    Properties:
      Description: KMS key for Lambda environment variables
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
```

---

## IAMロール設計

### Lambda 実行ロール

```yaml
# cloudformation/iam-roles.yaml
AWSTemplateFormatVersion: '2010-09-09'

Resources:
  # Collector Lambda用ロール
  CollectorLambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: github-activity-collector-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: SecretsManagerAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                Resource:
                  - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:github-activity-aggregator/*'
        - PolicyName: KMSDecrypt
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - kms:Decrypt
                Resource:
                  - !Sub 'arn:aws:kms:${AWS::Region}:${AWS::AccountId}:key/*'
                Condition:
                  StringEquals:
                    kms:ViaService: !Sub 'secretsmanager.${AWS::Region}.amazonaws.com'

  # Generator Lambda用ロール
  GeneratorLambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: github-activity-generator-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: SecretsManagerAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                Resource:
                  - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:github-activity-aggregator/supabase*'
                  - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:github-activity-aggregator/claude*'

  # Publisher Lambda用ロール
  PublisherLambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: github-activity-publisher-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: SecretsManagerAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                Resource:
                  - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:github-activity-aggregator/supabase*'
                  - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:github-activity-aggregator/notion*'
        - PolicyName: SESAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - ses:SendEmail
                  - ses:SendRawEmail
                Resource: '*'
                Condition:
                  StringEquals:
                    ses:FromAddress: 'noreply@yourdomain.com'

  # EventBridge Scheduler用ロール
  SchedulerRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: github-activity-scheduler-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: scheduler.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: InvokeLambda
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - lambda:InvokeFunction
                Resource:
                  - !Sub 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:github-activity-collector'

Outputs:
  CollectorRoleArn:
    Value: !GetAtt CollectorLambdaRole.Arn
    Export:
      Name: CollectorLambdaRoleArn
  GeneratorRoleArn:
    Value: !GetAtt GeneratorLambdaRole.Arn
    Export:
      Name: GeneratorLambdaRoleArn
  PublisherRoleArn:
    Value: !GetAtt PublisherLambdaRole.Arn
    Export:
      Name: PublisherLambdaRoleArn
```

### 権限マトリックス

| Lambda関数 | Secrets Manager | KMS | SES | Lambda Invoke |
|-----------|----------------|-----|-----|--------------|
| Collector | github-token, supabase | ✓ | - | - |
| Generator | supabase, claude | ✓ | - | - |
| Publisher | supabase, notion | ✓ | ✓ | - |
| Scheduler | - | - | - | collector |

---

## Supabase RLS設計

### 本番環境向けRLSポリシー

サービスキーを使用する場合でも、追加の保護としてRLSを有効にします。

```sql
-- RLS有効化
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- サービスロール用ポリシー（すべての操作を許可）
CREATE POLICY "Service role full access on repositories"
  ON repositories FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on commits"
  ON commits FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on weekly_activities"
  ON weekly_activities FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on weekly_reports"
  ON weekly_reports FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on generated_reports"
  ON generated_reports FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on platform_stats"
  ON platform_stats FOR ALL
  USING (auth.role() = 'service_role');

-- 匿名アクセス拒否（anonキーでのアクセスをブロック）
-- ポリシーがないため、anon roleはアクセス不可
```

### 将来のマルチユーザー対応

```sql
-- ユーザーテーブル追加
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  github_username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- repositoriesにowner追加
ALTER TABLE repositories ADD COLUMN owner_id UUID REFERENCES users(id);

-- ユーザー別アクセス制御
CREATE POLICY "Users can view own repositories"
  ON repositories FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own repositories"
  ON repositories FOR INSERT
  WITH CHECK (owner_id = auth.uid());
```

---

## APIキーローテーション

### ローテーション手順

#### GitHub Token

```bash
# 1. 新しいトークンを生成（GitHub Settings）

# 2. Secrets Managerを更新
aws secretsmanager update-secret \
  --secret-id github-activity-aggregator/github-token \
  --secret-string '{"token":"ghp_NEW_TOKEN"}'

# 3. Lambda関数をテスト実行
aws lambda invoke \
  --function-name github-activity-collector \
  --payload '{"test": true}' \
  response.json

# 4. 成功確認後、古いトークンを無効化（GitHub Settings）
```

#### Supabase Service Role Key

```bash
# 1. Supabase Dashboardで新しいキーを生成
#    Settings > API > Generate new key

# 2. Secrets Managerを更新
aws secretsmanager update-secret \
  --secret-id github-activity-aggregator/supabase \
  --secret-string '{
    "url": "https://xxxxx.supabase.co",
    "anon_key": "eyJxxxxx",
    "service_role_key": "eyJ_NEW_KEY"
  }'

# 3. 全Lambda関数をテスト

# 4. 古いキーを無効化
```

#### Claude API Key

```bash
# 1. Anthropic Consoleで新しいキーを生成

# 2. Secrets Managerを更新
aws secretsmanager update-secret \
  --secret-id github-activity-aggregator/claude \
  --secret-string '{"api_key":"sk-ant-NEW_KEY"}'

# 3. Generator Lambdaをテスト

# 4. 古いキーを削除（Anthropic Console）
```

### 自動ローテーション設定

```yaml
# cloudformation/secrets-rotation.yaml
Resources:
  GitHubTokenRotationSchedule:
    Type: AWS::SecretsManager::RotationSchedule
    Properties:
      SecretId: !Ref GitHubTokenSecret
      RotationRules:
        AutomaticallyAfterDays: 90
      # カスタムローテーション関数が必要
      # RotationLambdaARN: !GetAtt RotationFunction.Arn
```

### ローテーションチェックリスト

```markdown
## 月次セキュリティレビュー

- [ ] 各APIキーの最終ローテーション日を確認
- [ ] 90日以上経過したキーをローテーション
- [ ] 不要なアクセス権限がないか確認
- [ ] CloudWatch Logsで異常なアクセスパターンを確認
- [ ] Secrets Managerのアクセスログを確認
```

---

## ネットワークセキュリティ

### Lambda VPC設定（オプション）

高いセキュリティが必要な場合、LambdaをVPC内に配置します。

```yaml
# template.yaml
Resources:
  CollectorFunction:
    Type: AWS::Serverless::Function
    Properties:
      VpcConfig:
        SecurityGroupIds:
          - !Ref LambdaSecurityGroup
        SubnetIds:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2

  LambdaSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Lambda functions
      VpcId: !Ref VPC
      SecurityGroupEgress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: HTTPS outbound for API calls
```

### 外部通信先

| サービス | エンドポイント | ポート |
|---------|--------------|-------|
| GitHub API | api.github.com | 443 |
| Supabase | *.supabase.co | 443 |
| Claude API | api.anthropic.com | 443 |
| Notion API | api.notion.com | 443 |
| Slack Webhook | hooks.slack.com | 443 |

---

## 監査ログ

### CloudWatch Logs設定

```typescript
// src/utils/logger.ts
interface AuditLog {
  timestamp: string
  action: string
  resource: string
  details: Record<string, any>
  result: 'success' | 'failure'
  error?: string
}

export function logAudit(log: Omit<AuditLog, 'timestamp'>): void {
  const auditLog: AuditLog = {
    timestamp: new Date().toISOString(),
    ...log,
  }

  // 構造化ログとして出力
  console.log(JSON.stringify({
    level: 'AUDIT',
    ...auditLog,
  }))
}

// 使用例
logAudit({
  action: 'FETCH_REPOSITORIES',
  resource: 'github-api',
  details: { count: 25 },
  result: 'success',
})

logAudit({
  action: 'SAVE_TO_DATABASE',
  resource: 'supabase',
  details: { table: 'commits', count: 150 },
  result: 'failure',
  error: 'Connection timeout',
})
```

### CloudWatch Logs Insights クエリ

```sql
-- 過去24時間の失敗した操作
fields @timestamp, action, resource, error
| filter level = 'AUDIT' and result = 'failure'
| sort @timestamp desc
| limit 100

-- リソース別アクセス数
fields resource
| filter level = 'AUDIT'
| stats count(*) by resource
| sort count desc

-- 時間帯別アクティビティ
fields @timestamp
| filter level = 'AUDIT'
| stats count(*) as count by bin(1h)
| sort @timestamp
```

### アラート設定

```yaml
# cloudformation/monitoring.yaml
Resources:
  AuditFailureAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: github-activity-audit-failures
      AlarmDescription: Alert when audit failures exceed threshold
      MetricName: AuditFailures
      Namespace: GitHubActivityAggregator
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref AlertSNSTopic

  # メトリクスフィルター
  AuditFailureMetricFilter:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: /aws/lambda/github-activity-collector
      FilterPattern: '{ $.level = "AUDIT" && $.result = "failure" }'
      MetricTransformations:
        - MetricName: AuditFailures
          MetricNamespace: GitHubActivityAggregator
          MetricValue: '1'
```

---

## セキュリティチェックリスト

### デプロイ前

- [ ] すべてのシークレットがSecrets Managerに保存されている
- [ ] IAMロールが最小権限で設定されている
- [ ] RLSポリシーが有効化されている
- [ ] CloudWatch Logsの保持期間が設定されている

### 運用中

- [ ] 週次でCloudWatch Logsの異常を確認
- [ ] 月次でAPIキーのローテーションを確認
- [ ] 四半期でIAMポリシーをレビュー
- [ ] 年次でセキュリティ全体を監査

### インシデント対応

1. **キー漏洩時**
   - 即座にキーを無効化
   - 新しいキーを生成
   - Secrets Managerを更新
   - アクセスログを調査

2. **不正アクセス検知時**
   - Lambda関数を一時停止
   - CloudWatch Logsを分析
   - 影響範囲を特定
   - 対策を実施

---

**次のステップ**: [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md) で運用・監視設計を確認
