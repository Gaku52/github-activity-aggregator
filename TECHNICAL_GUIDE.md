# GitHub Activity Aggregator - 技術完全ガイド

**対象**: 自分用の週次自動化システムを構築
**前提**: 既存のSupabase Pro契約を活用

---

## 📚 目次

1. [技術スタック全体像](#技術スタック全体像)
2. [AWS Lambda の完全理解](#aws-lambda-の完全理解)
3. [EventBridge Scheduler の完全理解](#eventbridge-scheduler-の完全理解)
4. [Supabase の完全理解](#supabase-の完全理解)
5. [GitHub API の完全理解](#github-api-の完全理解)
6. [Claude API の完全理解](#claude-api-の完全理解)
7. [週次自動実行の仕組み](#週次自動実行の仕組み)
8. [実装手順](#実装手順)

---

## 🎯 技術スタック全体像

### なぜこの構成なのか？

```
EventBridge Scheduler  → 週次実行のトリガー（完全無料）
       ↓
AWS Lambda            → サーバーレス実行（無料枠内）
       ↓
GitHub API            → データ取得（完全無料）
       ↓
Claude API            → コミット分析（月4円程度）
       ↓
Supabase Pro          → データ保存（既存契約内）
       ↓
Notion API            → 結果投稿（完全無料）
```

**総コスト**: 月4円程度（Claude APIのみ）

### 各技術の役割

| 技術 | 役割 | 代替案 | なぜこれを選ぶか |
|-----|------|-------|--------------|
| EventBridge Scheduler | 週次トリガー | GitHub Actions, Cron | AWS無料枠、Lambda直接起動可能 |
| AWS Lambda | コード実行 | Vercel Cron, Railway | 完全無料枠、Supabaseと相性良い |
| Supabase | DB・ストレージ | PostgreSQL, MongoDB | 既存Pro契約、100GB使える |
| GitHub API | リポジトリデータ | Git直接操作 | 標準API、5,000 req/hrまで無料 |
| Claude API | AI分析 | OpenAI GPT-4o mini | コミット理解の品質が高い |
| Notion API | 結果投稿 | Markdown, Slack | 既存のNotion使用中 |

---

## ⚡ AWS Lambda の完全理解

### Lambda とは何か？

**簡単に言うと**: サーバーを管理せずにコードを実行できるサービス

**従来の方法**:
```
1. サーバーを借りる（EC2など）
2. Node.jsをインストール
3. コードをデプロイ
4. サーバーを24時間稼働
5. 月額 $5-20
```

**Lambda の方法**:
```
1. コードをアップロード
2. 実行時だけ課金
3. サーバー管理不要
4. 無料枠: 100万リクエスト/月
```

### Lambda の無料枠

- **リクエスト**: 100万回/月まで無料
- **実行時間**: 40万GB秒/月まで無料
- **ストレージ**: 512MB（コードサイズ）

**週次実行の場合**:
- 実行回数: 4回/月（毎週日曜）
- 実行時間: 1回30秒と仮定
- メモリ: 512MB
- **計算**: 4回 × 30秒 × 0.5GB = 60GB秒/月
- **結果**: 完全無料（40万GB秒の枠内）

### Lambda 関数の構造

```typescript
// handler.ts - Lambda のエントリーポイント
import { Handler } from 'aws-lambda'

export const handler: Handler = async (event, context) => {
  console.log('Lambda 実行開始:', new Date().toISOString())

  try {
    // 1. GitHub からデータ取得
    const repos = await fetchGitHubRepos()

    // 2. Claude で分析
    const analysis = await analyzeWithClaude(repos)

    // 3. Supabase に保存
    await saveToSupabase(analysis)

    // 4. Notion に投稿
    await postToNotion(analysis)

    return {
      statusCode: 200,
      body: JSON.stringify({ message: '成功' })
    }
  } catch (error) {
    console.error('エラー:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
```

### Lambda のメモリとタイムアウト設定

```yaml
# 設定例
メモリ: 512MB        # 十分（最小128MB、最大10,240MB）
タイムアウト: 60秒   # GitHub API + Claude API の待ち時間を考慮
ランタイム: Node.js 20.x
```

**メモリの選び方**:
- 少ないメモリ = 安いが遅い
- 多いメモリ = 速いが高い
- 512MBで十分（JSONデータの処理程度）

**タイムアウトの選び方**:
- GitHub API: 5-10秒
- Claude API: 5-10秒
- Supabase書き込み: 1-2秒
- Notion投稿: 1-2秒
- **合計**: 15-25秒 → 余裕を見て60秒

### Lambda のデプロイ方法

**方法1: AWS Console（初心者向け）**
```
1. AWSコンソールにログイン
2. Lambda → 関数の作成
3. コードをコピペ
4. デプロイボタンをクリック
```

**方法2: AWS CLI（推奨）**
```bash
# 1. コードをzipに圧縮
zip -r function.zip . -x "node_modules/*" "*.git/*"

# 2. Lambda 関数を作成
aws lambda create-function \
  --function-name github-activity-collector \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 512

# 3. コード更新時
aws lambda update-function-code \
  --function-name github-activity-collector \
  --zip-file fileb://function.zip
```

**方法3: SAM（本格的な開発）**
```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  GitHubCollectorFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: github-activity-collector
      Runtime: nodejs20.x
      Handler: index.handler
      Timeout: 60
      MemorySize: 512
      Environment:
        Variables:
          GITHUB_TOKEN: !Ref GitHubToken
          SUPABASE_URL: !Ref SupabaseUrl
```

```bash
# デプロイ
sam build
sam deploy --guided
```

### Lambda の環境変数設定

```bash
# AWS CLI で環境変数を設定
aws lambda update-function-configuration \
  --function-name github-activity-collector \
  --environment Variables="{
    GITHUB_TOKEN=ghp_xxxxx,
    GITHUB_USERNAME=Gaku52,
    SUPABASE_URL=https://xxx.supabase.co,
    SUPABASE_KEY=eyJxxx...,
    CLAUDE_API_KEY=sk-ant-xxxxx,
    NOTION_API_KEY=ntn_xxxxx,
    NOTION_DATABASE_ID=xxxxx
  }"
```

**セキュリティベストプラクティス**:
- 環境変数は暗号化される（デフォルト）
- さらに安全にする場合は AWS Secrets Manager を使用

---

## 📅 EventBridge Scheduler の完全理解

### EventBridge Scheduler とは何か？

**簡単に言うと**: クラウド版 Cron（定期実行タイマー）

**従来の Cron**:
```bash
# サーバーで設定
0 22 * * 0 /path/to/script.sh  # 毎週日曜22:00
```
→ サーバーが必要、止まったら動かない

**EventBridge Scheduler**:
```
AWS のマネージドサービス
サーバー不要
100% 確実に実行
完全無料（100万回/月まで）
```

### Cron 式の書き方

EventBridge は Cron 式を使って実行タイミングを指定します。

**基本構文**:
```
cron(分 時 日 月 曜日 年)
     │ │ │  │  │   │
     │ │ │  │  │   └─ 年（オプション）
     │ │ │  │  └───── 曜日（0-7, 0と7は日曜）
     │ │ │  └──────── 月（1-12）
     │ │ └─────────── 日（1-31）
     │ └────────────── 時（0-23）
     └─────────────── 分（0-59）
```

**実例**:

```bash
# 毎週日曜 22:00 JST（日本時間）
# EventBridgeはUTC基準なので、JSTから9時間引く
# 22:00 JST = 13:00 UTC
cron(0 13 ? * SUN *)

# 毎日 午前3:00 JST（= 18:00 UTC）
cron(0 18 * * ? *)

# 毎月1日 午前0:00 JST（= 前日15:00 UTC）
cron(0 15 1 * ? *)

# 平日のみ 午前9:00 JST（= 0:00 UTC）
cron(0 0 ? * MON-FRI *)
```

**注意点**:
- `?` はワイルドカード（日または曜日のどちらか一方に使用）
- `*` はすべての値
- EventBridge は **UTC タイムゾーン** が基準
- 日本時間（JST）は UTC+9 なので、**9時間引く**

### EventBridge の設定方法

**方法1: AWS Console**
```
1. EventBridge → スケジュール → スケジュールを作成
2. スケジュール名: github-activity-weekly
3. スケジュールパターン:
   - Cron式を選択
   - cron(0 13 ? * SUN *)
   - タイムゾーン: UTC
4. ターゲット:
   - AWS Lambda
   - 関数: github-activity-collector
5. 作成
```

**方法2: AWS CLI**
```bash
# スケジュールを作成
aws scheduler create-schedule \
  --name github-activity-weekly \
  --schedule-expression "cron(0 13 ? * SUN *)" \
  --flexible-time-window Mode=OFF \
  --target '{
    "Arn": "arn:aws:lambda:ap-northeast-1:YOUR_ACCOUNT:function:github-activity-collector",
    "RoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/EventBridgeSchedulerRole"
  }'
```

**方法3: SAM/CloudFormation**
```yaml
# template.yaml
Resources:
  WeeklySchedule:
    Type: AWS::Scheduler::Schedule
    Properties:
      Name: github-activity-weekly
      ScheduleExpression: cron(0 13 ? * SUN *)
      FlexibleTimeWindow:
        Mode: 'OFF'
      Target:
        Arn: !GetAtt GitHubCollectorFunction.Arn
        RoleArn: !GetAtt SchedulerRole.Arn
```

### EventBridge の料金

**無料枠**: 100万回の呼び出し/月まで無料

**週次実行の場合**:
- 実行回数: 4回/月
- 料金: **完全無料**

**仮に毎分実行しても**:
- 実行回数: 60分 × 24時間 × 30日 = 43,200回/月
- 料金: **完全無料**（100万回以内）

### EventBridge と Lambda の連携確認

```bash
# Lambda が EventBridge から呼び出されるか確認
aws lambda get-policy --function-name github-activity-collector

# 正しく設定されている場合、以下のような権限が表示される
{
  "Effect": "Allow",
  "Principal": {
    "Service": "scheduler.amazonaws.com"
  },
  "Action": "lambda:InvokeFunction"
}
```

**もし権限がない場合は追加**:
```bash
aws lambda add-permission \
  --function-name github-activity-collector \
  --statement-id EventBridgeInvoke \
  --action lambda:InvokeFunction \
  --principal scheduler.amazonaws.com
```

---

## 🗄️ Supabase の完全理解

### Supabase とは何か？

**簡単に言うと**: Firebase のオープンソース版（PostgreSQL ベース）

**構成要素**:
1. **Database**: PostgreSQL データベース
2. **Auth**: ユーザー認証（今回は不要）
3. **Storage**: ファイルストレージ
4. **Edge Functions**: サーバーレス関数（今回は不要）
5. **Realtime**: リアルタイム同期（今回は不要）

**今回使うのは**: Database と Storage のみ

### Supabase Pro プランの制限

| 項目 | 制限 | 備考 |
|-----|------|------|
| Database容量 | 8GB | テーブルデータ |
| Storage容量 | 100GB | ファイル保存 |
| 月額料金 | $25 | 既存契約 |
| APIリクエスト | 500万回/月 | 実質無制限 |
| 帯域幅 | 250GB/月 | 十分 |

**重要**: Database 8GB + Storage 100GB = 合計108GB

### Database スキーマ設計

```sql
-- 1. リポジトリマスタ
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- リポジトリ名
  full_name TEXT UNIQUE NOT NULL,        -- Gaku52/spark-vault
  description TEXT,
  language TEXT,                         -- 主要言語
  stars INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. コミット履歴
CREATE TABLE commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id),
  sha TEXT UNIQUE NOT NULL,              -- コミットハッシュ
  message TEXT NOT NULL,                 -- コミットメッセージ
  author_name TEXT,
  author_email TEXT,
  committed_at TIMESTAMPTZ NOT NULL,     -- コミット日時
  additions INTEGER DEFAULT 0,           -- 追加行数
  deletions INTEGER DEFAULT 0,           -- 削除行数
  files_changed INTEGER DEFAULT 0,       -- 変更ファイル数
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 週次レポート
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,              -- 週の開始日
  week_end DATE NOT NULL,                -- 週の終了日
  total_commits INTEGER DEFAULT 0,
  total_additions INTEGER DEFAULT 0,
  total_deletions INTEGER DEFAULT 0,
  active_repositories INTEGER DEFAULT 0,
  summary TEXT,                          -- Claude生成のサマリー
  notion_page_url TEXT,                  -- Notion投稿先URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AI分析結果
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_id UUID REFERENCES commits(id),
  analysis_text TEXT NOT NULL,           -- Claude の分析結果
  category TEXT,                         -- 分類（feature/fix/refactor等）
  impact_level TEXT,                     -- 影響度（high/medium/low）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成（検索高速化）
CREATE INDEX idx_commits_repo ON commits(repository_id);
CREATE INDEX idx_commits_date ON commits(committed_at);
CREATE INDEX idx_reports_date ON weekly_reports(week_start);
```

### Supabase への接続方法

**TypeScript での接続**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// データ挿入
const { data, error } = await supabase
  .from('repositories')
  .insert({
    name: 'spark-vault',
    full_name: 'Gaku52/spark-vault',
    language: 'TypeScript',
    stars: 10
  })

// データ取得
const { data: repos } = await supabase
  .from('repositories')
  .select('*')
  .order('created_at', { ascending: false })

// データ更新
await supabase
  .from('repositories')
  .update({ stars: 15 })
  .eq('name', 'spark-vault')

// データ削除
await supabase
  .from('commits')
  .delete()
  .lt('committed_at', '2024-01-01')  // 古いデータ削除
```

### Storage の使い方

```typescript
// レポートファイルを保存
const reportMarkdown = `# 週次レポート\n\n...`

const { data, error } = await supabase.storage
  .from('reports')  // バケット名
  .upload(`weekly/2025-W46.md`, reportMarkdown, {
    contentType: 'text/markdown',
    upsert: true  // 上書き許可
  })

// ファイル取得
const { data: fileData } = await supabase.storage
  .from('reports')
  .download('weekly/2025-W46.md')

// 公開URL取得
const { data: urlData } = supabase.storage
  .from('reports')
  .getPublicUrl('weekly/2025-W46.md')

console.log(urlData.publicUrl)
```

### RLS（Row Level Security）の設定

**重要**: Supabase はデフォルトで全データがブロックされる

**今回の方針**: サービスキー使用のため RLS 無効化

```sql
-- RLS を無効化（サービスキー使用時）
ALTER TABLE repositories DISABLE ROW LEVEL SECURITY;
ALTER TABLE commits DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses DISABLE ROW LEVEL SECURITY;
```

**注意**: 本番環境では適切な RLS ポリシーを設定すべき

---

## 🐙 GitHub API の完全理解

### GitHub API の種類

**REST API**:
- 標準的なHTTP API
- 簡単、わかりやすい
- レート制限: 5,000リクエスト/時（認証時）

**GraphQL API**:
- 柔軟なクエリ
- 1回で複数データ取得可能
- レート制限: ポイント制（複雑）

**今回使用**: REST API（シンプルで十分）

### GitHub Token の取得

```
1. GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token
4. スコープ選択:
   ✅ repo（全リポジトリアクセス）
   ✅ read:user（ユーザー情報）
5. トークン生成: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**重要**: トークンは一度しか表示されないので保存

### レート制限

| 認証状態 | レート制限 | 備考 |
|---------|-----------|------|
| 未認証 | 60回/時 | 使い物にならない |
| 認証済み | 5,000回/時 | 十分 |
| GitHub App | 15,000回/時 | 大規模向け |

**週次実行の場合**:
- リポジトリ一覧: 1回
- 各リポジトリのコミット: 10回（仮に10リポジトリ）
- **合計**: 11回/週 → **完全に余裕**

### API 使用例

**1. 全リポジトリ取得**:
```typescript
const response = await fetch(
  'https://api.github.com/user/repos?per_page=100&sort=pushed',
  {
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  }
)

const repos = await response.json()
// repos: Array<{ name, full_name, language, stargazers_count, ... }>
```

**2. 特定期間のコミット取得**:
```typescript
const since = '2025-11-09T00:00:00Z'  // 1週間前
const until = '2025-11-16T00:00:00Z'  // 今日

const response = await fetch(
  `https://api.github.com/repos/Gaku52/spark-vault/commits?since=${since}&until=${until}`,
  {
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  }
)

const commits = await response.json()
```

**3. コミット詳細取得**:
```typescript
const response = await fetch(
  `https://api.github.com/repos/Gaku52/spark-vault/commits/${sha}`,
  {
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  }
)

const commit = await response.json()
/*
{
  sha: "abc123...",
  commit: {
    message: "Add new feature",
    author: { name: "Gaku52", email: "...", date: "..." }
  },
  stats: {
    additions: 150,
    deletions: 30,
    total: 180
  },
  files: [
    { filename: "src/index.ts", additions: 50, deletions: 10, ... }
  ]
}
*/
```

### レート制限の確認

```typescript
const response = await fetch('https://api.github.com/rate_limit', {
  headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` }
})

const data = await response.json()
console.log(data.rate)
/*
{
  limit: 5000,
  remaining: 4998,
  reset: 1731758400  // Unix timestamp
}
*/
```

---

## 🤖 Claude API の完全理解

### Claude API とは

Anthropic が提供する AI API（ChatGPT の競合）

**特徴**:
- コンテキスト理解が優秀
- コード理解に強い
- 日本語も自然

### API Key の取得

```
1. https://console.anthropic.com/ にアクセス
2. Sign Up / Log In
3. API Keys → Create Key
4. キー生成: sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 料金体系

**Claude 3.5 Haiku**（最安・最速モデル）:
- Input: $0.80 / 1M tokens
- Output: $4.00 / 1M tokens

**トークン計算**:
- 日本語: 約2-3文字 = 1 token
- 英語: 約4文字 = 1 token
- コード: 約3-4文字 = 1 token

**週次実行のコスト**:
```
入力: 10リポジトリ × 平均20コミット × 100文字 = 20,000文字 ≈ 8,000 tokens
出力: サマリー 500文字 ≈ 200 tokens

コスト = (8,000 / 1,000,000 × $0.80) + (200 / 1,000,000 × $4.00)
      = $0.0064 + $0.0008
      = $0.0072/週
      ≈ $0.029/月
      ≈ 4円/月
```

### API 使用例

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

async function analyzeCommits(commits: Commit[]): Promise<string> {
  const commitList = commits.map(c =>
    `- ${c.message} (${c.additions}+ ${c.deletions}-)`
  ).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `以下のコミットを分析し、今週の開発内容を3-5行でまとめてください。

【コミット一覧】
${commitList}

【出力形式】
- 主な変更内容
- 技術的なハイライト
- 次週への影響`
    }]
  })

  return message.content[0].text
}
```

### トークン数の確認

```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'こんにちは' }]
})

console.log(response.usage)
/*
{
  input_tokens: 12,
  output_tokens: 15
}
*/
```

---

## ⏰ 週次自動実行の仕組み

### 全体フロー

```
日曜 22:00 JST（13:00 UTC）
        ↓
EventBridge が Lambda をトリガー
        ↓
Lambda 起動（60秒以内に完了）
        ↓
┌────────────────────────────┐
│ 1. 期間計算                 │
│   - 今日から7日前を計算      │
│   - since/until を設定      │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ 2. GitHub API 呼び出し      │
│   - 全リポジトリ取得         │
│   - 各リポジトリのコミット取得│
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ 3. Supabase に保存          │
│   - repositories テーブル   │
│   - commits テーブル        │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ 4. Claude API で分析        │
│   - コミットメッセージ分析   │
│   - サマリー生成            │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ 5. Supabase に結果保存      │
│   - weekly_reports テーブル │
│   - ai_analyses テーブル    │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ 6. Notion に投稿            │
│   - レポートページ作成       │
│   - URL を Supabase に記録  │
└────────────────────────────┘
```

### Lambda 関数の実装例

```typescript
// src/index.ts
import { Handler } from 'aws-lambda'
import { fetchGitHubActivity } from './github'
import { analyzeWithClaude } from './claude'
import { saveToSupabase } from './supabase'
import { postToNotion } from './notion'

export const handler: Handler = async (event, context) => {
  console.log('=== 週次レポート生成開始 ===')
  const startTime = Date.now()

  try {
    // 1. 期間計算（過去7日間）
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    console.log(`期間: ${weekAgo.toISOString()} 〜 ${now.toISOString()}`)

    // 2. GitHub データ取得
    console.log('GitHub データ取得中...')
    const activity = await fetchGitHubActivity(weekAgo, now)
    console.log(`取得: ${activity.repos.length}リポジトリ, ${activity.commits.length}コミット`)

    // 3. Supabase に保存
    console.log('Supabase に保存中...')
    await saveToSupabase(activity)

    // 4. Claude で分析
    console.log('Claude で分析中...')
    const analysis = await analyzeWithClaude(activity.commits)
    console.log(`分析完了: ${analysis.summary.length}文字`)

    // 5. レポート生成・保存
    console.log('週次レポート生成中...')
    const report = {
      week_start: weekAgo.toISOString().split('T')[0],
      week_end: now.toISOString().split('T')[0],
      total_commits: activity.commits.length,
      total_additions: activity.commits.reduce((sum, c) => sum + c.additions, 0),
      total_deletions: activity.commits.reduce((sum, c) => sum + c.deletions, 0),
      active_repositories: activity.repos.length,
      summary: analysis.summary
    }

    const savedReport = await saveToSupabase({ weeklyReport: report })

    // 6. Notion に投稿
    console.log('Notion に投稿中...')
    const notionPage = await postToNotion(report)
    console.log(`投稿完了: ${notionPage.url}`)

    // URL を Supabase に記録
    await saveToSupabase({
      reportId: savedReport.id,
      notionUrl: notionPage.url
    })

    const duration = Date.now() - startTime
    console.log(`=== 完了（${duration}ms）===`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        duration,
        commits: activity.commits.length,
        notionUrl: notionPage.url
      })
    }

  } catch (error) {
    console.error('エラー:', error)

    // エラー通知（Slack など）を送る場合はここで

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
```

---

## 🚀 実装手順

### Phase 1: ローカル開発環境構築（1-2時間）

```bash
# 1. プロジェクト初期化
mkdir github-activity-aggregator
cd github-activity-aggregator
npm init -y

# 2. 依存関係インストール
npm install @supabase/supabase-js @anthropic-ai/sdk
npm install -D @types/node @types/aws-lambda typescript

# 3. TypeScript 設定
npx tsc --init

# 4. .env ファイル作成
cat > .env << EOF
GITHUB_TOKEN=ghp_xxxxx
GITHUB_USERNAME=Gaku52
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...
CLAUDE_API_KEY=sk-ant-xxxxx
NOTION_API_KEY=ntn_xxxxx
NOTION_DATABASE_ID=xxxxx
EOF

# 5. フォルダ構成
mkdir -p src/{github,claude,supabase,notion}
touch src/index.ts
```

### Phase 2: GitHub 連携実装（2-3時間）

```typescript
// src/github/client.ts
export async function fetchGitHubActivity(since: Date, until: Date) {
  // 実装
}
```

**テスト**:
```bash
# ローカルで実行
npx tsx src/index.ts

# 正しくデータ取得できるか確認
```

### Phase 3: Supabase セットアップ（1時間）

```sql
-- Supabase Dashboard で SQL エディタを開く
-- スキーマを実行
```

**テスト**:
```bash
# データが保存されるか確認
npx tsx src/test-supabase.ts
```

### Phase 4: Claude 連携実装（1-2時間）

```typescript
// src/claude/analyzer.ts
export async function analyzeWithClaude(commits: Commit[]) {
  // 実装
}
```

**テスト**:
```bash
# 分析が正しく動作するか確認
npx tsx src/test-claude.ts
```

### Phase 5: Notion 連携実装（1時間）

```typescript
// src/notion/client.ts
export async function postToNotion(report: WeeklyReport) {
  // 既存の post-to-notion.ts を参考
}
```

### Phase 6: Lambda デプロイ（2-3時間）

```bash
# 1. ビルド
npm run build

# 2. 依存関係を含めてパッケージング
npm install --production
zip -r function.zip dist node_modules package.json

# 3. AWS CLI で Lambda 作成
aws lambda create-function \
  --function-name github-activity-collector \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-role \
  --handler dist/index.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 512

# 4. 環境変数設定
aws lambda update-function-configuration \
  --function-name github-activity-collector \
  --environment Variables="{...}"
```

### Phase 7: EventBridge 設定（30分）

```bash
# スケジュール作成
aws scheduler create-schedule \
  --name github-activity-weekly \
  --schedule-expression "cron(0 13 ? * SUN *)" \
  --target '{...}'
```

### Phase 8: テスト実行（30分）

```bash
# 手動でLambdaを実行
aws lambda invoke \
  --function-name github-activity-collector \
  --payload '{}' \
  response.json

# 結果確認
cat response.json

# Notion にページが作成されたか確認
```

---

## 📊 全体の所要時間

| フェーズ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Phase 1 | 環境構築 | 1-2時間 |
| Phase 2 | GitHub連携 | 2-3時間 |
| Phase 3 | Supabase | 1時間 |
| Phase 4 | Claude連携 | 1-2時間 |
| Phase 5 | Notion連携 | 1時間 |
| Phase 6 | Lambda | 2-3時間 |
| Phase 7 | EventBridge | 30分 |
| Phase 8 | テスト | 30分 |
| **合計** | | **9-13時間** |

**実際**: 詰まる箇所があるので **15-20時間** を見込む

---

## 🎯 次のステップ

1. **AWS アカウント作成**（まだの場合）
2. **Claude API Key 取得**
3. **ローカル環境で動作確認**
4. **Lambda にデプロイ**
5. **週次実行を待つ**

準備ができたら実装を開始しましょう！
