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

export async function updateNotionUrl(
  reportId: string,
  notionUrl: string
): Promise<void> {
  const { error } = await getSupabase()
    .from('weekly_reports')
    .update({ notion_page_url: notionUrl })
    .eq('id', reportId)

  if (error) {
    throw new Error(`Supabase update error: ${error.message}`)
  }
}
