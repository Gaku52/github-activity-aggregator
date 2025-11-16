# 実装計画書 - 2日目（統合スクリプト作成）

**作業時間**: 21:00-23:00（2時間）
**前提**: 1日目（Step 1-4）が完了している

---

## 🎯 2日目の目標

**ゴール**: ローカルで全機能を統合して実行できる

```
[ ] src/github/client.ts 完成
[ ] src/claude/analyzer.ts 完成
[ ] src/supabase/client.ts 完成
[ ] src/notion/client.ts 完成
[ ] src/index.ts 完成
[ ] ローカルで実行して Notion に投稿成功
```

**所要時間**: 2時間

---

## 📂 作業開始前の確認

### 環境確認

```bash
# プロジェクトディレクトリに移動
cd ~/github-activity-aggregator

# フォルダ構成確認
ls -la src/
# → github/ claude/ supabase/ notion/ が存在する

# .env 確認
cat .env
# → すべての環境変数が設定されている
```

### ✅ 確認チェックリスト

```
[ ] 1日目のStep 1-4がすべて成功している
[ ] src/フォルダ構成が作成されている
[ ] .env にすべての環境変数が設定されている
[ ] node_modules がインストールされている
```

---

## 📝 Step 5-1: GitHub Client 作成（20分）

### src/github/client.ts

```bash
cat > src/github/client.ts << 'EOF'
export interface Commit {
  repo: string
  sha: string
  message: string
  author: string
  date: string
  additions?: number
  deletions?: number
}

export async function fetchWeeklyActivity(
  since: Date,
  until: Date
): Promise<{ repos: any[]; commits: Commit[] }> {
  const token = process.env.GITHUB_TOKEN!
  const username = process.env.GITHUB_USERNAME!

  console.log('📥 GitHub データ取得中...')

  // 1. リポジトリ一覧取得
  const reposResponse = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  )

  if (!reposResponse.ok) {
    throw new Error(`GitHub API error: ${reposResponse.statusText}`)
  }

  const repos = await reposResponse.json()
  console.log(`  ✓ ${repos.length}個のリポジトリを取得`)

  // 2. 各リポジトリのコミット取得
  const allCommits: Commit[] = []

  for (const repo of repos) {
    try {
      const commitsResponse = await fetch(
        `https://api.github.com/repos/${repo.full_name}/commits?` +
        `since=${since.toISOString()}&until=${until.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      if (!commitsResponse.ok) {
        console.log(`  ⚠️  ${repo.name}: スキップ（${commitsResponse.status}）`)
        continue
      }

      const commits = await commitsResponse.json()

      if (Array.isArray(commits) && commits.length > 0) {
        console.log(`  ✓ ${repo.name}: ${commits.length}件`)

        allCommits.push(...commits.map(c => ({
          repo: repo.full_name,
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author.name,
          date: c.commit.author.date
        })))
      }
    } catch (error) {
      console.log(`  ⚠️  ${repo.name}: エラー（スキップ）`)
    }
  }

  console.log(`  ✓ 合計 ${allCommits.length}件のコミット\n`)

  return { repos, commits: allCommits }
}
EOF
```

### テスト

```bash
# テストファイル作成
cat > test-github-client.ts << 'EOF'
import 'dotenv/config'
import { fetchWeeklyActivity } from './src/github/client'

async function test() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { repos, commits } = await fetchWeeklyActivity(weekAgo, now)

  console.log(`リポジトリ数: ${repos.length}`)
  console.log(`コミット数: ${commits.length}`)

  if (commits.length > 0) {
    console.log('\n最新のコミット:')
    console.log(commits[0])
  }
}

test().catch(console.error)
EOF

# 実行
npx tsx test-github-client.ts
```

### ✅ 完了チェック

```
[ ] fetchWeeklyActivity が正しく動作
[ ] コミット数が表示される
```

---

## 🤖 Step 5-2: Claude Analyzer 作成（15分）

### src/claude/analyzer.ts

```bash
cat > src/claude/analyzer.ts << 'EOF'
import Anthropic from '@anthropic-ai/sdk'
import { Commit } from '../github/client'

export async function analyzeCommits(commits: Commit[]): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY!
  })

  console.log('🤖 Claude で分析中...')

  const commitList = commits.map(c =>
    `- [${c.repo}] ${c.message.split('\n')[0]}`
  ).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `以下のコミットを分析し、今週の開発内容を簡潔にまとめてください。

【コミット一覧】
${commitList}

