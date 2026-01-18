-- Migration: Add email_outbox table and enhance orders
-- For email queue and structured address storage

-- ============================================
-- EMAIL OUTBOX TABLE
-- Used when RESEND_API_KEY is not set (dev mode)
-- ============================================

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  template_name TEXT, -- e.g. 'order_confirmation', 'new_order_farm'
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_created ON email_outbox(created_at DESC);

-- RLS for email_outbox: only admins can read, service role inserts
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email outbox"
  ON email_outbox FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow service role to insert (no auth.uid())
CREATE POLICY "Service role can insert email outbox"
  ON email_outbox FOR INSERT
  WITH CHECK (auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- ORDERS TABLE ENHANCEMENTS
-- ============================================

-- Add delivery_address_json column for structured address data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_address_json'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_address_json JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add customer_email_snapshot for emailing without auth lookup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_email_snapshot'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_email_snapshot TEXT;
  END IF;
END $$;

-- ============================================
-- FARMS TABLE ENHANCEMENTS
-- ============================================

-- Add contact_email for farm notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farms' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE farms ADD COLUMN contact_email TEXT;
  END IF;
END $$;

-- ============================================
-- STORAGE BUCKET POLICIES FOR FARM UPLOADS
-- ============================================

-- Note: Storage buckets are created via Supabase Dashboard or migrations
-- These policies allow farm owners to upload to their own folder

-- For farm-images bucket: farm owners can upload to their own farm folder
-- Policy structure: farm-images/{farm_id}/*

-- For product-images bucket: farm owners can upload to their farm's product folder
-- Policy structure: product-images/{farm_id}/*
