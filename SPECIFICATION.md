# GitHub Activity Aggregator - 完全仕様書

## 📋 プロジェクト概要

**GitHub Activity Aggregator** は、全GitHubリポジトリの活動を自動収集・分析し、複数の出力先に進捗報告を行う自動化システムです。

### 目的
- 全リポジトリの活動を一元管理
- 手動での進捗報告作業をゼロに
- データ分析による開発パターンの可視化
- 複数サービスへの柔軟な配信

### コンセプト
**"Set it and forget it"** - 一度設定すれば、あとは完全自動

### 実装方針
**CLI-First Approach** - UIなしのCLIツールとして開発し、段階的に収益化

詳細な収益化戦略は [MONETIZATION_STRATEGY.md](./MONETIZATION_STRATEGY.md) を参照

---

## 🎯 主要機能

### 1. 自動データ収集
- GitHub API経由で全リポジトリの活動を取得
- コミット、PR、Issue、Releaseを収集
- コード統計、言語分析

### 2. インテリジェント分析
- プロジェクト別サマリー生成
- 技術スタック分析
- アクティビティヒートマップ
- 週次/月次/年次レポート自動生成

### 3. マルチチャンネル配信
- Notion（構造化データベース）
- Markdown（GitHub Pages / ブログ）
- JSON API（外部サービス連携）
- Slack/Discord（リアルタイム通知）
- Email（週報送信）

---

## 🏗️ システムアーキテクチャ

### 全体構成

```
┌─────────────────┐
│  EventBridge    │ ← スケジューラ（毎週日曜22:00）
└────────┬────────┘
         │ トリガー
         ▼
┌─────────────────┐
│ Lambda:         │
│ GitHub          │ ← GitHub API呼び出し
│ Collector       │   全リポジトリ取得
└────────┬────────┘
         │ 保存
         ▼
┌─────────────────┐
│  Supabase Pro   │ ← データ永続化
│  Database       │   (100GB利用可能)
└────────┬────────┘
         │ 読込
         ▼
┌─────────────────┐
│ Lambda:         │
│ Report          │ ← データ分析・整形
│ Generator       │   レポート生成
└────────┬────────┘
         │ 保存
         ▼
┌─────────────────┐
│  Supabase       │ ← 生成レポート保存
│  Storage        │
└────────┬────────┘
         │ 配信
         ▼
┌─────────────────┐
│ Lambda:         │
│ Multi-Channel   │ ← 複数サービスに配信
│ Publisher       │
└────────┬────────┘
         │
         ├─► Notion API
         ├─► Slack Webhook
         ├─► GitHub Pages (Markdown)
         ├─► Email (SES)
         └─► Custom Webhook
```

---

## 📊 データモデル

### Supabase データベーススキーマ

```sql
-- リポジトリマスタ
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  full_name TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  homepage TEXT,
  language TEXT,
  stars INT DEFAULT 0,
  forks INT DEFAULT 0,
  open_issues INT DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  last_push_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- コミット履歴
CREATE TABLE commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  committed_at TIMESTAMP NOT NULL,
  additions INT DEFAULT 0,
  deletions INT DEFAULT 0,
  files_changed INT DEFAULT 0,
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(repo_id, sha)
);

-- 週次アクティビティ（集計データ）
CREATE TABLE weekly_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  commits_count INT DEFAULT 0,
  prs_count INT DEFAULT 0,
  issues_count INT DEFAULT 0,
  lines_added INT DEFAULT 0,
  lines_deleted INT DEFAULT 0,
  files_changed INT DEFAULT 0,
  contributors TEXT[] DEFAULT '{}',
  languages JSONB DEFAULT '{}'::jsonb,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(repo_id, week_start)
);

-- 生成レポート
CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_type TEXT NOT NULL, -- 'weekly', 'monthly', 'yearly'
  format TEXT NOT NULL, -- 'notion', 'markdown', 'json', 'slack'
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  summary JSONB,
  published_at TIMESTAMP,
  notion_page_id TEXT,
  github_pages_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- プラットフォーム統計
CREATE TABLE platform_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  total_repos INT DEFAULT 0,
  active_repos INT DEFAULT 0,
  total_commits INT DEFAULT 0,
  total_contributors INT DEFAULT 0,
  language_distribution JSONB DEFAULT '{}'::jsonb,
  activity_heatmap JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_commits_repo_date ON commits(repo_id, committed_at DESC);
CREATE INDEX idx_weekly_activities_week ON weekly_activities(week_start DESC);
CREATE INDEX idx_generated_reports_period ON generated_reports(period_start DESC);
CREATE INDEX idx_repositories_updated ON repositories(updated_at DESC);
```

---

## 🔧 技術スタック

