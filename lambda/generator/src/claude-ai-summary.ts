/**
 * Claude AI Summary Generator
 *
 * Claude APIを使用して、より自然で洗練された進捗記録を生成
 */

import Anthropic from '@anthropic-ai/sdk';

export interface CommitSummaryInput {
  date: string;
  commits: Array<{
    message: string;
    additions: number;
    deletions: number;
    files_changed: number;
    metadata?: {
      files?: Array<{
        filename: string;
        status: string;
        patch?: string;
      }>;
    };
  }>;
  technologies: string[];
  concepts: string[];
  features: string[];
}

export interface AISummaryResult {
  summary: string;
  usedTokens: {
    input: number;
    output: number;
  };
}

/**
 * Claude APIを使用して日毎の進捗記録を生成
 */
export async function generateDailySummaryWithClaude(
  input: CommitSummaryInput,
  apiKey: string
): Promise<AISummaryResult> {
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  // プロンプト構築
  const prompt = buildPrompt(input);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // コスト効率の良いHaikuを使用
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const summary = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return {
      summary: summary.trim(),
      usedTokens: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Claude API エラー:', error);
    throw error;
  }
}

/**
 * プロンプト構築
 */
function buildPrompt(input: CommitSummaryInput): string {
  const { date, commits, technologies, concepts, features } = input;

  // コミット情報の整理
  const totalAdditions = commits.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = commits.reduce((sum, c) => sum + c.deletions, 0);
  const totalFiles = commits.reduce((sum, c) => sum + c.files_changed, 0);

  // 主要なコミットメッセージ（最大5件）
  const mainCommits = commits
    .slice(0, 5)
    .map(c => c.message.split('\n')[0])
    .join('\n- ');

  // 変更されたファイルの例（最大10件）
  const changedFiles = commits
    .flatMap(c => c.metadata?.files?.map(f => f.filename) || [])
    .filter((f, i, arr) => arr.indexOf(f) === i)
    .slice(0, 10)
    .join(', ');

  return `あなたは開発者の学習記録を作成するアシスタントです。
以下のGitHub活動データから、その日の進捗を自然な日本語で要約してください。

# 日付
${date}

# コミット数
${commits.length}件

# 主なコミットメッセージ
- ${mainCommits}

# 使用技術
${technologies.join(', ') || 'なし'}

# 学んだ概念
${concepts.join(', ') || 'なし'}

# 実装した機能
${features.slice(0, 3).join('\n') || 'なし'}

# 変更統計
- 追加: +${totalAdditions}行
- 削除: -${totalDeletions}行
- ファイル: ${totalFiles}個

# 変更されたファイル例
${changedFiles || 'なし'}

# 出力形式
以下の形式で箇条書きで出力してください（体言止めを活用）：

**成果**
- [実装した機能や完了したタスク]
- [達成した目標]

**技術習得**
- [学んだ技術や概念（具体的に）]
- [理解したパターンや手法]

**トラブル解決**（該当する場合のみ）
- 💡 [エラー名や問題]
  - 原因: [根本原因]
  - 解決: [対処方法]

# 注意事項
- 体言止めを使用（例: 「〜を実装」「〜を習得」「〜を解決」）
- 1項目は20文字以内を目安に簡潔に
- 技術名は具体的に記載
- トラブル解決は "fix", "bug", "error" を含むコミットがある場合のみ記載

進捗記録:
`;
}

/**
 * Claude APIが利用可能かチェック
 */
export function isClaudeAPIAvailable(): boolean {
  return !!process.env.CLAUDE_API_KEY;
}

/**
 * 週次サマリーをClaude APIで生成
 */
export async function generateWeeklySummaryWithClaude(
  dailySummaries: Array<{ date: string; summary: string }>,
  weekSummary: {
    total_commits: number;
    total_lines: number;
    main_technologies: string[];
    key_learnings: string[];
    achievements: string[];
  },
  apiKey: string
): Promise<AISummaryResult> {
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const prompt = `あなたは開発者の週次レポートを作成するアシスタントです。
以下の情報から、今週の学習・開発活動を総括してください。

# 今週の統計
- 総コミット数: ${weekSummary.total_commits}
- 総変更行数: ${weekSummary.total_lines}
- 主要技術: ${weekSummary.main_technologies.join(', ')}

# 日毎の活動
${dailySummaries.map(d => `**${d.date}**\n${d.summary}`).join('\n\n')}

# 今週の学び
${weekSummary.key_learnings.join(', ')}

# 今週の成果
${weekSummary.achievements.slice(0, 5).join('\n')}

# 要件
- 3-5文程度で今週の活動を総括してください
- 技術的な成長や達成した目標を強調してください
- 来週への示唆があれば含めてください
- ポジティブで前向きなトーンで記述してください

週次総括:`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 700,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const summary = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return {
      summary: summary.trim(),
      usedTokens: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Claude API エラー (週次サマリー):', error);
    throw error;
  }
}
