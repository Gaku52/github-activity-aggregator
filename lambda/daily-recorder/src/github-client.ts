export interface Commit {
  repo: string
  sha: string
  message: string
  author: string
  date: string
  additions?: number
  deletions?: number
  timestamp?: number
}

export function calculateWorkingHours(commits: Commit[]): number {
  if (commits.length === 0) return 0

  // コミット時刻でソート
  const sortedCommits = [...commits].sort((a, b) => {
    const dateA = a.timestamp || new Date(a.date).getTime()
    const dateB = b.timestamp || new Date(b.date).getTime()
    return dateA - dateB
  })

  // 最初と最後のコミット時刻から作業時間を推定
  const firstCommit = sortedCommits[0]
  const lastCommit = sortedCommits[sortedCommits.length - 1]

  const firstTime = firstCommit.timestamp || new Date(firstCommit.date).getTime()
  const lastTime = lastCommit.timestamp || new Date(lastCommit.date).getTime()

  const diffMs = lastTime - firstTime
  const diffHours = diffMs / (1000 * 60 * 60)

  // 最低30分、最大8時間とする
  if (diffHours < 0.5) return 0.5
  if (diffHours > 8) return 8

  return Math.round(diffHours * 10) / 10 // 小数第1位まで
}

export function categorizeStatus(commits: Commit[]): string {
  // コミットメッセージから進捗状況を推定
  const messages = commits.map(c => c.message.toLowerCase())

  const hasWIP = messages.some(m => m.includes('wip') || m.includes('work in progress'))
  const hasTODO = messages.some(m => m.includes('todo') || m.includes('fixme'))
  const hasComplete = messages.some(m =>
    m.includes('complete') ||
    m.includes('done') ||
    m.includes('finish') ||
    m.includes('実装完了') ||
    m.includes('完了')
  )

  if (hasComplete) return '完了'
  if (hasWIP || hasTODO) return '進行中'
  return '実装中'
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

  const repos = await reposResponse.json() as any[]
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

      const commits = await commitsResponse.json() as any[]

      if (Array.isArray(commits) && commits.length > 0) {
        console.log(`  ✓ ${repo.name}: ${commits.length}件`)

        allCommits.push(...commits.map((c: any) => ({
          repo: repo.full_name,
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author.name,
          date: c.commit.author.date,
          timestamp: new Date(c.commit.author.date).getTime()
        })))
      }
    } catch (error) {
      console.log(`  ⚠️  ${repo.name}: エラー（スキップ）`)
    }
  }

  console.log(`  ✓ 合計 ${allCommits.length}件のコミット\n`)

  return { repos, commits: allCommits }
}
