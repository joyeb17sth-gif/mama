-- Create the profit_loss table for storing P&L data
-- Follows the same encrypted single-row pattern as all other data tables

CREATE TABLE IF NOT EXISTS profit_loss (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update the updated_at timestamp on every upsert
CREATE OR REPLACE FUNCTION update_profit_loss_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profit_loss_updated_at
  BEFORE UPDATE ON profit_loss
  FOR EACH ROW
  EXECUTE FUNCTION update_profit_loss_timestamp();

-- Enable Row Level Security
ALTER TABLE profit_loss ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated" ON profit_loss
  FOR ALL USING (auth.role() = 'authenticated');
