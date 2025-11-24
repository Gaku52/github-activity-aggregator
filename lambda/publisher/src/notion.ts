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
        // 期間開始日
        'Period Start': {
          date: {
            start: report.period_start,
          },
        },
        // 期間終了日
        'Period End': {
          date: {
            start: report.period_end,
          },
        },
        // コミット数
        'Commits': {
          number: report.summary.total_commits,
        },
        // 追加行数
        'Additions': {
          number: report.summary.total_additions,
        },
        // 削除行数
        'Deletions': {
          number: report.summary.total_deletions,
        },
        // アクティブリポジトリ数
        'Active Repos': {
          number: report.summary.active_repos,
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
