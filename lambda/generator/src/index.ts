/**
 * GitHub Activity Report Generator Lambda Function
 *
 * Supabaseから収集データを読み取り、週次レポートを生成する
 */

import { Handler } from 'aws-lambda';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// ローカルテスト用に.envを読込
dotenv.config({ path: '../../.env' });

interface GeneratorEvent {
  week_offset?: number; // 何週間前のレポートを生成するか（0=今週、1=先週）
}

interface GeneratorResponse {
  statusCode: number;
  body: string;
}

interface CommitData {
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
}

interface RepositoryData {
  id: string;
  name: string;
  full_name: string;
  language: string | null;
}

interface WeeklyActivity {
  repo_id: string;
  week_start: string;
  week_end: string;
  commits_count: number;
  lines_added: number;
  lines_deleted: number;
  files_changed: number;
  contributors: string[];
  languages: Record<string, number>;
}

interface ReportContent {
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
}

/**
 * Lambda Handler
 */
export const handler: Handler<GeneratorEvent, GeneratorResponse> = async (event) => {
  console.log('📊 GitHub Activity Report Generator 起動');
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // 環境変数確認
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

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

    // 週の範囲を計算
    const weekOffset = event.week_offset || 0;
    const { weekStart, weekEnd } = getWeekRange(weekOffset);
    console.log(`📅 対象期間: ${weekStart} 〜 ${weekEnd}`);

    // 1. 対象期間のコミットデータ取得
    console.log('\n📝 Step 1: コミットデータ取得中...');
    const commits = await fetchCommitsInRange(supabase, weekStart, weekEnd);
    console.log(`  取得完了: ${commits.length}個のコミット`);

    if (commits.length === 0) {
      console.log('⚠️  対象期間にコミットがありません');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No commits in this period' }),
      };
    }

    // 2. リポジトリ情報取得
    console.log('\n📦 Step 2: リポジトリ情報取得中...');
    const repositories = await fetchRepositories(supabase, commits);
    console.log(`  取得完了: ${repositories.length}個のリポジトリ`);

    // 3. 週次アクティビティ集計
    console.log('\n📊 Step 3: 週次アクティビティ集計中...');
    const weeklyActivities = aggregateWeeklyActivities(
      commits,
      repositories,
      weekStart,
      weekEnd
    );
    console.log(`  集計完了: ${weeklyActivities.length}個のリポジトリ`);

    // 4. weekly_activitiesテーブルに保存
    console.log('\n💾 Step 4: 週次アクティビティ保存中...');
    await saveWeeklyActivities(supabase, weeklyActivities);
    console.log('  保存完了');

    // 5. レポート生成
    console.log('\n📄 Step 5: レポート生成中...');
    const reportContent = generateReportContent(commits, repositories, weeklyActivities);
    const markdownReport = generateMarkdownReport(reportContent, weekStart, weekEnd);
    console.log('  レポート生成完了');

    // 6. generated_reportsテーブルに保存
    console.log('\n💾 Step 6: レポート保存中...');
    await saveGeneratedReport(
      supabase,
      weekStart,
      weekEnd,
      markdownReport,
      reportContent
    );
    console.log('  保存完了');

    // 完了
    const result = {
      period: { start: weekStart, end: weekEnd },
      commits: commits.length,
      repositories: repositories.length,
      report_preview: markdownReport.substring(0, 200) + '...',
    };

    console.log('\n🎉 レポート生成完了！');
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
 * 週の範囲を取得（月曜始まり）
 */
function getWeekRange(weekOffset: number = 0): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; // 月曜日への差分

  const monday = new Date(now);
  monday.setDate(now.getDate() + diff - (weekOffset * 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  };
}

/**
 * 指定期間のコミットを取得
 */
async function fetchCommitsInRange(
  supabase: any,
  weekStart: string,
  weekEnd: string
): Promise<CommitData[]> {
  const { data, error } = await supabase
    .from('commits')
    .select('*')
    .gte('committed_at', weekStart)
    .lte('committed_at', weekEnd + 'T23:59:59')
    .order('committed_at', { ascending: false });

  if (error) {
    throw new Error(`コミット取得エラー: ${error.message}`);
  }

  return data || [];
}

/**
 * リポジトリ情報を取得
 */
async function fetchRepositories(
  supabase: any,
  commits: CommitData[]
): Promise<RepositoryData[]> {
  const repoIds = [...new Set(commits.map(c => c.repo_id))];

  const { data, error } = await supabase
    .from('repositories')
    .select('id, name, full_name, language')
    .in('id', repoIds);

  if (error) {
    throw new Error(`リポジトリ取得エラー: ${error.message}`);
  }

  return data || [];
}

/**
 * 週次アクティビティを集計
 */
