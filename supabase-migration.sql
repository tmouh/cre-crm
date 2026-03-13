-- ============================================================================
-- CRE CRM — Capital Markets Upgrade Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ─── 1. Add financial fields to properties (deals) ─────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cap_rate numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS noi numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_per_sf numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ltv numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS dscr numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS asking_price numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS closing_date timestamptz;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS year_built integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS market text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS submarket text;
-- Capital stack
ALTER TABLE properties ADD COLUMN IF NOT EXISTS senior_debt_amount numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS senior_debt_rate numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mezz_amount numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mezz_rate numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pref_equity_amount numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pref_equity_rate numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS jv_equity_amount numeric;
-- Stage tracking
ALTER TABLE properties ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS stage_history jsonb DEFAULT '[]'::jsonb;

-- ─── 2. Comps table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  address text NOT NULL,
  property_type text,
  sale_price numeric,
  cap_rate numeric,
  price_per_sf numeric,
  noi numeric,
  size numeric,
  size_unit text DEFAULT 'SF',
  sale_date timestamptz,
  buyer text,
  seller text,
  market text,
  submarket text,
  year_built integer,
  notes text,
  tags text[] DEFAULT '{}',
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE comps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comps_all" ON comps FOR ALL USING (true) WITH CHECK (true);

-- ─── 3. Investors table (investor profiles on companies) ───────────────────
CREATE TABLE IF NOT EXISTS investors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  property_types text[] DEFAULT '{}',
  min_deal_size numeric,
  max_deal_size numeric,
  target_markets text[] DEFAULT '{}',
  target_returns text,
  investment_criteria text,
  capital_type text,
  notes text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investors_all" ON investors FOR ALL USING (true) WITH CHECK (true);

-- ─── 4. Deal investors (bid/interest tracking per deal) ────────────────────
CREATE TABLE IF NOT EXISTS deal_investors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  status text DEFAULT 'contacted',
  bid_amount numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deal_investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_investors_all" ON deal_investors FOR ALL USING (true) WITH CHECK (true);

-- ─── 5. Workflow automations table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_value text,
  action_type text NOT NULL,
  action_config jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automations_all" ON automations FOR ALL USING (true) WITH CHECK (true);

-- ─── 6. Indexes ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comps_property_type ON comps(property_type);
CREATE INDEX IF NOT EXISTS idx_comps_market ON comps(market);
CREATE INDEX IF NOT EXISTS idx_comps_sale_date ON comps(sale_date);
CREATE INDEX IF NOT EXISTS idx_investors_company ON investors(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_investors_property ON deal_investors(property_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_deal_type ON properties(deal_type);
CREATE INDEX IF NOT EXISTS idx_properties_market ON properties(market);
