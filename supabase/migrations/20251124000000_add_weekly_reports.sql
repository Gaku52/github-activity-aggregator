-- ================================================
-- Add weekly_reports table
-- ================================================
-- 作成日: 2025-11-24
-- 説明: 週次レポートを保存するテーブル
-- ================================================

CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,              -- 週の開始日
  week_end DATE NOT NULL,                -- 週の終了日
  total_commits INT DEFAULT 0,           -- 総コミット数
  summary TEXT NOT NULL,                 -- Claude による分析結果
  notion_page_url TEXT,                  -- Notion ページ URL
  created_at TIMESTAMP DEFAULT NOW(),    -- レコード作成日時

  -- 同一週の重複を防止
  UNIQUE(week_start, week_end)
);

-- インデックス: 週別検索を高速化
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week
  ON weekly_reports(week_start DESC);

-- コメント追加
COMMENT ON TABLE weekly_reports IS '週次レポートテーブル';
COMMENT ON COLUMN weekly_reports.summary IS 'Claude による分析結果（マークダウン形式）';
COMMENT ON COLUMN weekly_reports.notion_page_url IS 'Notion に投稿されたページの URL';
