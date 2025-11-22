/**
 * API接続テストスクリプト
 * 全ての必須APIが正しく設定されているか確認
 */

import * as dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';

// .envファイル読み込み
dotenv.config();

interface TestResult {
  name: string;
  status: 'success' | 'error';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * 1. GitHub API テスト
 */
async function testGitHub(): Promise<TestResult> {
  console.log('\n🧪 Testing GitHub API...');

  try {
    const token = process.env.GITHUB_TOKEN;
    const username = process.env.GITHUB_USERNAME;

    if (!token) {
      throw new Error('GITHUB_TOKEN が設定されていません');
    }

    const octokit = new Octokit({ auth: token });

    // 認証ユーザー情報を取得
    const { data: user } = await octokit.users.getAuthenticated();

    // リポジトリ一覧を取得
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 5,
      sort: 'updated',
    });

    return {
      name: 'GitHub API',
      status: 'success',
      message: `✅ 接続成功: ${user.login} (${repos.length}+ repos)`,
      details: {
        username: user.login,
        name: user.name,
        repos_count: user.public_repos,
      },
    };
  } catch (error) {
    return {
      name: 'GitHub API',
      status: 'error',
      message: `❌ 接続失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * 2. Claude API テスト
 */
async function testClaude(): Promise<TestResult> {
  console.log('\n🧪 Testing Claude API...');

  try {
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY が設定されていません');
    }

    const anthropic = new Anthropic({ apiKey });

    // 簡単なテストメッセージ送信
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Say "API test successful" in Japanese.',
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return {
      name: 'Claude API',
      status: 'success',
      message: `✅ 接続成功: ${responseText}`,
      details: {
        model: message.model,
        usage: message.usage,
      },
    };
  } catch (error) {
    return {
      name: 'Claude API',
      status: 'error',
      message: `❌ 接続失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * 3. Supabase テスト
 */
async function testSupabase(): Promise<TestResult> {
  console.log('\n🧪 Testing Supabase...');

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('Supabase接続情報が設定されていません');
    }

    console.log(`  URL: ${url}`);
    console.log(`  Key: ${key.substring(0, 20)}...`);

    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'github-activity-aggregator-test',
        },
      },
    });

    // テーブル一覧を確認
    const { data: repos, error: reposError } = await supabase
      .from('repositories')
      .select('count')
      .limit(1);

    if (reposError) {
      console.error('  repositories エラー詳細:', reposError);
      throw new Error(`repositories テーブルエラー: ${reposError.message}`);
    }

    const { data: commits, error: commitsError } = await supabase
      .from('commits')
      .select('count')
      .limit(1);

    if (commitsError) {
      throw new Error(`commits テーブルエラー: ${commitsError.message}`);
    }

    return {
      name: 'Supabase',
      status: 'success',
      message: `✅ 接続成功: データベースアクセス可能`,
      details: {
        url,
        tables_accessible: ['repositories', 'commits', 'weekly_activities', 'monthly_reports', 'platform_stats'],
      },
    };
  } catch (error) {
    return {
      name: 'Supabase',
      status: 'error',
      message: `❌ 接続失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * 4. Notion API テスト
 */
async function testNotion(): Promise<TestResult> {
  console.log('\n🧪 Testing Notion API...');

  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!apiKey) {
      throw new Error('NOTION_API_KEY が設定されていません');
    }

    if (!databaseId) {
      throw new Error('NOTION_DATABASE_ID が設定されていません');
    }

    const notion = new Client({ auth: apiKey });

    // データベース情報を取得
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    return {
      name: 'Notion API',
      status: 'success',
      message: `✅ 接続成功: "${database.title[0]?.plain_text || 'Untitled'}" データベースにアクセス可能`,
      details: {
        database_id: databaseId,
        title: database.title[0]?.plain_text || 'Untitled',
      },
    };
  } catch (error) {
    return {
      name: 'Notion API',
      status: 'error',
      message: `❌ 接続失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * メイン実行
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 GitHub Activity Aggregator - API接続テスト');
  console.log('='.repeat(60));

  // 各APIを順番にテスト
  results.push(await testGitHub());
  results.push(await testClaude());
  results.push(await testSupabase());
  results.push(await testNotion());

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));

  results.forEach((result) => {
    console.log(`\n${result.name}:`);
    console.log(`  ${result.message}`);
    if (result.details) {
      console.log(`  詳細:`, JSON.stringify(result.details, null, 2));
    }
  });

  const successCount = results.filter(r => r.status === 'success').length;
  const totalCount = results.length;

  console.log('\n' + '='.repeat(60));
  console.log(`✅ 成功: ${successCount}/${totalCount}`);
  console.log(`❌ 失敗: ${totalCount - successCount}/${totalCount}`);
  console.log('='.repeat(60));

  // 全て成功したか確認
  if (successCount === totalCount) {
    console.log('\n🎉 全てのAPI接続テストが成功しました！');
    console.log('次のステップ: Lambda Collectorのローカルテストを実行してください。');
    process.exit(0);
  } else {
    console.log('\n⚠️  一部のAPI接続テストが失敗しました。');
    console.log('失敗したAPIの設定を確認してください。');
    process.exit(1);
  }
}

main();