function aggregateWeeklyActivities(
  commits: CommitData[],
  repositories: RepositoryData[],
  weekStart: string,
  weekEnd: string
): WeeklyActivity[] {
  const repoMap = new Map(repositories.map(r => [r.id, r]));
  const activityMap = new Map<string, WeeklyActivity>();

  for (const commit of commits) {
    const repo = repoMap.get(commit.repo_id);
    if (!repo) continue;

    if (!activityMap.has(commit.repo_id)) {
      activityMap.set(commit.repo_id, {
        repo_id: commit.repo_id,
        week_start: weekStart,
        week_end: weekEnd,
        commits_count: 0,
        lines_added: 0,
        lines_deleted: 0,
        files_changed: 0,
        contributors: [],
        languages: {},
      });
    }

    const activity = activityMap.get(commit.repo_id)!;
    activity.commits_count++;
    activity.lines_added += commit.additions;
    activity.lines_deleted += commit.deletions;
    activity.files_changed += commit.files_changed;

    // コントリビューター追加
    if (commit.author_email && !activity.contributors.includes(commit.author_email)) {
      activity.contributors.push(commit.author_email);
    }

    // 言語カウント
    if (repo.language) {
      activity.languages[repo.language] = (activity.languages[repo.language] || 0) + 1;
    }
  }

  return Array.from(activityMap.values());
}

/**
 * 週次アクティビティをSupabaseに保存
 */
async function saveWeeklyActivities(
  supabase: any,
  activities: WeeklyActivity[]
): Promise<void> {
  for (const activity of activities) {
    const { error } = await supabase
      .from('weekly_activities')
      .upsert({
        repo_id: activity.repo_id,
        week_start: activity.week_start,
        week_end: activity.week_end,
        commits_count: activity.commits_count,
        prs_count: 0, // 今後実装
        issues_count: 0, // 今後実装
        lines_added: activity.lines_added,
        lines_deleted: activity.lines_deleted,
        files_changed: activity.files_changed,
        contributors: activity.contributors,
        languages: activity.languages,
      }, {
        onConflict: 'repo_id,week_start',
      });

    if (error) {
      console.error(`  ⚠️  ${activity.repo_id}: ${error.message}`);
    }
  }
}

/**
 * レポートコンテンツを生成
 */
function generateReportContent(
  commits: CommitData[],
  repositories: RepositoryData[],
  activities: WeeklyActivity[]
): ReportContent {
  const repoMap = new Map(repositories.map(r => [r.id, r]));

  return {
    summary: {
      total_commits: commits.length,
      total_additions: commits.reduce((sum, c) => sum + c.additions, 0),
      total_deletions: commits.reduce((sum, c) => sum + c.deletions, 0),
      total_files_changed: commits.reduce((sum, c) => sum + c.files_changed, 0),
      active_repos: activities.length,
      contributors: new Set(commits.map(c => c.author_email).filter(Boolean)).size,
    },
    repositories: activities
      .map(a => {
        const repo = repoMap.get(a.repo_id);
        return {
          name: repo?.name || 'Unknown',
          language: repo?.language || null,
          commits: a.commits_count,
          additions: a.lines_added,
          deletions: a.lines_deleted,
          files_changed: a.files_changed,
        };
      })
      .sort((a, b) => b.commits - a.commits),
    top_commits: commits.slice(0, 10).map(c => {
      const repo = repoMap.get(c.repo_id);
      return {
        repo: repo?.name || 'Unknown',
        message: c.message.split('\n')[0],
        author: c.author_name || 'Unknown',
        date: c.committed_at,
        url: c.url || '',
      };
    }),
  };
}

/**
 * Markdownレポートを生成
 */
function generateMarkdownReport(
  content: ReportContent,
  weekStart: string,
  weekEnd: string
): string {
  const { summary, repositories, top_commits } = content;

  return `# GitHub Weekly Activity Report

**期間**: ${weekStart} 〜 ${weekEnd}

## 📊 サマリー

- **総コミット数**: ${summary.total_commits}
- **追加行数**: +${summary.total_additions.toLocaleString()}
- **削除行数**: -${summary.total_deletions.toLocaleString()}
- **変更ファイル数**: ${summary.total_files_changed}
- **アクティブリポジトリ**: ${summary.active_repos}
- **コントリビューター**: ${summary.contributors}

## 📦 リポジトリ別アクティビティ

${repositories.map(r => `### ${r.name} ${r.language ? `(${r.language})` : ''}

- コミット: ${r.commits}
- 追加: +${r.additions.toLocaleString()}
- 削除: -${r.deletions.toLocaleString()}
- ファイル: ${r.files_changed}
`).join('\n')}

## 🔝 最新コミット Top 10

${top_commits.map((c, i) => `${i + 1}. **${c.repo}**: ${c.message}
   - by ${c.author} on ${new Date(c.date).toLocaleDateString('ja-JP')}
   - ${c.url}
`).join('\n')}

---

*Generated by GitHub Activity Aggregator*
`;
}

/**
 * 生成されたレポートをSupabaseに保存
 */
async function saveGeneratedReport(
  supabase: any,
  weekStart: string,
  weekEnd: string,
  markdownContent: string,
  summary: ReportContent
): Promise<void> {
  const { error } = await supabase
    .from('generated_reports')
    .insert({
      period_start: weekStart,
      period_end: weekEnd,
      report_type: 'weekly',
      format: 'markdown',
      title: `Weekly Report ${weekStart} - ${weekEnd}`,
      content: { markdown: markdownContent },
      summary: summary.summary,
    });

  if (error) {
    throw new Error(`レポート保存エラー: ${error.message}`);
  }
}

// ローカルテスト用
if (require.main === module) {
  console.log('🧪 ローカルテスト実行\n');
  handler({}, {} as any, {} as any);
}
