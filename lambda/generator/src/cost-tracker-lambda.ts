import { createClient } from '@supabase/supabase-js'

const HAIKU_INPUT_COST_PER_1M = 0.80
const HAIKU_OUTPUT_COST_PER_1M = 4.00

/**
 * Lambda関数用のコスト追跡ヘルパー
 * Supabaseに直接接続して記録
 */
export async function trackClaudeUsageInLambda(
  requestId: string,
  inputTokens: number,
  outputTokens: number,
  operationType: string
): Promise<void> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const inputCost = (inputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_1M
    const outputCost = (outputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_1M
    const totalCost = inputCost + outputCost

    // コスト記録
    const { error: trackError } = await supabase
      .from('claude_usage_history')
      .insert({
        request_id: requestId,
        model_id: 'claude-3-5-haiku-20241022',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        input_cost: inputCost,
        output_cost: outputCost,
        total_cost: totalCost,
        operation_type: operationType,
      })

    if (trackError) {
      console.error('[Lambda Cost Tracker] Failed to track usage:', trackError)
      return
    }

    // 残高更新
    const { data: balanceData, error: fetchError } = await supabase
      .from('credit_balance')
      .select('*')
      .limit(1)
      .single()

    if (fetchError || !balanceData) {
      console.warn('[Lambda Cost Tracker] No balance record found')
      return
    }

    const newBalance = Number(balanceData.balance) - totalCost

    const { error: updateError } = await supabase
      .from('credit_balance')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', balanceData.id)

    if (updateError) {
      console.error('[Lambda Cost Tracker] Failed to update balance:', updateError)
      return
    }

    console.log(
      `[Lambda Cost Tracker] Tracked: $${totalCost.toFixed(6)} | Balance: $${newBalance.toFixed(4)}`
    )
  } catch (error) {
    console.error('[Lambda Cost Tracker] Error:', error)
  }
}
