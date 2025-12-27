-- Add Claude API cost tracking tables

-- Claude usage history table
CREATE TABLE IF NOT EXISTS claude_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  input_cost DECIMAL(10, 6) NOT NULL,
  output_cost DECIMAL(10, 6) NOT NULL,
  total_cost DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  operation_type TEXT,  -- 'analyze_commits', 'daily_summary', etc.
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit balance tracking table
CREATE TABLE IF NOT EXISTS credit_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  initial_balance DECIMAL(10, 2),
  last_recharge_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cost thresholds configuration table
CREATE TABLE IF NOT EXISTS cost_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL UNIQUE,  -- 'daily', 'weekly', 'monthly'
  threshold_amount DECIMAL(10, 2) NOT NULL,
  notify_email TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_claude_usage_timestamp ON claude_usage_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_claude_usage_model ON claude_usage_history(model_id);
CREATE INDEX IF NOT EXISTS idx_claude_usage_operation ON claude_usage_history(operation_type);

-- Insert initial credit balance (will be updated via environment variable)
INSERT INTO credit_balance (balance, initial_balance, last_recharge_at)
VALUES (4.84, 4.84, NOW())
ON CONFLICT DO NOTHING;

-- Insert default cost thresholds
INSERT INTO cost_thresholds (period, threshold_amount, enabled)
VALUES
  ('daily', 1.00, true),
  ('weekly', 5.00, true),
  ('monthly', 20.00, true)
ON CONFLICT (period) DO NOTHING;

-- Create view for daily cost summary
CREATE OR REPLACE VIEW daily_cost_summary AS
SELECT
  DATE(timestamp) as date,
  model_id,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_cost) as total_cost
FROM claude_usage_history
GROUP BY DATE(timestamp), model_id
ORDER BY date DESC, model_id;

-- Create view for monthly cost summary
CREATE OR REPLACE VIEW monthly_cost_summary AS
SELECT
  DATE_TRUNC('month', timestamp) as month,
  model_id,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_cost) as total_cost
FROM claude_usage_history
GROUP BY DATE_TRUNC('month', timestamp), model_id
ORDER BY month DESC, model_id;

-- Create view for current month usage (for balance calculation)
CREATE OR REPLACE VIEW current_month_usage AS
SELECT
  DATE_TRUNC('month', CURRENT_TIMESTAMP) as month,
  SUM(total_cost) as total_cost,
  COUNT(*) as request_count
FROM claude_usage_history
WHERE DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_TIMESTAMP);

-- Enable Row Level Security
ALTER TABLE claude_usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_thresholds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow service key full access)
CREATE POLICY "Allow service key full access to claude_usage_history"
ON claude_usage_history
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service key full access to credit_balance"
ON credit_balance
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service key full access to cost_thresholds"
ON cost_thresholds
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE claude_usage_history IS 'Tracks all Claude API usage with token counts and costs';
COMMENT ON TABLE credit_balance IS 'Stores current credit balance for API usage';
COMMENT ON TABLE cost_thresholds IS 'Defines cost alert thresholds for different periods';
