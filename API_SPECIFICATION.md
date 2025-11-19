# GitHub Activity Aggregator - API仕様書

**作成日**: 2025-11-20
**バージョン**: 1.0.0

---

## 目次

1. [概要](#概要)
2. [Lambda間インターフェース](#lambda間インターフェース)
3. [外部API連携仕様](#外部api連携仕様)
4. [Supabase API](#supabase-api)
5. [Webhook仕様](#webhook仕様)
6. [エラーコード](#エラーコード)

---

## 概要

### API設計原則

- **RESTful**: リソース指向の設計
- **JSON**: データ交換形式は全てJSON
- **冪等性**: 同じリクエストを複数回実行しても同じ結果
- **エラー処理**: 一貫したエラーレスポンス形式

### 認証方式

| サービス | 認証方式 | ヘッダー |
|---------|---------|---------|
| GitHub API | Bearer Token | `Authorization: Bearer {token}` |
| Supabase | API Key | `apikey: {key}`, `Authorization: Bearer {key}` |
| Notion API | Bearer Token | `Authorization: Bearer {token}` |
| Slack | Webhook URL | (URLに含む) |
| Claude API | API Key | `x-api-key: {key}` |

---

## Lambda間インターフェース

### Collector → Generator

Collectorが完了すると、Generatorを同期的に呼び出します。

#### イベントペイロード

```typescript
interface CollectorToGeneratorEvent {
  source: 'github-activity-collector'
  timestamp: string  // ISO 8601
  period: {
    start: string    // YYYY-MM-DD
    end: string      // YYYY-MM-DD
  }
  summary: {
    repositoriesProcessed: number
    commitsCollected: number
    errors: number
  }
}
```

#### 例

```json
{
  "source": "github-activity-collector",
  "timestamp": "2025-11-17T13:01:30.000Z",
  "period": {
    "start": "2025-11-10",
    "end": "2025-11-17"
  },
  "summary": {
    "repositoriesProcessed": 25,
    "commitsCollected": 150,
    "errors": 0
  }
}
```

### Generator → Publisher

#### イベントペイロード

```typescript
interface GeneratorToPublisherEvent {
  source: 'github-activity-generator'
  timestamp: string
  reportId: string  // UUID
  formats: Array<'notion' | 'markdown' | 'json' | 'slack'>
  period: {
    start: string
    end: string
  }
}
```

#### 例

```json
{
  "source": "github-activity-generator",
  "timestamp": "2025-11-17T13:01:45.000Z",
  "reportId": "123e4567-e89b-12d3-a456-426614174000",
  "formats": ["notion", "markdown", "slack"],
  "period": {
    "start": "2025-11-10",
    "end": "2025-11-17"
  }
}
```

### Lambda レスポンス形式

```typescript
interface LambdaResponse {
  statusCode: number
  body: string  // JSON stringified
  headers?: Record<string, string>
}

interface SuccessBody {
  success: true
  data: any
  timestamp: string
}

interface ErrorBody {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}
```

---

## 外部API連携仕様

### GitHub API

#### リポジトリ一覧取得

```typescript
// GET https://api.github.com/user/repos
interface GitHubRepoListParams {
  per_page?: number    // default: 30, max: 100
  page?: number        // default: 1
  sort?: 'created' | 'updated' | 'pushed' | 'full_name'
  direction?: 'asc' | 'desc'
  type?: 'all' | 'owner' | 'public' | 'private' | 'member'
}

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  private: boolean
  archived: boolean
  created_at: string
  updated_at: string
  pushed_at: string
}
```

#### コミット一覧取得

```typescript
// GET https://api.github.com/repos/{owner}/{repo}/commits
interface GitHubCommitListParams {
  sha?: string         // branch name or commit SHA
  since?: string       // ISO 8601 date
  until?: string       // ISO 8601 date
  per_page?: number
  page?: number
}

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
  }
  html_url: string
  stats?: {
    additions: number
    deletions: number
    total: number
  }
  files?: Array<{
    filename: string
    additions: number
    deletions: number
    changes: number
    status: string
  }>
}
```

#### レート制限

```typescript
// GET https://api.github.com/rate_limit
interface GitHubRateLimit {
  rate: {
    limit: number      // 5000 for authenticated
    remaining: number
    reset: number      // Unix timestamp
    used: number
  }
}
```

### Claude API

#### メッセージ作成

```typescript
// POST https://api.anthropic.com/v1/messages
interface ClaudeMessageRequest {
  model: string  // 'claude-3-5-haiku-20241022'
  max_tokens: number
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  system?: string
  temperature?: number  // 0.0 - 1.0
}

interface ClaudeMessageResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: Array<{
    type: 'text'
    text: string
  }>
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence'
  usage: {
    input_tokens: number
    output_tokens: number
  }
}
```

#### 使用例

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `以下のコミットを分析してください:\n${commitList}`
    }]
  })
})
```

### Notion API

#### ページ作成

```typescript
// POST https://api.notion.com/v1/pages
interface NotionPageRequest {
  parent: {
    database_id: string
  }
  properties: Record<string, NotionProperty>
  children?: NotionBlock[]
}

