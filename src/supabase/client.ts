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

export interface WeeklyReport {
  week_start: string
  week_end: string
  total_commits: number
  summary: string
  notion_page_url?: string
}

export interface DailyReport {
  date: string
  total_commits: number
  summary: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  estimated_cost: number
  notion_page_url?: string
}

export async function saveWeeklyReport(
  report: WeeklyReport
): Promise<{ id: string }> {
  console.log('💾 Supabase に保存中...')

  const { data, error } = await getSupabase()
    .from('weekly_reports')
    .insert(report)
    .select()

  if (error) {
    throw new Error(`Supabase error: ${error.message}`)
  }

  console.log(`  ✓ 保存完了: ${data[0].id}\n`)

  return { id: data[0].id }
}

export async function saveDailyReport(
  report: DailyReport
): Promise<{ id: string }> {
  console.log('💾 Supabase に保存中...')

  // 既存のレコードがあるか確認
  const { data: existing } = await getSupabase()
    .from('daily_reports')
    .select('id')
    .eq('date', report.date)
    .single()

  let data, error

  if (existing) {
    // 更新
    const result = await getSupabase()
      .from('daily_reports')
      .update(report)
      .eq('date', report.date)
      .select()
    data = result.data
    error = result.error
    console.log(`  ✓ 更新完了: ${data?.[0]?.id}\n`)
  } else {
    // 新規作成
    const result = await getSupabase()
      .from('daily_reports')
      .insert(report)
      .select()
    data = result.data
    error = result.error
    console.log(`  ✓ 保存完了: ${data?.[0]?.id}\n`)
  }

  if (error) {
    console.error('Supabase error details:', JSON.stringify(error, null, 2))
    throw new Error(`Supabase error: ${error.message}`)
  }

  if (!data || data.length === 0) {
    console.error('Supabase: No data returned. Result:', { data, error })
    throw new Error('Supabase: No data returned')
  }

  return { id: data[0].id }
}

export async function updateNotionUrl(
  reportId: string,
  notionUrl: string,
  reportType: 'weekly' | 'daily' = 'weekly'
): Promise<void> {
  const tableName = reportType === 'weekly' ? 'weekly_reports' : 'daily_reports'

  const { error } = await getSupabase()
    .from(tableName)
    .update({ notion_page_url: notionUrl })
    .eq('id', reportId)

  if (error) {
    throw new Error(`Supabase update error: ${error.message}`)
  }
}