【出力形式】
- 3-5行程度
- 主な成果と技術的なポイント
- 日本語で
- 箇条書きで`
    }]
  })

  const analysis = message.content[0].text

  console.log(`  ✓ 分析完了（${message.usage.input_tokens + message.usage.output_tokens} tokens）\n`)

  return analysis
}
EOF
```

### テスト

```bash
cat > test-claude-analyzer.ts << 'EOF'
import 'dotenv/config'
import { analyzeCommits } from './src/claude/analyzer'

async function test() {
  const testCommits = [
    {
      repo: 'Gaku52/spark-vault',
      sha: 'abc123',
      message: 'Add iOS support with Capacitor',
      author: 'Gaku52',
      date: new Date().toISOString()
    },
    {
      repo: 'Gaku52/notion-zenn-editor',
      sha: 'def456',
      message: 'Fix typo in README',
      author: 'Gaku52',
      date: new Date().toISOString()
    }
  ]

  const summary = await analyzeCommits(testCommits)
  console.log('分析結果:')
  console.log(summary)
}

test().catch(console.error)
EOF

npx tsx test-claude-analyzer.ts
```

### ✅ 完了チェック

```
[ ] analyzeCommits が正しく動作
[ ] 分析結果が日本語で表示される
```

---

## 🗄️ Step 5-3: Supabase Client 作成（15分）

### src/supabase/client.ts

```bash
cat > src/supabase/client.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export interface WeeklyReport {
  week_start: string
  week_end: string
  total_commits: number
  summary: string
  notion_page_url?: string
}

export async function saveWeeklyReport(
  report: WeeklyReport
): Promise<{ id: string }> {
  console.log('💾 Supabase に保存中...')

  const { data, error } = await supabase
    .from('weekly_reports')
    .insert(report)
    .select()

  if (error) {
    throw new Error(`Supabase error: ${error.message}`)
  }

  console.log(`  ✓ 保存完了: ${data[0].id}\n`)

  return { id: data[0].id }
}

export async function updateNotionUrl(
  reportId: string,
  notionUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('weekly_reports')
    .update({ notion_page_url: notionUrl })
    .eq('id', reportId)

  if (error) {
    throw new Error(`Supabase update error: ${error.message}`)
  }
}
EOF
```

### テスト

```bash
cat > test-supabase-client.ts << 'EOF'
import 'dotenv/config'
import { saveWeeklyReport } from './src/supabase/client'

async function test() {
  const testReport = {
    week_start: '2025-11-09',
    week_end: '2025-11-16',
    total_commits: 10,
    summary: 'テストレポート'
  }

  const { id } = await saveWeeklyReport(testReport)
  console.log('保存されたID:', id)
}

test().catch(console.error)
EOF

npx tsx test-supabase-client.ts
```

### ✅ 完了チェック

```
[ ] saveWeeklyReport が正しく動作
[ ] Supabase に保存される
```

---

## 📤 Step 5-4: Notion Client 作成（15分）

### src/notion/client.ts

```bash
cat > src/notion/client.ts << 'EOF'
export interface NotionReport {
  date: string
  total_commits: number
  summary: string
}

export async function postToNotion(
  report: NotionReport
): Promise<{ url: string }> {
  console.log('📤 Notion に投稿中...')

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID
      },
      properties: {
        Name: {
          title: [{
            text: {
              content: `週次レポート - ${report.date}`
            }
          }]
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: '📊 今週の活動' } }]
          }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: `コミット数: ${report.total_commits}` }
            }]
          }
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: '📝 サマリー' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: report.summary }
            }]
          }
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Notion API error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  console.log(`  ✓ 投稿完了: ${data.url}\n`)

  return { url: data.url }
}
EOF
```

### テスト

```bash
cat > test-notion-client.ts << 'EOF'
import 'dotenv/config'
import { postToNotion } from './src/notion/client'

async function test() {
  const testReport = {
    date: new Date().toISOString().split('T')[0],
    total_commits: 5,
    summary: 'テスト投稿：2日目の実装中です。'
  }

  const { url } = await postToNotion(testReport)
  console.log('投稿URL:', url)
}

test().catch(console.error)
EOF

npx tsx test-notion-client.ts
```

### ✅ 完了チェック

```
[ ] postToNotion が正しく動作
[ ] Notion にページが作成される
```

---

## 🔗 Step 5-5: メイン処理作成（30分）

### src/index.ts

