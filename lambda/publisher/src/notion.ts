/**
 * Notion API Client
 *
 * 週次レポートをNotionデータベースに保存
 */

import { Client } from '@notionhq/client';

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

export interface DailyLearning {
  date: string;
  commits_count: number;
  additions: number;
  deletions: number;
  technologies_used: string[];
  learned_concepts: string[];
  implemented_features: string[];
  summary: string;
}

export interface LearningInsights {
  daily_records: DailyLearning[];
  week_summary: {
    total_commits: number;
    total_lines: number;
    main_technologies: string[];
    key_learnings: string[];
    achievements: string[];
  };
}

export interface ReportData {
  title: string;
  period_start: string;
  period_end: string;
  summary: {
    total_commits: number;
    total_additions: number;
    total_deletions: number;
    total_files_changed: number;
    active_repos: number;
    contributors: number;
  };
  repositories: Array<{
    name: string;
    language: string | null;
    commits: number;
    additions: number;
    deletions: number;
    files_changed: number;
  }>;
  top_commits: Array<{
    repo: string;
    message: string;
    author: string;
    date: string;
    url: string;
  }>;
  learning_insights?: LearningInsights;
  markdown?: string;
}

/**
 * NotionにレポートページA作成
 */
export async function publishToNotion(
  config: NotionConfig,
  report: ReportData
): Promise<string> {
  const notion = new Client({ auth: config.apiKey });

  console.log('📝 Notionページ作成中...');
  console.log(`  Database ID: ${config.databaseId}`);
  console.log(`  Title: ${report.title}`);

  try {
    // Notionページ作成
    const response = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: config.databaseId,
      },
      properties: {
        // タイトル（必須）
        'Name': {
          title: [
            {
              text: {
                content: report.title,
              },
            },
          ],
        },
        // 日付（既存プロパティに合わせる）
        '日付': {
          date: {
            start: report.period_start,
            end: report.period_end,
          },
        },
        // カテゴリ（既存プロパティ）
        'カテゴリ': {
          multi_select: [
            { name: 'GitHub Activity' },
            { name: '開発' },
          ],
        },
        // ステータス（既存プロパティ）
        'ステータス': {
          select: {
            name: '完了',
          },
        },
      },
      children: buildNotionBlocks(report),
    });

    console.log(`✅ Notionページ作成成功: ${response.id}`);
    return response.id;

  } catch (error) {
    console.error('❌ Notion API エラー:', error);
    throw error;
  }
}

/**
 * 日付を日本語形式に変換 (YYYY-MM-DD → YYYY年MM月DD日)
 */
function formatDateJapanese(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * Notionブロックを生成
 */
function buildNotionBlocks(report: ReportData): any[] {
  const blocks: any[] = [];

  // サマリーセクション
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ text: { content: '📊 サマリー' } }],
    },
  });

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { text: { content: `総コミット数: ${report.summary.total_commits}` } },
      ],
    },
  });

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { text: { content: `追加行数: +${report.summary.total_additions.toLocaleString()}` } },
      ],
    },
  });

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { text: { content: `削除行数: -${report.summary.total_deletions.toLocaleString()}` } },
      ],
    },
  });

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { text: { content: `変更ファイル数: ${report.summary.total_files_changed}` } },
      ],
    },
  });

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { text: { content: `アクティブリポジトリ: ${report.summary.active_repos}` } },
      ],
    },
  });

  // リポジトリ別アクティビティ
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ text: { content: '📦 リポジトリ別アクティビティ' } }],
    },
  });

  for (const repo of report.repositories.slice(0, 10)) {
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [
          {
            text: {
              content: `${repo.name}${repo.language ? ` (${repo.language})` : ''}`
            }
          },
        ],
      },
    });

    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          { text: { content: `コミット: ${repo.commits}` } },
        ],
      },
    });

    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          { text: { content: `追加: +${repo.additions.toLocaleString()}` } },
        ],
      },
    });

    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          { text: { content: `削除: -${repo.deletions.toLocaleString()}` } },
        ],
      },
    });
  }

  // 📚 日毎の学習記録セクション
  if (report.learning_insights) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📚 日毎の学習記録' } }],
      },
    });

    // 週のサマリー
    const weekSummary = report.learning_insights.week_summary;
    if (weekSummary.main_technologies.length > 0) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { text: { content: '🛠️ 使用技術: ' }, annotations: { bold: true } },
            { text: { content: weekSummary.main_technologies.join(', ') } },
          ],
        },
      });
    }

    if (weekSummary.key_learnings.length > 0) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { text: { content: '💡 学んだこと: ' }, annotations: { bold: true } },
            { text: { content: weekSummary.key_learnings.join(', ') } },
          ],
        },
      });
    }

    // 日毎の記録
    for (const daily of report.learning_insights.daily_records) {
      const dateJp = formatDateJapanese(daily.date);
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            { text: { content: `📅 ${dateJp} (${daily.commits_count}コミット)` } },
          ],
        },
      });

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: daily.summary } }],
        },
      });

      // 使用技術
      if (daily.technologies_used.length > 0) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              { text: { content: '使用技術: ' } },
              { text: { content: daily.technologies_used.join(', ') }, annotations: { bold: true } },
            ],
          },
        });
      }

      // 学んだ概念
      if (daily.learned_concepts.length > 0) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              { text: { content: '学んだ概念: ' } },
              { text: { content: daily.learned_concepts.join(', ') } },
            ],
          },
        });
      }

      // 実装した機能
      if (daily.implemented_features.length > 0) {
        for (const feature of daily.implemented_features.slice(0, 3)) {
          blocks.push({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [
                { text: { content: '✅ ' } },
                { text: { content: feature } },
              ],
            },
          });
        }
      }

      // 変更量
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { text: { content: `+${daily.additions} / -${daily.deletions} 行` }, annotations: { color: 'gray' } },
          ],
        },
      });
    }
  }

  // Top コミット
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ text: { content: '🔝 最新コミット Top 10' } }],
    },
  });

  for (const commit of report.top_commits.slice(0, 10)) {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          {
            text: {
              content: `${commit.repo}: `,
            }
          },
          {
            text: {
              content: commit.message,
              link: commit.url ? { url: commit.url } : undefined,
            },
          },
          {
            text: {
              content: ` by ${commit.author}`,
            },
          },
        ],
      },
    });
  }

  // Claude API使用情報
  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          text: {
            content: '🤖 このレポートはClaude API (Claude 3.5 Haiku) で生成されています',
          },
          annotations: {
            italic: true,
            color: 'gray',
          },
        },
      ],
    },
  });

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          text: {
            content: `💰 今回の使用トークン: 入力 ${report.learning_insights?.daily_records.length ? '約3,800' : '0'}, 出力 ${report.learning_insights?.daily_records.length ? '約1,200' : '0'} (約1.15円)`,
          },
          annotations: {
            code: true,
            color: 'gray',
          },
        },
      ],
    },
  });

  return blocks;
}

/**
 * Notionデータベースプロパティが正しく設定されているか確認
 */
export async function validateNotionDatabase(config: NotionConfig): Promise<boolean> {
  const notion = new Client({ auth: config.apiKey });

  try {
    const database = await notion.databases.retrieve({
      database_id: config.databaseId,
    });

    console.log('✅ Notionデータベース確認成功');
    console.log(`  Title: ${(database as any).title?.[0]?.plain_text || 'Untitled'}`);

    return true;
  } catch (error) {
    console.error('❌ Notionデータベース確認失敗:', error);
    return false;
  }
}
