-- ================================================
-- GitHub Activity Aggregator - Database Schema
-- ================================================
-- 作成日: 2025-11-17
-- 説明: 全リポジトリの活動データを管理するデータベーススキーマ
-- ================================================

-- UUIDサポート有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. リポジトリマスタ
-- ================================================
-- 全GitHubリポジトリの基本情報を保存
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- リポジトリ名（例: "github-activity-aggregator"）
  full_name TEXT UNIQUE NOT NULL,        -- 完全名（例: "Gaku52/github-activity-aggregator"）
  url TEXT NOT NULL,                     -- GitHub URL
  description TEXT,                      -- リポジトリの説明
  homepage TEXT,                         -- ホームページURL
  language TEXT,                         -- 主要言語（例: "TypeScript"）
  stars INT DEFAULT 0,                   -- スター数
  forks INT DEFAULT 0,                   -- フォーク数
  open_issues INT DEFAULT 0,             -- オープンIssue数
  is_private BOOLEAN DEFAULT false,      -- プライベートリポジトリか
  is_archived BOOLEAN DEFAULT false,     -- アーカイブ済みか
  created_at TIMESTAMP NOT NULL,         -- リポジトリ作成日
  updated_at TIMESTAMP NOT NULL,         -- 最終更新日
  last_push_at TIMESTAMP,                -- 最終プッシュ日
  metadata JSONB DEFAULT '{}'::jsonb,    -- その他のメタデータ（柔軟性のため）

  -- 自動更新タイムスタンプ
  synced_at TIMESTAMP DEFAULT NOW()      -- 最終同期日時
);

-- インデックス: 更新日順での検索を高速化
CREATE INDEX IF NOT EXISTS idx_repositories_updated
  ON repositories(updated_at DESC);

-- インデックス: 名前検索を高速化
CREATE INDEX IF NOT EXISTS idx_repositories_name
  ON repositories(name);

-- コメント追加
COMMENT ON TABLE repositories IS '全GitHubリポジトリのマスタテーブル';
COMMENT ON COLUMN repositories.full_name IS 'owner/repo形式の一意識別子';
COMMENT ON COLUMN repositories.metadata IS '将来の拡張用JSONB（topics, license等）';

-- ================================================
-- 2. コミット履歴
-- ================================================
-- 各リポジトリのコミット詳細を保存
CREATE TABLE IF NOT EXISTS commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  sha TEXT NOT NULL,                     -- コミットハッシュ
  message TEXT NOT NULL,                 -- コミットメッセージ
  author_name TEXT,                      -- コミット作成者名
  author_email TEXT,                     -- コミット作成者メール
  committed_at TIMESTAMP NOT NULL,       -- コミット日時
  additions INT DEFAULT 0,               -- 追加行数
  deletions INT DEFAULT 0,               -- 削除行数
  files_changed INT DEFAULT 0,           -- 変更ファイル数
  url TEXT,                              -- コミットURL
  created_at TIMESTAMP DEFAULT NOW(),    -- レコード作成日時

  -- 同一コミットの重複を防止
  UNIQUE(repo_id, sha)
);

-- インデックス: リポジトリ別・日付順検索を高速化
CREATE INDEX IF NOT EXISTS idx_commits_repo_date
  ON commits(repo_id, committed_at DESC);

-- インデックス: SHA検索を高速化
CREATE INDEX IF NOT EXISTS idx_commits_sha
  ON commits(sha);

-- インデックス: 作成者別検索を高速化
CREATE INDEX IF NOT EXISTS idx_commits_author
  ON commits(author_email);

-- コメント追加
COMMENT ON TABLE commits IS 'コミット履歴テーブル（週次で増加）';
COMMENT ON COLUMN commits.sha IS 'Git SHA-1ハッシュ（一意識別子）';
COMMENT ON COLUMN commits.additions IS 'GitHub API stats.additions';
COMMENT ON COLUMN commits.deletions IS 'GitHub API stats.deletions';

-- ================================================
-- 3. 週次アクティビティ（集計データ）
-- ================================================
-- リポジトリ別・週別の集計データ
CREATE TABLE IF NOT EXISTS weekly_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,              -- 週の開始日（月曜日）
  week_end DATE NOT NULL,                -- 週の終了日（日曜日）
  commits_count INT DEFAULT 0,           -- 週のコミット数
  prs_count INT DEFAULT 0,               -- 週のPR数（将来実装）
  issues_count INT DEFAULT 0,            -- 週のIssue数（将来実装）
  lines_added INT DEFAULT 0,             -- 週の追加行数合計
  lines_deleted INT DEFAULT 0,           -- 週の削除行数合計
  files_changed INT DEFAULT 0,           -- 週の変更ファイル数合計
  contributors TEXT[] DEFAULT '{}',      -- コントリビューター一覧
  languages JSONB DEFAULT '{}'::jsonb,   -- 言語別コミット数
  raw_data JSONB DEFAULT '{}'::jsonb,    -- 詳細データ（柔軟性のため）
  created_at TIMESTAMP DEFAULT NOW(),

  -- 同一リポジトリ・同一週の重複を防止
  UNIQUE(repo_id, week_start)
);

-- インデックス: 週別検索を高速化
CREATE INDEX IF NOT EXISTS idx_weekly_activities_week
  ON weekly_activities(week_start DESC);

-- インデックス: リポジトリ別検索を高速化
CREATE INDEX IF NOT EXISTS idx_weekly_activities_repo
  ON weekly_activities(repo_id);