interface NotionProperty {
  title?: Array<{ text: { content: string } }>
  rich_text?: Array<{ text: { content: string } }>
  number?: number
  date?: { start: string; end?: string }
  select?: { name: string }
  multi_select?: Array<{ name: string }>
  checkbox?: boolean
  url?: string
}

interface NotionBlock {
  object: 'block'
  type: string
  [key: string]: any
}

interface NotionPageResponse {
  id: string
  url: string
  created_time: string
  last_edited_time: string
  properties: Record<string, any>
}
```

#### 使用例

```typescript
const response = await fetch('https://api.notion.com/v1/pages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
  },
  body: JSON.stringify({
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      Name: {
        title: [{ text: { content: '週次レポート 2025-11-17' } }]
      },
      Date: {
        date: { start: '2025-11-17' }
      },
      Status: {
        select: { name: '完了' }
      }
    },
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '今週の活動' } }]
        }
      }
    ]
  })
})
```

### Slack Webhook

#### メッセージ送信

```typescript
// POST {SLACK_WEBHOOK_URL}
interface SlackWebhookPayload {
  text?: string
  blocks?: SlackBlock[]
  attachments?: SlackAttachment[]
}

interface SlackBlock {
  type: 'section' | 'header' | 'divider' | 'context' | 'actions'
  text?: {
    type: 'mrkdwn' | 'plain_text'
    text: string
  }
  fields?: Array<{
    type: 'mrkdwn' | 'plain_text'
    text: string
  }>
}

interface SlackAttachment {
  color?: string
  title?: string
  text?: string
  fields?: Array<{
    title: string
    value: string
    short?: boolean
  }>
}
```

#### 使用例

```typescript
await fetch(process.env.SLACK_WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📊 週次レポート'
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '*リポジトリ数*\n25' },
          { type: 'mrkdwn', text: '*コミット数*\n150' }
        ]
      }
    ]
  })
})
```

---

## Supabase API

### データベース操作

#### 型定義

```typescript
// src/types/database.ts

