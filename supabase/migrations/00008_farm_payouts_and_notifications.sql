-- Farm Payouts Table and Notification Preferences
-- This migration adds:
-- 1. farm_payouts table for storing payout/bank details
-- 2. receive_order_emails column to farms table
-- 3. contact_email column to farms table (if not exists)

-- ============================================
-- Add contact_email and receive_order_emails to farms
-- ============================================

-- Add contact_email if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farms' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE farms ADD COLUMN contact_email TEXT;
  END IF;
END $$;

-- Add receive_order_emails if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farms' AND column_name = 'receive_order_emails'
  ) THEN
    ALTER TABLE farms ADD COLUMN receive_order_emails BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================
-- Farm Payouts Table
-- ============================================

-- Create farm_payouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS farm_payouts (
  farm_id UUID PRIMARY KEY REFERENCES farms(id) ON DELETE CASCADE,
  payout_method TEXT NOT NULL DEFAULT 'bank_transfer',
  account_holder_name TEXT,
  sort_code TEXT, -- UK sort code (6 digits)
  account_number_last4 TEXT, -- Only store last 4 digits for security
  bank_name TEXT,
  stripe_account_id TEXT, -- For future Stripe Connect integration
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_farm_payouts_farm ON farm_payouts(farm_id);

-- ============================================
-- RLS Policies for farm_payouts
-- ============================================

-- Enable RLS
ALTER TABLE farm_payouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Farm owners can read their payout settings" ON farm_payouts;
DROP POLICY IF EXISTS "Farm owners can insert their payout settings" ON farm_payouts;
DROP POLICY IF EXISTS "Farm owners can update their payout settings" ON farm_payouts;
DROP POLICY IF EXISTS "Admins can read all payout settings" ON farm_payouts;

-- Farm owner can read their own payout settings
CREATE POLICY "Farm owners can read their payout settings"
  ON farm_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_payouts.farm_id
      AND farms.owner_user_id = auth.uid()
    )
  );

-- Farm owner can insert their payout settings
CREATE POLICY "Farm owners can insert their payout settings"
  ON farm_payouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_payouts.farm_id
      AND farms.owner_user_id = auth.uid()
    )
  );

-- Farm owner can update their payout settings
CREATE POLICY "Farm owners can update their payout settings"
  ON farm_payouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_payouts.farm_id
      AND farms.owner_user_id = auth.uid()
    )
  );

-- Admins can read all payout settings
CREATE POLICY "Admins can read all payout settings"
  ON farm_payouts FOR SELECT
  USING (public.is_admin());

-- ============================================
-- Updated at trigger for farm_payouts
-- ============================================

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_farm_payouts_updated_at ON farm_payouts;
CREATE TRIGGER update_farm_payouts_updated_at
  BEFORE UPDATE ON farm_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================
-- This migration adds:
-- 1. farms.contact_email (for order notifications)
-- 2. farms.receive_order_emails (boolean toggle)
-- 3. farm_payouts table with RLS policies
-- 
-- Farm owners can only read/write their own payout settings
-- Admins can read all payout settings
