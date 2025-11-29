import 'dotenv/config'
import { fetchWeeklyActivity, calculateWorkingHours, categorizeStatus } from './github/client'
import { analyzeCommits } from './claude/analyzer'
import { saveDailyReport, updateNotionUrl } from './supabase/client'
import { postDailyToNotion } from './notion/client'

async function main() {
  console.log('=== 日次記録生成開始 ===\n')
  const startTime = Date.now()

  try {
    // 1. 期間設定（今日1日分）
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    console.log(`日付: ${today.toLocaleDateString('ja-JP')}（本日分）\n`)

    // 2. GitHub データ取得
    const { repos, commits } = await fetchWeeklyActivity(today, tomorrow)

    if (commits.length === 0) {
      console.log('本日のコミットはありませんでした。')
      return
    }

    // 3. GitHubから情報を推定
    const workingHours = calculateWorkingHours(commits)
    const status = categorizeStatus(commits)

    console.log(`\n📊 推定情報:`)
    console.log(`  作業時間: ${workingHours}時間`)
    console.log(`  ステータス: ${status}\n`)

    // 4. Claude で分析
    const analysisResult = await analyzeCommits(commits)

    // 5. レポート作成
    const report = {
      date: today.toISOString().split('T')[0],
      total_commits: commits.length,
      summary: analysisResult.summary,
      input_tokens: analysisResult.inputTokens,
      output_tokens: analysisResult.outputTokens,
      total_tokens: analysisResult.totalTokens,
      estimated_cost: analysisResult.estimatedCost
    }

    // 6. Supabase に保存（一時的にスキップ）
    // const { id: reportId } = await saveDailyReport(report)
    const reportId = 'temp-id' // 一時的なID

    // 7. Notion に投稿
    const { url: notionUrl } = await postDailyToNotion({
      date: report.date,
      total_commits: report.total_commits,
      summary: report.summary,
      tokens: report.total_tokens,
      cost: report.estimated_cost,
      workingHours,
      status,
      categories: analysisResult.categories
    })

    // 8. Notion URL を Supabase に記録（一時的にスキップ）
    // await updateNotionUrl(reportId, notionUrl, 'daily')

    const duration = Date.now() - startTime
    console.log('=== 完了 ===')
    console.log(`所要時間: ${(duration / 1000).toFixed(1)}秒`)
    console.log(`Notion URL: ${notionUrl}`)
    console.log(`\n💰 Claude API 使用量:`)
    console.log(`  Input tokens: ${analysisResult.inputTokens.toLocaleString()}`)
    console.log(`  Output tokens: ${analysisResult.outputTokens.toLocaleString()}`)
    console.log(`  Total tokens: ${analysisResult.totalTokens.toLocaleString()}`)
    console.log(`  Cost: $${analysisResult.estimatedCost.toFixed(6)} (約¥${(analysisResult.estimatedCost * 150).toFixed(2)})`)

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

// Lambda 用のエクスポート
export { main as handler }