export interface Database {
  public: {
    Tables: {
      repositories: {
        Row: {
          id: string
          name: string
          full_name: string
          description: string | null
          language: string | null
          stars: number
          forks: number
          open_issues: number
          is_private: boolean
          is_archived: boolean
          created_at: string
          updated_at: string
          last_push_at: string | null
          metadata: Record<string, any>
        }
        Insert: Omit<Repository['Row'], 'id' | 'created_at'>
        Update: Partial<Repository['Insert']>
      }
      commits: {
        Row: {
          id: string
          repo_id: string
          sha: string
          message: string
          author_name: string | null
          author_email: string | null
          committed_at: string
          additions: number
          deletions: number
          files_changed: number
          url: string | null
          created_at: string
        }
        Insert: Omit<Commit['Row'], 'id' | 'created_at'>
        Update: Partial<Commit['Insert']>
      }
      weekly_activities: {
        Row: {
          id: string
          repo_id: string
          week_start: string
          week_end: string
          commits_count: number
          prs_count: number
          issues_count: number
          lines_added: number
          lines_deleted: number
          files_changed: number
          contributors: string[]
          languages: Record<string, number>
          raw_data: Record<string, any>
          created_at: string
        }
        Insert: Omit<WeeklyActivity['Row'], 'id' | 'created_at'>
        Update: Partial<WeeklyActivity['Insert']>
      }
      generated_reports: {
        Row: {
          id: string
          period_start: string
          period_end: string
          report_type: 'weekly' | 'monthly' | 'yearly'
          format: 'notion' | 'markdown' | 'json' | 'slack'
          title: string
          content: Record<string, any>
          summary: Record<string, any> | null
          published_at: string | null
          notion_page_id: string | null
          github_pages_url: string | null
          created_at: string
        }
        Insert: Omit<GeneratedReport['Row'], 'id' | 'created_at'>
        Update: Partial<GeneratedReport['Insert']>
      }
    }
  }
}
```

#### CRUD操作

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from './types/database'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Insert
const { data, error } = await supabase
  .from('repositories')
  .insert({
    name: 'my-repo',
    full_name: 'user/my-repo',
    language: 'TypeScript',
    stars: 0,
    forks: 0,
    open_issues: 0,
    is_private: false,
    is_archived: false,
    updated_at: new Date().toISOString()
  })
  .select()
  .single()

// Upsert
const { data, error } = await supabase
  .from('repositories')
  .upsert(
    { full_name: 'user/my-repo', stars: 10 },
    { onConflict: 'full_name' }
  )
  .select()

// Select with join
const { data, error } = await supabase
  .from('weekly_activities')
  .select(`
    *,
    repositories (
      name,
      full_name,
      language
    )
  `)
  .gte('week_start', '2025-11-10')
  .order('week_start', { ascending: false })

// Update
const { data, error } = await supabase
  .from('generated_reports')
  .update({
    published_at: new Date().toISOString(),
    notion_page_id: 'xxxxx'
  })
  .eq('id', reportId)
  .select()
  .single()

// Delete
const { error } = await supabase
  .from('commits')
  .delete()
  .lt('committed_at', '2024-01-01')
```

### Storage操作

```typescript
// Upload
const { data, error } = await supabase.storage
  .from('reports')
  .upload(`weekly/${date}.md`, markdownContent, {
    contentType: 'text/markdown',
    upsert: true
  })

// Download
const { data, error } = await supabase.storage
  .from('reports')
  .download(`weekly/${date}.md`)

// Get public URL
const { data } = supabase.storage
  .from('reports')
  .getPublicUrl(`weekly/${date}.md`)

// List files
const { data, error } = await supabase.storage
  .from('reports')
  .list('weekly', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' }
  })

// Delete
const { error } = await supabase.storage
  .from('reports')
  .remove(['weekly/old-report.md'])
```

---

## Webhook仕様

### カスタムWebhook配信

外部サービスにレポートデータを配信するためのWebhook仕様。

#### リクエスト形式

```typescript
// POST {CUSTOM_WEBHOOK_URL}
interface WebhookPayload {
  event: 'report.generated'
  timestamp: string
  data: {
    reportId: string
    period: {
      start: string
      end: string
    }
    summary: {
      totalCommits: number
      totalAdditions: number
      totalDeletions: number
      activeRepositories: number
      topLanguages: Array<{
        language: string
        percentage: number
      }>
    }
    repositories: Array<{
      name: string
      fullName: string
      commitsCount: number
      linesAdded: number
      linesDeleted: number
    }>
    reportUrl?: string  // Notion or GitHub Pages URL
  }
}
```

#### 例