### AWS サービス
- **Lambda**: サーバーレス実行環境
- **EventBridge**: スケジュール管理
- **IAM**: 権限管理

### データベース・ストレージ
- **Supabase Pro**:
  - PostgreSQL データベース（100GB）
  - Storage（ファイル保存）
  - Row Level Security

### 外部API
- **GitHub API v3/v4**: リポジトリデータ取得
- **Notion API**: 進捗データベース
- **Slack Webhook**: 通知配信

### 開発・デプロイ
- **TypeScript**: 型安全な実装
- **Node.js 20.x**: Lambda ランタイム
- **AWS CDK**: インフラコード管理（Infrastructure as Code）
- **GitHub Actions**: CI/CD

---

## 📦 Lambda関数詳細

### Lambda 1: GitHub Collector

**役割**: GitHub APIから全リポジトリの活動データを収集

```typescript
// lambda/collector/index.ts
import { Octokit } from '@octokit/rest'
import { createClient } from '@supabase/supabase-js'

interface CollectorConfig {
  githubToken: string
  supabaseUrl: string
  supabaseKey: string
  username: string
  since: string // ISO 8601 date
}

export const handler = async (event: any) => {
  const config: CollectorConfig = {
    githubToken: process.env.GITHUB_TOKEN!,
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!,
    username: process.env.GITHUB_USERNAME!,
    since: getLastWeekDate(),
  }

  const octokit = new Octokit({ auth: config.githubToken })
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)

  // 1. 全リポジトリ取得
  const repos = await fetchAllRepositories(octokit, config.username)

  // 2. リポジトリ情報をSupabaseに保存
  await upsertRepositories(supabase, repos)

  // 3. 各リポジトリのコミット取得
  const commits = await fetchCommitsSince(octokit, repos, config.since)

  // 4. コミット情報を保存
  await insertCommits(supabase, commits)

  // 5. 週次集計データ作成
  await aggregateWeeklyActivity(supabase, config.since)

  return {
    statusCode: 200,
    body: JSON.stringify({
      repositories: repos.length,
      commits: commits.length,
      period: config.since,
    }),
  }
}

async function fetchAllRepositories(octokit: Octokit, username: string) {
  const { data } = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
    direction: 'desc',
  })

  return data.map(repo => ({
    name: repo.name,
    full_name: repo.full_name,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    open_issues: repo.open_issues_count,
    is_private: repo.private,
    is_archived: repo.archived,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    last_push_at: repo.pushed_at,
  }))
}

async function fetchCommitsSince(
  octokit: Octokit,
  repos: any[],
  since: string
) {
  const allCommits = []

  for (const repo of repos) {
    try {
      const { data } = await octokit.repos.listCommits({
        owner: repo.owner.login,
        repo: repo.name,
        since,
        per_page: 100,
      })

      for (const commit of data) {
        const { data: commitDetail } = await octokit.repos.getCommit({
          owner: repo.owner.login,
          repo: repo.name,
          ref: commit.sha,
        })

        allCommits.push({
          repo_full_name: repo.full_name,
          sha: commit.sha,
          message: commit.commit.message,
          author_name: commit.commit.author?.name,
          author_email: commit.commit.author?.email,
          committed_at: commit.commit.author?.date,
          additions: commitDetail.stats?.additions || 0,
          deletions: commitDetail.stats?.deletions || 0,
          files_changed: commitDetail.files?.length || 0,
          url: commit.html_url,
        })
      }
    } catch (error) {
      console.error(`Error fetching commits for ${repo.name}:`, error)
    }
  }

  return allCommits
}
```

**実行時間**: 30-60秒（リポジトリ数による）
**メモリ**: 512MB
**トリガー**: EventBridge（週次）

---

### Lambda 2: Report Generator

**役割**: 収集データを分析し、複数フォーマットのレポート生成

