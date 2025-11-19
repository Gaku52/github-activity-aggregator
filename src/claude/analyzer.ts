import Anthropic from '@anthropic-ai/sdk'
import { Commit } from '../github/client'

export async function analyzeCommits(commits: Commit[]): Promise<string> {
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
      content: `以下のコミットを分析し、今週の開発内容を簡潔にまとめてください。

【コミット一覧】
${commitList}

【出力形式】
- 3-5行程度
- 主な成果と技術的なポイント
- 日本語で
- 箇条書きで`
    }]
  })

  const textBlock = message.content[0]
  const analysis = textBlock.type === 'text' ? textBlock.text : ''

  console.log(`  ✓ 分析完了（${message.usage.input_tokens + message.usage.output_tokens} tokens）\n`)

  return analysis
}