```bash
cat > src/index.ts << 'EOF'
import 'dotenv/config'
import { fetchWeeklyActivity } from './github/client'
import { analyzeCommits } from './claude/analyzer'
import { saveWeeklyReport, updateNotionUrl } from './supabase/client'
import { postToNotion } from './notion/client'

async function main() {
  console.log('=== 週次レポート生成開始 ===\n')
  const startTime = Date.now()

  try {
    // 1. 期間設定（過去7日間）
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    console.log(`期間: ${weekAgo.toLocaleDateString('ja-JP')} 〜 ${now.toLocaleDateString('ja-JP')}\n`)

    // 2. GitHub データ取得
    const { repos, commits } = await fetchWeeklyActivity(weekAgo, now)

    if (commits.length === 0) {
      console.log('今週のコミットはありませんでした。')
      return
    }

    // 3. Claude で分析
    const summary = await analyzeCommits(commits)

    // 4. レポート作成
    const report = {
      week_start: weekAgo.toISOString().split('T')[0],
      week_end: now.toISOString().split('T')[0],
      total_commits: commits.length,
      summary
    }

    // 5. Supabase に保存
    const { id: reportId } = await saveWeeklyReport(report)

    // 6. Notion に投稿
    const { url: notionUrl } = await postToNotion({
      date: report.week_end,
      total_commits: report.total_commits,
      summary: report.summary
    })

    // 7. Notion URL を Supabase に記録
    await updateNotionUrl(reportId, notionUrl)

    const duration = Date.now() - startTime
    console.log('=== 完了 ===')
    console.log(`所要時間: ${(duration / 1000).toFixed(1)}秒`)
    console.log(`Notion URL: ${notionUrl}`)

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error)
    throw error
  }
}

// 実行
if (require.main === module) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}

// Lambda 用のエクスポート（3日目で使用）
export { main as handler }
EOF
```

### package.json にスクリプト追加

```bash
# package.json の "scripts" セクションに追加
npm pkg set scripts.start="tsx src/index.ts"
npm pkg set scripts.build="tsc"
```

---

## 🚀 Step 5-6: 統合テスト（20分）

### 最終テスト実行

```bash
npm run start
```

### 期待される出力

```
=== 週次レポート生成開始 ===

期間: 2025/11/9 〜 2025/11/16

📥 GitHub データ取得中...
  ✓ 50個のリポジトリを取得
  ✓ spark-vault: 5件
  ✓ notion-zenn-editor: 3件
  ✓ github-activity-aggregator: 7件
  ✓ 合計 15件のコミット

🤖 Claude で分析中...
  ✓ 分析完了（150 tokens）

💾 Supabase に保存中...
  ✓ 保存完了: 123e4567-...

📤 Notion に投稿中...
  ✓ 投稿完了: https://www.notion.so/xxxxx

=== 完了 ===
所要時間: 12.3秒
Notion URL: https://www.notion.so/xxxxx
```

### Notion で確認

```
[ ] Notion を開く
[ ] 新しいページが作成されている
[ ] 今週のコミット数が正しい
[ ] Claude の分析結果が表示されている
```

### Supabase で確認

```
[ ] Supabase Dashboard → Table Editor
[ ] weekly_reports テーブルを開く
[ ] 新しいレコードが追加されている
[ ] notion_page_url が設定されている
```

---

## ✅ 2日目完了チェックリスト

```
[ ] src/github/client.ts 作成完了
[ ] src/claude/analyzer.ts 作成完了
[ ] src/supabase/client.ts 作成完了
[ ] src/notion/client.ts 作成完了
[ ] src/index.ts 作成完了
[ ] npm run start が成功
[ ] Notion にページが作成された
[ ] Supabase にデータが保存された
```

**すべてチェックがついたら2日目完了！**

---

## 🎉 ここまでの達成事項

- ✅ ローカル環境で完全に動作
- ✅ GitHub → Claude → Supabase → Notion の全フロー完成
- ✅ 手動実行で週次レポートが生成できる

---

## 📅 次回（3日目）の予告

**3日目の作業内容**:
- Lambda 用のコード修正
- Lambda 関数の作成
- IAM Role の設定
- Lambda へのデプロイ
- 手動実行テスト

**所要時間**: 2時間（21:00-23:00）

詳細は `IMPLEMENTATION_DAY3.md` を参照してください（次に作成します）。

---

## 💡 トラブルシューティング

### エラー: `Cannot find module`

```bash
# 依存関係を再インストール
npm install
```

### エラー: `GITHUB_TOKEN is not defined`

```bash
# .env ファイルを確認
cat .env

# 環境変数が正しく設定されているか確認
```

### エラー: `Notion API validation_error`

```
原因: NOTION_DATABASE_ID が間違っている
対処: Notion の Database ID を再確認
```

### コミット数が0の場合

```
原因: 過去7日間にコミットがない
対処: テスト用にコミットを作成するか、期間を延ばす
```

---

**2日目お疲れ様でした！次は Lambda デプロイです。**
