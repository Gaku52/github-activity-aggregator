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