```typescript
// lambda/generator/index.ts
import { createClient } from '@supabase/supabase-js'

export const handler = async (event: any) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  )

  const periodStart = getLastWeekStart()
  const periodEnd = getLastWeekEnd()

  // 1. 週次データ取得
  const { data: weeklyActivities } = await supabase
    .from('weekly_activities')
    .select('*, repositories(*)')
    .gte('week_start', periodStart)
    .lte('week_end', periodEnd)

  // 2. 統計計算
  const stats = calculateStatistics(weeklyActivities)

  // 3. 複数フォーマット生成
  const reports = {
    notion: generateNotionFormat(weeklyActivities, stats),
    markdown: generateMarkdownFormat(weeklyActivities, stats),
    json: generateJSONFormat(weeklyActivities, stats),
    slack: generateSlackFormat(weeklyActivities, stats),
  }

  // 4. Supabaseに保存
  for (const [format, content] of Object.entries(reports)) {
    await supabase.from('generated_reports').insert({
      period_start: periodStart,
      period_end: periodEnd,
      report_type: 'weekly',
      format,
      title: `週次進捗レポート ${periodStart}`,
      content,
      summary: stats,
    })
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ stats, formats: Object.keys(reports) }),
  }
}

function generateNotionFormat(activities: any[], stats: any) {
  return {
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      Name: {
        title: [{ text: { content: `週次進捗 ${stats.period}` } }],
      },
      '日付': { date: { start: stats.periodStart } },
      'ステータス': { select: { name: '完了' } },
      'カテゴリ': {
        multi_select: [
          { name: 'GitHub Activity' },
          { name: '自動生成' },
        ],
      },
    },
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📊 概要' } }],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { text: { content: `アクティブリポジトリ: ${stats.activeRepos}` } },
          ],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { text: { content: `総コミット数: ${stats.totalCommits}` } },
          ],
        },
      },
      // ... 詳細データ
    ],
  }
}

function generateMarkdownFormat(activities: any[], stats: any) {
  return `# 週次進捗レポート ${stats.period}

## 📊 概要

- **期間**: ${stats.periodStart} 〜 ${stats.periodEnd}
- **アクティブリポジトリ**: ${stats.activeRepos}
- **総コミット数**: ${stats.totalCommits}
- **追加行数**: +${stats.linesAdded}
- **削除行数**: -${stats.linesDeleted}

## 🚀 プロジェクト別活動

${activities.map(activity => `
### ${activity.repositories.name}

- コミット: ${activity.commits_count}
- 変更: +${activity.lines_added} / -${activity.lines_deleted}
- ファイル: ${activity.files_changed}

${activity.commits.map(c => `- ${c.message.split('\n')[0]}`).join('\n')}
`).join('\n')}

## 📈 統計

### 言語分布
${Object.entries(stats.languages).map(([lang, count]) => `- ${lang}: ${count}%`).join('\n')}

---
*自動生成 by GitHub Activity Aggregator*
`
}
```

**実行時間**: 10-20秒
**メモリ**: 256MB
**トリガー**: Collector完了後

---

### Lambda 3: Multi-Channel Publisher

**役割**: 生成されたレポートを複数サービスに配信

```typescript
// lambda/publisher/index.ts
import { createClient } from '@supabase/supabase-js'

interface Publisher {
  name: string
  enabled: boolean
  publish: (report: any) => Promise<void>
}

export const handler = async (event: any) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  )

  // 最新レポート取得
  const { data: reports } = await supabase
    .from('generated_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(4) // notion, markdown, json, slack

  // Publisher設定
  const publishers: Publisher[] = [
    {
      name: 'Notion',
      enabled: process.env.NOTION_ENABLED === 'true',
      publish: async (report) => {
        const response = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report.content),
        })

        if (response.ok) {
          const data = await response.json()
          await supabase
            .from('generated_reports')
            .update({ notion_page_id: data.id, published_at: new Date() })
            .eq('id', report.id)
        }
      },
    },
    {
      name: 'Slack',
      enabled: process.env.SLACK_ENABLED === 'true',
      publish: async (report) => {
        await fetch(process.env.SLACK_WEBHOOK_URL!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report.content),
        })
      },
    },
    // ... 他のPublisher
  ]

  // 並列配信
  const results = await Promise.allSettled(
    publishers
      .filter(p => p.enabled)
      .map(async publisher => {
        const report = reports?.find(r => r.format === publisher.name.toLowerCase())
        if (report) {
          await publisher.publish(report)
          return { publisher: publisher.name, status: 'success' }
        }
        return { publisher: publisher.name, status: 'skipped' }
      })
  )

  return {
    statusCode: 200,
    body: JSON.stringify({ results }),
  }
}
```

**実行時間**: 5-10秒
**メモリ**: 256MB
**トリガー**: Generator完了後

---

## ⚙️ 環境変数

### Lambda共通
```bash
# GitHub
GITHUB_TOKEN=ghp_xxxxx
GITHUB_USERNAME=Gaku52

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...

# Notion
NOTION_ENABLED=true
NOTION_API_KEY=ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Slack
SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# その他
LOG_LEVEL=info
TIMEZONE=Asia/Tokyo
```

---

## 📅 スケジュール設定

### EventBridge ルール

```json
{
  "Name": "github-activity-weekly-trigger",
  "Description": "週次でGitHub活動を収集",
  "ScheduleExpression": "cron(0 22 ? * SUN *)",
  "State": "ENABLED",
  "Targets": [
    {
      "Arn": "arn:aws:lambda:ap-northeast-1:xxx:function:github-collector",
      "Id": "1"
    }
  ]
}
```

