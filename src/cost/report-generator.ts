import {
  getTotalCostByDateRange,
  getUsageByModel,
  getCurrentBalance,
  CostReport,
} from './tracker'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
  }
  return supabase
}

/**
 * 日次レポートを生成
 */
export async function generateDailyReport(): Promise<CostReport> {
  const now = new Date()
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  )
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  )

  const totalCost = await getTotalCostByDateRange(startDate, endDate)
  const modelBreakdown = await getUsageByModel(startDate, endDate)

  // 月初から今日までの使用料を計算
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
  const monthToDate = await getTotalCostByDateRange(monthStart, endDate)

  // クレジット残高を取得
  const { data: balanceData } = await getSupabase()
    .from('credit_balance')
    .select('balance, initial_balance')
    .limit(1)
    .single()

  const creditBalance = balanceData ? Number(balanceData.balance) : undefined
  const initialBalance = balanceData
    ? Number(balanceData.initial_balance)
    : undefined

  // 残高計算（初期残高 - 今月の使用料）
  const remainingBalance =
    creditBalance !== undefined
      ? Number((initialBalance! - monthToDate).toFixed(4))
      : undefined

  // 閾値チェック
  const { data: thresholdData } = await getSupabase()
    .from('cost_thresholds')
    .select('threshold_amount')
    .eq('period', 'daily')
    .eq('enabled', true)
    .limit(1)
    .single()

  const threshold = thresholdData
    ? Number(thresholdData.threshold_amount)
    : undefined

  return {
    period: `日次レポート - ${startDate.toLocaleDateString('ja-JP')}`,
    startDate,
    endDate,
    totalCost,
    modelBreakdown,
    thresholdExceeded: threshold ? totalCost > threshold : false,
    threshold,
    creditBalance,
    remainingBalance,
  }
}

/**
 * 週次レポートを生成
 */
export async function generateWeeklyReport(): Promise<CostReport> {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // 月曜始まり
  const startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    diff + 6,
    23,
    59,
    59
  )

  const totalCost = await getTotalCostByDateRange(startDate, endDate)
  const modelBreakdown = await getUsageByModel(startDate, endDate)

  const { data: thresholdData } = await getSupabase()
    .from('cost_thresholds')
    .select('threshold_amount')
    .eq('period', 'weekly')
    .eq('enabled', true)
    .limit(1)
    .single()

  const threshold = thresholdData
    ? Number(thresholdData.threshold_amount)
    : undefined

  return {
    period: `週次レポート - ${startDate.toLocaleDateString('ja-JP')}の週`,
    startDate,
    endDate,
    totalCost,
    modelBreakdown,
    thresholdExceeded: threshold ? totalCost > threshold : false,
    threshold,
  }
}

/**
 * 月次レポートを生成
 */
export async function generateMonthlyReport(): Promise<CostReport> {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  )

  const totalCost = await getTotalCostByDateRange(startDate, endDate)
  const modelBreakdown = await getUsageByModel(startDate, endDate)

  const { data: thresholdData } = await getSupabase()
    .from('cost_thresholds')
    .select('threshold_amount')
    .eq('period', 'monthly')
    .eq('enabled', true)
    .limit(1)
    .single()

  const threshold = thresholdData
    ? Number(thresholdData.threshold_amount)
    : undefined

  return {
    period: `月次レポート - ${startDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}`,
    startDate,
    endDate,
    totalCost,
    modelBreakdown,
    thresholdExceeded: threshold ? totalCost > threshold : false,
    threshold,
  }
}

/**
 * レポートをテキスト形式にフォーマット
 */
export function formatReportAsText(report: CostReport): string {
  let text = `
Claude API 使用状況レポート
${report.period}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`

  if (Object.keys(report.modelBreakdown).length === 0) {
    text += 'この期間中にAPIの使用はありませんでした。\n'
  } else {
    for (const [modelId, stats] of Object.entries(report.modelBreakdown)) {
      text += `
モデル: ${modelId}
リクエスト数: ${stats.requests.toLocaleString()}

入力トークン:  ${stats.inputTokens.toLocaleString()}
出力トークン: ${stats.outputTokens.toLocaleString()}
コスト:        $${stats.totalCost.toFixed(4)}

`
    }
  }

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
合計コスト: $${report.totalCost.toFixed(4)}
`

  if (report.threshold) {
    text += `閾値:       $${report.threshold.toFixed(2)}\n`
    if (report.thresholdExceeded) {
      text += `
⚠️  警告: 閾値を $${(report.totalCost - report.threshold).toFixed(4)} 超過しています
`
    }
  }

  if (report.remainingBalance !== undefined) {
    text += `
残りクレジット: $${report.remainingBalance.toFixed(2)}
`
  }

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`

  return text
}

/**
 * レポートをHTML形式にフォーマット
 */
export function formatReportAsHTML(report: CostReport): string {
  let modelRows = ''

  if (Object.keys(report.modelBreakdown).length === 0) {
    modelRows =
      '<tr><td colspan="4">この期間中にAPIの使用はありませんでした。</td></tr>'
  } else {
    for (const [modelId, stats] of Object.entries(report.modelBreakdown)) {
      modelRows += `
      <tr>
        <td>${modelId}</td>
        <td>${stats.requests.toLocaleString()}</td>
        <td>${stats.inputTokens.toLocaleString()} / ${stats.outputTokens.toLocaleString()}</td>
        <td>$${stats.totalCost.toFixed(4)}</td>
      </tr>
      `
    }
  }

  const thresholdWarning = report.thresholdExceeded
    ? `
    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px;">
      <strong>⚠️ 警告:</strong> 閾値を $${(report.totalCost - (report.threshold || 0)).toFixed(4)} 超過しています
    </div>
  `
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: 600; }
    .total { font-size: 18px; font-weight: 600; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Claude API 使用状況レポート</h1>
  <p><strong>${report.period}</strong></p>

  <table>
    <thead>
      <tr>
        <th>モデル</th>
        <th>リクエスト数</th>
        <th>入力 / 出力トークン</th>
        <th>コスト</th>
      </tr>
    </thead>
    <tbody>
      ${modelRows}
    </tbody>
  </table>

  <div class="total">
    合計コスト: $${report.totalCost.toFixed(4)}
    ${report.threshold ? `<br>閾値: $${report.threshold.toFixed(2)}` : ''}
    ${report.remainingBalance !== undefined ? `<br><br>残りクレジット: $${report.remainingBalance.toFixed(2)}` : ''}
  </div>

  ${thresholdWarning}

  <p style="margin-top: 30px; color: #666; font-size: 14px;">
    生成日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
  </p>
</body>
</html>
  `
}