-- コメント追加
COMMENT ON TABLE weekly_activities IS '週次集計テーブル（レポート生成の元データ）';
COMMENT ON COLUMN weekly_activities.week_start IS '週の開始日（ISO 8601: 月曜始まり）';
COMMENT ON COLUMN weekly_activities.contributors IS 'その週のコントリビューターメールアドレス配列';
COMMENT ON COLUMN weekly_activities.languages IS '{"TypeScript": 10, "Python": 5} 形式';

-- ================================================
-- 4. 生成レポート
-- ================================================
-- 生成された各種フォーマットのレポートを保存
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start DATE NOT NULL,            -- レポート期間開始
  period_end DATE NOT NULL,              -- レポート期間終了
  report_type TEXT NOT NULL,             -- 'weekly', 'monthly', 'yearly'
  format TEXT NOT NULL,                  -- 'notion', 'markdown', 'json', 'slack'
  title TEXT NOT NULL,                   -- レポートタイトル
  content JSONB NOT NULL,                -- レポート本体（JSON形式）
  summary JSONB,                         -- サマリー統計
  published_at TIMESTAMP,                -- 配信完了日時
  notion_page_id TEXT,                   -- Notionページ ID（配信後に記録）
  github_pages_url TEXT,                 -- GitHub Pages URL（配信後に記録）
  created_at TIMESTAMP DEFAULT NOW(),

  -- 同一期間・同一フォーマットの重複を防止
  UNIQUE(period_start, period_end, report_type, format)
);

-- インデックス: 期間別検索を高速化
CREATE INDEX IF NOT EXISTS idx_generated_reports_period
  ON generated_reports(period_start DESC);

-- インデックス: フォーマット別検索を高速化
CREATE INDEX IF NOT EXISTS idx_generated_reports_format
  ON generated_reports(format);

-- インデックス: 配信状態検索を高速化
CREATE INDEX IF NOT EXISTS idx_generated_reports_published
  ON generated_reports(published_at);

-- コメント追加
COMMENT ON TABLE generated_reports IS '生成されたレポートの保存テーブル';
COMMENT ON COLUMN generated_reports.content IS 'フォーマット別のレポート本体（Notion Blocks, Markdown等）';
COMMENT ON COLUMN generated_reports.summary IS '統計サマリー: {totalCommits: 100, activeRepos: 5}';

-- ================================================
-- 5. プラットフォーム統計
-- ================================================
-- 全リポジトリ横断の日次統計
CREATE TABLE IF NOT EXISTS platform_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,             -- 統計日付
  total_repos INT DEFAULT 0,             -- 総リポジトリ数
  active_repos INT DEFAULT 0,            -- アクティブリポジトリ数（週内にコミットあり）
  total_commits INT DEFAULT 0,           -- 総コミット数
  total_contributors INT DEFAULT 0,      -- 総コントリビューター数
  language_distribution JSONB DEFAULT '{}'::jsonb,  -- 言語分布
  activity_heatmap JSONB DEFAULT '{}'::jsonb,       -- 曜日別活動ヒートマップ
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス: 日付順検索を高速化
CREATE INDEX IF NOT EXISTS idx_platform_stats_date
  ON platform_stats(date DESC);

-- コメント追加
COMMENT ON TABLE platform_stats IS '全リポジトリ統合の日次統計';
COMMENT ON COLUMN platform_stats.activity_heatmap IS '{"Monday": 10, "Tuesday": 15, ...} 形式';

-- ================================================
-- Row Level Security (RLS) の設定
-- ================================================
-- セキュリティのため、将来的に有効化
-- 現在は開発用に無効（必要に応じて有効化）

-- ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE weekly_activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- ================================================
-- ビュー: 便利なクエリ用
-- ================================================

-- 最新週のアクティビティサマリー
CREATE OR REPLACE VIEW latest_week_summary
WITH (security_invoker = on)
AS
SELECT
  r.name AS repository_name,
  r.language,
  wa.week_start,
  wa.week_end,
  wa.commits_count,
  wa.lines_added,
  wa.lines_deleted,
  wa.files_changed,
  array_length(wa.contributors, 1) AS contributors_count
FROM weekly_activities wa
JOIN repositories r ON wa.repo_id = r.id
WHERE wa.week_start = (SELECT MAX(week_start) FROM weekly_activities)
ORDER BY wa.commits_count DESC;

COMMENT ON VIEW latest_week_summary IS '最新週のアクティビティをリポジトリ別に表示（SECURITY INVOKER）';

-- 月次統計ビュー
CREATE OR REPLACE VIEW monthly_stats
WITH (security_invoker = on)
AS
SELECT
  DATE_TRUNC('month', wa.week_start) AS month,
  COUNT(DISTINCT wa.repo_id) AS active_repos,
  SUM(wa.commits_count) AS total_commits,
  SUM(wa.lines_added) AS total_additions,
  SUM(wa.lines_deleted) AS total_deletions
FROM weekly_activities wa
GROUP BY DATE_TRUNC('month', wa.week_start)
ORDER BY month DESC;

COMMENT ON VIEW monthly_stats IS '月次統計サマリー（SECURITY INVOKER）';

-- ================================================
-- 初期データ（テスト用）
-- ================================================
-- 本番運用前にコメントアウトを解除してテストデータ挿入

-- INSERT INTO repositories (name, full_name, url, language, created_at, updated_at) VALUES
-- ('test-repo', 'testuser/test-repo', 'https://github.com/testuser/test-repo', 'TypeScript', NOW(), NOW());

-- ================================================
-- スキーマ完成
-- ================================================
-- 次のステップ:
-- 1. SupabaseのSQL Editorでこのスクリプトを実行
-- 2. テーブルが正しく作成されたか確認
-- 3. Lambda関数からSupabase接続テスト
-- ================================================