```json
{
  "event": "report.generated",
  "timestamp": "2025-11-17T13:02:00.000Z",
  "data": {
    "reportId": "123e4567-e89b-12d3-a456-426614174000",
    "period": {
      "start": "2025-11-10",
      "end": "2025-11-17"
    },
    "summary": {
      "totalCommits": 150,
      "totalAdditions": 2500,
      "totalDeletions": 800,
      "activeRepositories": 8,
      "topLanguages": [
        { "language": "TypeScript", "percentage": 65 },
        { "language": "Python", "percentage": 20 },
        { "language": "JavaScript", "percentage": 15 }
      ]
    },
    "repositories": [
      {
        "name": "spark-vault",
        "fullName": "Gaku52/spark-vault",
        "commitsCount": 45,
        "linesAdded": 1200,
        "linesDeleted": 300
      }
    ],
    "reportUrl": "https://www.notion.so/xxxxx"
  }
}
```

#### 署名検証

セキュリティのため、Webhookリクエストには署名が含まれます。

```typescript
// ヘッダー
// X-Webhook-Signature: sha256={signature}
// X-Webhook-Timestamp: {unix_timestamp}

// 署名検証コード
import crypto from 'crypto'

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  const signedPayload = `${timestamp}.${payload}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')

  return crypto.timingSafeEquals(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  )
}
```

#### リトライポリシー

| 試行 | 待機時間 |
|-----|---------|
| 1回目 | 即時 |
| 2回目 | 1分後 |
| 3回目 | 5分後 |
| 4回目 | 15分後 |
| 5回目 | 60分後 |

5回失敗後は配信を中止し、アラートを発生。

---

## エラーコード

### 共通エラーコード

| コード | HTTP Status | 説明 |
|-------|------------|------|
| `INTERNAL_ERROR` | 500 | 内部エラー |
| `INVALID_REQUEST` | 400 | リクエスト形式が不正 |
| `UNAUTHORIZED` | 401 | 認証失敗 |
| `FORBIDDEN` | 403 | アクセス権限なし |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `RATE_LIMITED` | 429 | レート制限超過 |
| `SERVICE_UNAVAILABLE` | 503 | サービス一時停止 |

### サービス別エラーコード

#### GitHub API

| コード | 説明 | 対処 |
|-------|------|------|
| `GITHUB_AUTH_FAILED` | トークン無効 | トークン再発行 |
| `GITHUB_RATE_LIMIT` | レート制限 | 待機後リトライ |
| `GITHUB_REPO_NOT_FOUND` | リポジトリ不在 | スキップ |

#### Supabase

| コード | 説明 | 対処 |
|-------|------|------|
| `SUPABASE_CONNECTION_ERROR` | 接続失敗 | リトライ |
| `SUPABASE_QUERY_ERROR` | クエリエラー | ログ確認 |
| `SUPABASE_RLS_ERROR` | RLSポリシー違反 | 権限確認 |

#### Claude API

| コード | 説明 | 対処 |
|-------|------|------|
| `CLAUDE_AUTH_FAILED` | APIキー無効 | キー再発行 |
| `CLAUDE_RATE_LIMIT` | レート制限 | 待機後リトライ |
| `CLAUDE_QUOTA_EXCEEDED` | 使用量超過 | チャージ |

#### Notion API

| コード | 説明 | 対処 |
|-------|------|------|
| `NOTION_AUTH_FAILED` | トークン無効 | トークン確認 |
| `NOTION_DATABASE_NOT_FOUND` | DB不在 | ID確認 |
| `NOTION_VALIDATION_ERROR` | プロパティエラー | スキーマ確認 |

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: {
      field?: string
      reason?: string
      [key: string]: any
    }
  }
  timestamp: string
  requestId?: string
}
```

#### 例

```json
{
  "success": false,
  "error": {
    "code": "GITHUB_RATE_LIMIT",
    "message": "GitHub API rate limit exceeded",
    "details": {
      "limit": 5000,
      "remaining": 0,
      "reset": 1700000000,
      "retryAfter": 3600
    }
  },
  "timestamp": "2025-11-17T13:00:00.000Z",
  "requestId": "abc123"
}
```

---

**次のステップ**: [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) でバックアップ・リカバリ計画を確認
