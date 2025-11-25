import { Handler } from 'aws-lambda'
import { fetchWeeklyActivity, calculateWorkingHours, categorizeStatus } from './github-client'
import { analyzeCommits } from './claude-analyzer'
import { saveDailyReport, updateNotionUrl } from './supabase-client'
import { postDailyToNotion } from './notion-client'

export const handler: Handler = async (event, context) => {
  console.log('=== 日次記録生成開始 ===')
  console.log('Event:', JSON.stringify(event, null, 2))

  const startTime = Date.now()

  try {
    // 環境変数チェック
    const requiredEnvVars = [
      'GITHUB_TOKEN',
      'GITHUB_USERNAME',
      'CLAUDE_API_KEY',
      'NOTION_API_KEY',
      'NOTION_DATABASE_ID',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY'
    ]

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing environment variable: ${varName}`)
      }
    }

    // 1. 期間設定（今日1日分）
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    console.log(`日付: ${today.toLocaleDateString('ja-JP')}`)

    // 2. GitHub データ取得
    const { commits } = await fetchWeeklyActivity(today, tomorrow)

    if (commits.length === 0) {
      console.log('今日のコミットはありませんでした。')
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No commits today',
          date: today.toISOString().split('T')[0]
        })
      }
    }

    // 3. GitHubから情報を推定
    const workingHours = calculateWorkingHours(commits)
    const status = categorizeStatus(commits)

    console.log('推定情報:')
    console.log(`  作業時間: ${workingHours}時間`)
    console.log(`  ステータス: ${status}`)

    // 4. Claude で分析
    const analysisResult = await analyzeCommits(commits)

    console.log('分析完了:')
    console.log(`  Total tokens: ${analysisResult.totalTokens}`)
    console.log(`  Cost: $${analysisResult.estimatedCost.toFixed(6)}`)
    console.log(`  Categories: ${analysisResult.categories.join(', ')}`)

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
    const reportId = 'temp-id'

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

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily report generated successfully',
        date: report.date,
        commits: report.total_commits,
        workingHours,
        status,
        categories: analysisResult.categories,
        tokens: report.total_tokens,
        cost: report.estimated_cost,
        notionUrl,
        duration: duration / 1000
      })
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error generating daily report',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}
