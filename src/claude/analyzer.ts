import Anthropic from '@anthropic-ai/sdk'
import { Commit } from '../github/client'
import { trackClaudeUsage, deductCreditBalance } from '../cost/tracker'

export interface AnalysisResult {
  summary: string
  categories: string[] // 抽出されたカテゴリ一覧
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number // USD
}

// Claude 3.5 Haiku の料金（2024年10月時点）
// Input: $0.80 / 1M tokens
// Output: $4.00 / 1M tokens
const HAIKU_INPUT_COST_PER_1M = 0.80
const HAIKU_OUTPUT_COST_PER_1M = 4.00

function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_1M
  const outputCost = (outputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_1M
  return inputCost + outputCost
}

export async function analyzeCommits(commits: Commit[]): Promise<AnalysisResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY!
  })

  console.log('🤖 Claude で分析中...')

  const commitList = commits.map(c =>
    `- [${c.repo}] ${c.message.split('\n')[0]}`
  ).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `以下のコミットを分析し、学習内容を詳細にまとめてください。

【コミット一覧】
${commitList}

【分析項目】
1. 各コミットの内容を具体的に記載
2. カテゴリを推定（実装/学習/バグ修正/リファクタリング/ドキュメント/テスト/設定）
3. 学んだ技術や概念
4. 実装の難易度や工数の推定

【出力形式】
各コミットについて以下の形式で出力:
- [カテゴリ] 具体的な内容: 詳細説明や学んだこと

例:
- [実装] トークン使用量計算機能を追加: Claude APIのusageオブジェクトから入出力トークン数を取得し、料金計算ロジックを実装
- [学習] TypeScriptのインターフェース設計: 戻り値の型定義を厳密化し、型安全性を向上
- [バグ修正] Supabaseのupsert処理を修正: 既存レコードの重複エラーを解決

日本語で、箇条書き形式で出力してください。`
    }]
  })

  const textBlock = message.content[0]
  const summary = textBlock.type === 'text' ? textBlock.text : ''

  // カテゴリを抽出（[カテゴリ]の部分）
  const categoryMatches = summary.matchAll(/\[([^\]]+)\]/g)
  const categories = Array.from(new Set(
    Array.from(categoryMatches).map(match => match[1])
  ))

  const inputTokens = message.usage.input_tokens
  const outputTokens = message.usage.output_tokens
  const totalTokens = inputTokens + outputTokens
  const estimatedCost = calculateCost(inputTokens, outputTokens)

  console.log(`  ✓ 分析完了`)
  console.log(`    - Input tokens: ${inputTokens.toLocaleString()}`)
  console.log(`    - Output tokens: ${outputTokens.toLocaleString()}`)
  console.log(`    - Total tokens: ${totalTokens.toLocaleString()}`)
  console.log(`    - Estimated cost: $${estimatedCost.toFixed(6)} (¥${(estimatedCost * 150).toFixed(2)})`)
  console.log(`    - Categories: ${categories.join(', ')}\n`)

  // コスト追跡をデータベースに記録
  try {
    await trackClaudeUsage({
      requestId: message.id,
      modelId: 'claude-3-5-haiku-20241022',
      inputTokens,
      outputTokens,
      inputCost: (inputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_1M,
      outputCost: (outputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_1M,
      totalCost: estimatedCost,
      operationType: 'analyze_commits',
      metadata: { commitCount: commits.length, categories },
    })

    // クレジット残高から差し引く
    await deductCreditBalance(estimatedCost)
  } catch (error) {
    console.error('[Analyzer] Failed to track cost:', error)
    // エラーでも分析結果は返す
  }

  return {
    summary,
    categories,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost
  }
}
