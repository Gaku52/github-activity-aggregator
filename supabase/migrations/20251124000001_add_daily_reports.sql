-- ================================================
-- Add daily_reports table
-- ================================================
-- 作成日: 2025-11-24
-- 説明: 日次記録を保存するテーブル
-- ================================================

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,             -- 記録日
  total_commits INT DEFAULT 0,           -- 総コミット数
  summary TEXT NOT NULL,                 -- Claude による分析結果
  input_tokens INT DEFAULT 0,            -- Claude API Input tokens
  output_tokens INT DEFAULT 0,           -- Claude API Output tokens
  total_tokens INT DEFAULT 0,            -- Claude API Total tokens
  estimated_cost DECIMAL(10, 6) DEFAULT 0, -- 推定コスト（USD）
  notion_page_url TEXT,                  -- Notion ページ URL
  created_at TIMESTAMP DEFAULT NOW()     -- レコード作成日時
);

-- インデックス: 日付順検索を高速化
CREATE INDEX IF NOT EXISTS idx_daily_reports_date
  ON daily_reports(date DESC);

-- コメント追加
COMMENT ON TABLE daily_reports IS '日次記録テーブル';
COMMENT ON COLUMN daily_reports.summary IS 'Claude による学習内容の分析結果（マークダウン形式）';
COMMENT ON COLUMN daily_reports.estimated_cost IS 'Claude API 使用コスト（USD）';
COMMENT ON COLUMN daily_reports.notion_page_url IS 'Notion に投稿されたページの URL';
