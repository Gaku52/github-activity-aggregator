/**
 * GitHub Activity Collector Lambda Function
 *
 * 全GitHubリポジトリの活動を収集し、Supabaseに保存する
 */

import { Handler } from 'aws-lambda';
import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// ローカルテスト用に.envを読込
dotenv.config({ path: '../../.env' });

// Supabase Database型定義
interface Database {
  public: {
    Tables: {
      repositories: {
        Row: {
          id: string;
          name: string;
          full_name: string;
          url: string;
          description: string | null;
          homepage: string | null;
          language: string | null;
          stars: number;
          forks: number;
          open_issues: number;
          is_private: boolean;
          is_archived: boolean;
          created_at: string | null;
          updated_at: string | null;
          last_push_at: string | null;
          metadata: any;
          synced_at: string;
        };
        Insert: Omit<Database['public']['Tables']['repositories']['Row'], 'id' | 'synced_at' | 'metadata'>;
      };
      commits: {
        Row: {
          id: string;
          repo_id: string;
          sha: string;
          message: string;
          author_name: string | null;
          author_email: string | null;
          committed_at: string;
          additions: number;
          deletions: number;
          files_changed: number;
          url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['commits']['Row'], 'id' | 'created_at'>;
      };
    };
  };
}

interface CollectorEvent {
  since?: string; // ISO 8601 date (例: '2024-11-11T00:00:00Z')
}

interface CollectorResponse {
  statusCode: number;
  body: string;
}

interface Repository {
  name: string;
  full_name: string;
  url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  is_private: boolean;
  is_archived: boolean;
  created_at: string | null;
  updated_at: string | null;
  last_push_at: string | null;
}

interface Commit {
  repo_full_name: string;
  sha: string;
  message: string;
  author_name: string | null;
  author_email: string | null;
  committed_at: string;
  additions: number;
  deletions: number;
  files_changed: number;
  url: string;
}

/**
 * Lambda Handler
 */
export const handler: Handler<CollectorEvent, CollectorResponse> = async (event) => {
  console.log('🚀 GitHub Activity Collector 起動');
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // 環境変数確認
    const githubToken = process.env.GITHUB_TOKEN;
    const githubUsername = process.env.GITHUB_USERNAME || 'Gaku52';
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!githubToken) {
      throw new Error('GITHUB_TOKEN が設定されていません');
    }
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase接続情報が設定されていません');
    }

    console.log('✅ 環境変数確認完了');
    console.log(`  GitHub User: ${githubUsername}`);
    console.log(`  Supabase URL: ${supabaseUrl}`);

    // 期間設定（デフォルト: 先週）
    const since = event.since || getLastWeekDate();
    console.log(`📅 収集期間: ${since} 〜 現在`);

    // GitHub API初期化
    const octokit = new Octokit({ auth: githubToken });
    console.log('✅ GitHub API初期化完了');

    // Supabase初期化（本番環境用）
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'github-activity-aggregator',
        },
      },
    });
    console.log('✅ Supabase初期化完了');

    // 1. 全リポジトリ取得
    console.log('\n📦 Step 1: 全リポジトリ取得中...');
    const repositories = await fetchAllRepositories(octokit, githubUsername);
    console.log(`  取得完了: ${repositories.length}個のリポジトリ`);

    // 2. リポジトリ情報をSupabaseに保存
    console.log('\n💾 Step 2: リポジトリ情報を保存中...');
    await upsertRepositories(supabase, repositories);
    console.log('  保存完了');

    // 3. 各リポジトリのコミット取得
    console.log(`\n📝 Step 3: コミット取得中（${since}以降）...`);
    const commits = await fetchCommitsSince(octokit, githubUsername, repositories, since);
    console.log(`  取得完了: ${commits.length}個のコミット`);

    // 4. コミット情報を保存
    console.log('\n💾 Step 4: コミット情報を保存中...');
    await insertCommits(supabase, commits);
    console.log('  保存完了');

    // 完了
    const result = {
      repositories: repositories.length,
      commits: commits.length,
      period: since,
    };

    console.log('\n🎉 収集完了！');
    console.log('結果:', JSON.stringify(result, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('❌ エラー発生:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

/**
 * 全リポジトリを取得
 */
async function fetchAllRepositories(
  octokit: Octokit,
  username: string
): Promise<Repository[]> {
  const { data } = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
    direction: 'desc',
  });

  return data.map(repo => ({
    name: repo.name,
    full_name: repo.full_name,
    url: repo.html_url,
    description: repo.description,
    homepage: repo.homepage,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    open_issues: repo.open_issues_count,
    is_private: repo.private,
    is_archived: repo.archived,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    last_push_at: repo.pushed_at,
  }));
}

/**
 * リポジトリ情報をSupabaseに保存（UPSERT）
 */
async function upsertRepositories(
  supabase: any,
  repositories: Repository[]
): Promise<void> {
  for (const repo of repositories) {
    const { error } = await supabase
      .from('repositories')
      .upsert({
        name: repo.name,
        full_name: repo.full_name,
        url: repo.url,
        description: repo.description,
        homepage: repo.homepage,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
        open_issues: repo.open_issues,
        is_private: repo.is_private,
        is_archived: repo.is_archived,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        last_push_at: repo.last_push_at,
      }, {
        onConflict: 'full_name'
      });

    if (error) {
      console.error(`  ⚠️  ${repo.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${repo.name}`);
    }
  }
}

/**
 * 指定期間以降のコミットを取得
 */
async function fetchCommitsSince(
  octokit: Octokit,
  username: string,
  repositories: Repository[],
  since: string
): Promise<Commit[]> {
  const allCommits: Commit[] = [];

  for (const repo of repositories) {
    // アーカイブ済みはスキップ
    if (repo.is_archived) {
      console.log(`  ⏭️  ${repo.name}: アーカイブ済みのためスキップ`);
      continue;
    }

    try {
      const [owner, repoName] = repo.full_name.split('/');

      const { data: commits } = await octokit.repos.listCommits({
        owner,
        repo: repoName,
        since,
        per_page: 100,
      });

      console.log(`  📝 ${repo.name}: ${commits.length}個のコミット`);

      for (const commit of commits) {
        // コミット詳細取得（stats情報含む）
        const { data: commitDetail } = await octokit.repos.getCommit({
          owner,
          repo: repoName,
          ref: commit.sha,
        });

        allCommits.push({
          repo_full_name: repo.full_name,
          sha: commit.sha,
          message: commit.commit.message,
          author_name: commit.commit.author?.name || null,
          author_email: commit.commit.author?.email || null,
          committed_at: commit.commit.author?.date || new Date().toISOString(),
          additions: commitDetail.stats?.additions || 0,
          deletions: commitDetail.stats?.deletions || 0,
          files_changed: commitDetail.files?.length || 0,
          url: commit.html_url,
        });
      }

    } catch (error) {
      console.error(`  ❌ ${repo.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return allCommits;
}

/**
 * コミット情報をSupabaseに保存
 */
async function insertCommits(
  supabase: any,
  commits: Commit[]
): Promise<void> {
  // リポジトリIDを取得してマッピング
  const { data: repos, error: reposError } = await supabase
    .from('repositories')
    .select('id, full_name');

  if (reposError) {
    throw new Error(`リポジトリ情報取得エラー: ${reposError.message}`);
  }

  const repoIdMap = new Map(
    repos.map((r: any) => [r.full_name, r.id])
  );

  for (const commit of commits) {
    const repoId = repoIdMap.get(commit.repo_full_name);
    if (!repoId) {
      console.error(`  ⚠️  リポジトリIDが見つかりません: ${commit.repo_full_name}`);
      continue;
    }

    const { error } = await supabase
      .from('commits')
      .insert({
        repo_id: repoId,
        sha: commit.sha,
        message: commit.message,
        author_name: commit.author_name,
        author_email: commit.author_email,
        committed_at: commit.committed_at,
        additions: commit.additions,
        deletions: commit.deletions,
        files_changed: commit.files_changed,
        url: commit.url,
      });

    if (error) {
      // 重複エラーは無視（UNIQUE制約）
      if (!error.message.includes('duplicate')) {
        console.error(`  ⚠️  ${commit.sha.substring(0, 7)}: ${error.message}`);
      }
    } else {
      console.log(`  ✓ ${commit.sha.substring(0, 7)}: ${commit.message.split('\n')[0]}`);
    }
  }
}

/**
 * 先週の日付を取得（ISO 8601形式）
 */
function getLastWeekDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString();
}

// ローカルテスト用（npm run test で実行）
if (require.main === module) {
  console.log('🧪 ローカルテスト実行\n');
  handler({}, {} as any, {} as any);
}
