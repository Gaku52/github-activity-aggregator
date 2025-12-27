#!/usr/bin/env node
/**
 * コスト レポート送信CLI
 *
 * Usage:
 *   npm run cost:report daily
 *   npm run cost:report weekly
 *   npm run cost:report monthly
 */

import * as dotenv from 'dotenv'
import { sendDailyReport, sendWeeklyReport, sendMonthlyReport } from './email/notifier'
import { initializeCreditBalance } from './cost/tracker'

dotenv.config()

async function main() {
  const reportType = process.argv[2] || 'daily'

  console.log(`\n📊 Claude API Cost Report (${reportType})`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // クレジット残高の初期化（初回のみ）
  await initializeCreditBalance()

  try {
    switch (reportType) {
      case 'daily':
        await sendDailyReport()
        break
      case 'weekly':
        await sendWeeklyReport()
        break
      case 'monthly':
        await sendMonthlyReport()
        break
      default:
        console.error(`Unknown report type: ${reportType}`)
        console.log('Available types: daily, weekly, monthly')
        process.exit(1)
    }

    console.log('\n✅ レポートの送信が完了しました\n')
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

main()