**スケジュール例**:
- 毎週日曜 22:00 JST: 週次レポート
- 毎月1日 00:00 JST: 月次サマリー
- 毎年1月1日 00:00 JST: 年次レビュー

---

## 💰 コスト詳細

### AWS Lambda
```
実行回数: 月4回（週次） × 3関数 = 12回/月
実行時間: 合計 約60秒/週 = 240秒/月
メモリ: 平均 340MB

コスト: $0/月（無料枠内）
```

### EventBridge
```
イベント数: 月4回

コスト: $0/月（無料枠内）
```

### Supabase Pro
```
データベース: 約10MB/年
ストレージ: 約1GB/年

コスト: $0/月（既存Pro契約内）
```

### GitHub API
```
リクエスト数: 約500/週 = 2,000/月

コスト: $0/月（無料）
```

**合計追加コスト: $0/月** ✅

---

## 🚀 実装ロードマップ

### Phase 1: 基盤構築（1-2週間）
- [x] リポジトリ作成
- [ ] Supabase データベース設計
- [ ] Lambda関数の基本実装
- [ ] ローカルテスト環境構築

### Phase 2: データ収集（1週間）
- [ ] GitHub API統合
- [ ] Collector Lambda実装
- [ ] データ保存ロジック
- [ ] エラーハンドリング

### Phase 3: レポート生成（1週間）
- [ ] Generator Lambda実装
- [ ] 複数フォーマット対応
- [ ] テンプレートエンジン
- [ ] データ分析ロジック

### Phase 4: 配信機能（1週間）
- [ ] Publisher Lambda実装
- [ ] Notion API統合
- [ ] Slack Webhook統合
- [ ] Markdown生成

### Phase 5: デプロイ（3日）
- [ ] AWS CDKでインフラ定義
- [ ] CI/CD設定（GitHub Actions）
- [ ] 本番環境デプロイ
- [ ] 動作確認

### Phase 6: 運用・最適化（継続）
- [ ] モニタリング設定
- [ ] アラート設定
- [ ] パフォーマンス最適化
- [ ] 機能拡張

---

## 📚 学習リソース

### AWS Lambda
- [AWS Lambda 公式ドキュメント](https://docs.aws.amazon.com/lambda/)
- [Serverless Framework](https://www.serverless.com/)
- [AWS CDK入門](https://docs.aws.amazon.com/cdk/)

### GitHub API
- [GitHub REST API](https://docs.github.com/en/rest)
- [Octokit.js](https://github.com/octokit/octokit.js)

### Supabase
- [Supabase ドキュメント](https://supabase.com/docs)
- [PostgreSQL チュートリアル](https://www.postgresql.org/docs/)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## 🔐 セキュリティ

### 認証情報管理
- AWS Secrets Manager for トークン管理
- 環境変数は暗号化
- IAMロールで最小権限原則

### データ保護
- Supabase RLS (Row Level Security)
- APIキーのローテーション
- アクセスログ記録

---

## 🧪 テスト戦略

### ユニットテスト
```typescript
// tests/collector.test.ts
describe('GitHub Collector', () => {
  it('should fetch all repositories', async () => {
    const repos = await fetchAllRepositories(mockOctokit, 'testuser')
    expect(repos).toHaveLength(10)
  })
})
```

### 統合テスト
```typescript
// tests/integration.test.ts
describe('End-to-End Flow', () => {
  it('should collect, generate, and publish report', async () => {
    await collectorHandler({})
    await generatorHandler({})
    await publisherHandler({})

    const report = await getLatestReport()
    expect(report.published_at).toBeDefined()
  })
})
```

---

## 📈 将来の拡張

### 追加機能候補
- [ ] リアルタイム通知（Webhook経由）
- [ ] ダッシュボードUI（React + Next.js）
- [ ] モバイルアプリ（React Native）
- [ ] AIによるコミットメッセージ分析
- [ ] チーム機能（複数ユーザー対応）
- [ ] カスタムレポートテンプレート
- [ ] データエクスポート（CSV, PDF）
- [ ] 他サービス連携（Trello, Jira, Linear）

---

## 🤝 コントリビューション

現在は個人プロジェクトですが、将来的にオープンソース化を検討。

---

## 📄 ライセンス

MIT License

---

## 📞 サポート

質問や問題が発生した場合:
- GitHub Issues
- Email: [your-email]

---

**作成日**: 2025-11-15
**バージョン**: 1.0.0
**ステータス**: 仕様策定完了、実装前

---

## 次のステップ

1. **技術学習** - AWS Lambda、EventBridge、Supabaseの理解を深める
2. **環境準備** - AWS、Supabase、GitHub APIの設定
3. **プロトタイプ** - 小規模な実装で動作確認
4. **本実装** - Phase 1から順次実装

**学習開始時はこのドキュメントを参照してください。**
