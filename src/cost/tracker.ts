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

export interface ClaudeUsageRecord {
  requestId: string
  modelId: string
  inputTokens: number
  outputTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  operationType?: string
  metadata?: Record<string, any>
}

export interface CostReport {
  period: string
  startDate: Date
  endDate: Date
  totalCost: number
  modelBreakdown: Record<
    string,
    {
      requests: number
      inputTokens: number
      outputTokens: number
      totalCost: number
    }
  >
  thresholdExceeded?: boolean
  threshold?: number
  creditBalance?: number
  remainingBalance?: number
}

/**
 * Claude API使用状況をデータベースに記録
 */
export async function trackClaudeUsage(
  usage: ClaudeUsageRecord
): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from('claude_usage_history')
      .insert({
        request_id: usage.requestId,
        model_id: usage.modelId,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        input_cost: usage.inputCost,
        output_cost: usage.outputCost,
        total_cost: usage.totalCost,
        operation_type: usage.operationType,
        metadata: usage.metadata,
      })

    if (error) {
      console.error('[Cost Tracker] Failed to track usage:', error)
      throw new Error(`Failed to track usage: ${error.message}`)
    }

    console.log(
      `[Cost Tracker] Recorded: ${usage.modelId} - $${usage.totalCost.toFixed(6)}`
    )
  } catch (error) {
    console.error('[Cost Tracker] Error:', error)
    throw error
  }
}

/**
 * クレジット残高から使用コストを差し引く
 */
export async function deductCreditBalance(amount: number): Promise<number> {
  try {
    // 現在の残高を取得
    const { data: balanceData, error: fetchError } = await getSupabase()
      .from('credit_balance')
      .select('*')
      .limit(1)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = row not found
      throw new Error(`Failed to fetch balance: ${fetchError.message}`)
    }

    if (!balanceData) {
      console.warn('[Cost Tracker] No balance record found, skipping deduction')
      return 0
    }

    const newBalance = Number(balanceData.balance) - amount

    // 残高を更新
    const { error: updateError } = await getSupabase()
      .from('credit_balance')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', balanceData.id)

    if (updateError) {
      throw new Error(`Failed to update balance: ${updateError.message}`)
    }

    console.log(
      `[Cost Tracker] Balance updated: $${balanceData.balance} → $${newBalance.toFixed(4)}`
    )

    // 残高が少なくなったら警告
    const alertThreshold = parseFloat(
      process.env.CREDIT_ALERT_THRESHOLD || '20'
    )
    if (newBalance < alertThreshold && newBalance >= 0) {
      console.warn(
        `⚠️  [Cost Tracker] Low balance warning: $${newBalance.toFixed(2)} remaining`
      )
    } else if (newBalance < 0) {
      console.error(
        `🚨 [Cost Tracker] Balance depleted: $${newBalance.toFixed(2)}`
      )
    }

    return newBalance
  } catch (error) {
    console.error('[Cost Tracker] Error deducting balance:', error)
    throw error
  }
}

/**
 * 指定期間のコスト合計を取得
 */
export async function getTotalCostByDateRange(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const { data, error } = await getSupabase()
    .from('claude_usage_history')
    .select('total_cost')
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())

  if (error) {
    throw new Error(`Failed to get total cost: ${error.message}`)
  }

  return data.reduce((sum, record) => sum + Number(record.total_cost), 0)
}

/**
 * 指定期間のモデル別使用状況を取得
 */
export async function getUsageByModel(
  startDate: Date,
  endDate: Date
): Promise<
  Record<
    string,
    {
      requests: number
      inputTokens: number
      outputTokens: number
      totalCost: number
    }
  >
> {
  const { data, error } = await getSupabase()
    .from('claude_usage_history')
    .select('*')
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())

  if (error) {
    throw new Error(`Failed to get usage by model: ${error.message}`)
  }

  const breakdown: Record<
    string,
    {
      requests: number
      inputTokens: number
      outputTokens: number
      totalCost: number
    }
  > = {}

  for (const record of data) {
    const modelId = record.model_id
    if (!breakdown[modelId]) {
      breakdown[modelId] = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      }
    }
    breakdown[modelId].requests++
    breakdown[modelId].inputTokens += record.input_tokens
    breakdown[modelId].outputTokens += record.output_tokens
    breakdown[modelId].totalCost += Number(record.total_cost)
  }

  return breakdown
}

/**
 * 現在のクレジット残高を取得
 */
export async function getCurrentBalance(): Promise<number> {
  const { data, error } = await getSupabase()
    .from('credit_balance')
    .select('balance')
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get balance: ${error.message}`)
  }

  return data ? Number(data.balance) : 0
}

/**
 * コスト閾値を確認してアラートが必要か判定
 */
export async function checkCostThresholds(
  period: 'daily' | 'weekly' | 'monthly',
  currentCost: number
): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('cost_thresholds')
    .select('*')
    .eq('period', period)
    .eq('enabled', true)
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[Cost Tracker] Failed to check threshold:', error)
    return false
  }

  if (!data) {
    return false
  }

  return currentCost > Number(data.threshold_amount)
}

/**
 * 初期クレジット残高を設定（環境変数から）
 */
export async function initializeCreditBalance(): Promise<void> {
  const creditBalance = parseFloat(process.env.CREDIT_BALANCE || '0')

  if (creditBalance <= 0) {
    console.log('[Cost Tracker] CREDIT_BALANCE not set, skipping initialization')
    return
  }

  try {
    // 既存のレコードをチェック
    const { data: existing } = await getSupabase()
      .from('credit_balance')
      .select('*')
      .limit(1)
      .single()

    if (existing) {
      console.log(
        `[Cost Tracker] Credit balance already initialized: $${existing.balance}`
      )
      return
    }

    // 新規作成
    const { error } = await getSupabase()
      .from('credit_balance')
      .insert({
        balance: creditBalance,
        initial_balance: creditBalance,
        last_recharge_at: new Date().toISOString(),
      })

    if (error && error.code !== '23505') {
      // 23505 = unique violation
      throw new Error(`Failed to initialize balance: ${error.message}`)
    }

    console.log(
      `[Cost Tracker] Credit balance initialized: $${creditBalance.toFixed(2)}`
    )
  } catch (error) {
    console.error('[Cost Tracker] Error initializing balance:', error)
  }
}
