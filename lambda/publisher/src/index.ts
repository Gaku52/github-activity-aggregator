/**
 * GitHub Activity Publisher Lambda Function
 *
 * 生成されたレポートを各プラットフォームに配信する
 */

import { Handler } from 'aws-lambda';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { publishToNotion, validateNotionDatabase } from './notion';
import { publishToSlack } from './slack';
import { exportMarkdown, exportJSON } from './markdown';

// ローカルテスト用に.envを読込
dotenv.config({ path: '../../.env' });

interface PublisherEvent {
  report_id?: string; // 特定のレポートIDを指定（省略時は最新）
}

interface PublisherResponse {
  statusCode: number;
  body: string;
}

interface GeneratedReport {
  id: string;
  period_start: string;
  period_end: string;
  report_type: string;
  format: string;
  title: string;
  content: any;
  summary: any;
  created_at: string;
}

/**
 * Lambda Handler
 */
export const handler: Handler<PublisherEvent, PublisherResponse> = async (event) => {
  console.log('📤 GitHub Activity Publisher 起動');
  console.log('Event:', JSON.stringify(event, null, 2));

  const results: any[] = [];

  try {
    // 環境変数確認
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase接続情報が設定されていません');
    }

    console.log('✅ 環境変数確認完了');

    // Supabase初期化
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('✅ Supabase初期化完了');

    // 1. 最新レポート取得
    console.log('\n📄 Step 1: 最新レポート取得中...');
    const report = await fetchLatestReport(supabase, event.report_id);

    if (!report) {
      console.log('⚠️  配信可能なレポートがありません');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No report to publish' }),
      };
    }

    console.log(`  取得完了: ${report.title}`);
    console.log(`  期間: ${report.period_start} 〜 ${report.period_end}`);

    // レポートデータを整形
    const reportData = {
      title: report.title,
      period_start: report.period_start,
      period_end: report.period_end,
      summary: report.summary,
      repositories: report.content?.repositories || [],
      top_commits: report.content?.top_commits || [],
      learning_insights: report.content?.learning_insights,
      markdown: report.content?.markdown || '',
    };

    // 2. Notion配信
    if (notionApiKey && notionDatabaseId) {
      console.log('\n📝 Step 2: Notion配信中...');
      try {
        // データベース確認
        const isValid = await validateNotionDatabase({
          apiKey: notionApiKey,
          databaseId: notionDatabaseId,
        });

        if (!isValid) {
          throw new Error('Notionデータベースが見つかりません');
        }

        const notionPageId = await publishToNotion(
          { apiKey: notionApiKey, databaseId: notionDatabaseId },
          reportData
        );

        // Notion page IDを保存
        await supabase
          .from('generated_reports')
          .update({
            notion_page_id: notionPageId,
            published_at: new Date().toISOString(),
          })
          .eq('id', report.id);

        results.push({ platform: 'Notion', status: 'success', page_id: notionPageId });
        console.log('  ✅ Notion配信成功');
      } catch (error) {
        console.error('  ❌ Notion配信失敗:', error);
        results.push({ platform: 'Notion', status: 'failed', error: (error as Error).message });
      }
    } else {
      console.log('\n⏭️  Step 2: Notion配信スキップ（環境変数未設定）');
      results.push({ platform: 'Notion', status: 'skipped' });
    }

    // 3. Slack配信
    if (slackWebhookUrl) {
      console.log('\n📤 Step 3: Slack配信中...');
      try {
        await publishToSlack(
          { webhookUrl: slackWebhookUrl },
          {
            title: report.title,
            period_start: report.period_start,
            period_end: report.period_end,
            summary: report.summary,
            repositories: reportData.repositories,
          }
        );

        results.push({ platform: 'Slack', status: 'success' });
        console.log('  ✅ Slack配信成功');
      } catch (error) {
        console.error('  ❌ Slack配信失敗:', error);
        results.push({ platform: 'Slack', status: 'failed', error: (error as Error).message });
      }
    } else {
      console.log('\n⏭️  Step 3: Slack配信スキップ（環境変数未設定）');
      results.push({ platform: 'Slack', status: 'skipped' });
    }

    // 4. Markdown出力
    console.log('\n📄 Step 4: Markdown出力中...');
    try {
      const markdownPath = await exportMarkdown({
        title: report.title,
        period_start: report.period_start,
        period_end: report.period_end,
        content: reportData.markdown,
      });

      results.push({ platform: 'Markdown', status: 'success', path: markdownPath });
      console.log('  ✅ Markdown出力成功');
    } catch (error) {
      console.error('  ❌ Markdown出力失敗:', error);
      results.push({ platform: 'Markdown', status: 'failed', error: (error as Error).message });
    }

    // 5. JSON出力
    console.log('\n📋 Step 5: JSON出力中...');
    try {
      const jsonPath = await exportJSON({
        ...reportData,
        report_id: report.id,
        created_at: report.created_at,
      });

      results.push({ platform: 'JSON', status: 'success', path: jsonPath });
      console.log('  ✅ JSON出力成功');
    } catch (error) {
      console.error('  ❌ JSON出力失敗:', error);
      results.push({ platform: 'JSON', status: 'failed', error: (error as Error).message });
    }

    // 完了
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log('\n🎉 配信完了！');
    console.log(`  成功: ${successCount}/${results.length}`);
    console.log(`  失敗: ${failedCount}/${results.length}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        report: {
          id: report.id,
          title: report.title,
          period: `${report.period_start} - ${report.period_end}`,
        },
        results,
      }),
    };

  } catch (error) {
    console.error('❌ エラー発生:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      }),
    };
  }
};

/**
 * 最新のレポートを取得
 */
async function fetchLatestReport(
  supabase: any,
  reportId?: string
): Promise<GeneratedReport | null> {
  let query = supabase
    .from('generated_reports')
    .select('*')
    .eq('report_type', 'weekly')
    .eq('format', 'markdown');

  if (reportId) {
    query = query.eq('id', reportId);
  } else {
    query = query.order('created_at', { ascending: false }).limit(1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`レポート取得エラー: ${error.message}`);
  }

  return data && data.length > 0 ? data[0] : null;
}

// ローカルテスト用
if (require.main === module) {
  console.log('🧪 ローカルテスト実行\n');
  handler({}, {} as any, {} as any);
}
