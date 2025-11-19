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

        allCommits.push(...commits.map((c: any) => ({
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
