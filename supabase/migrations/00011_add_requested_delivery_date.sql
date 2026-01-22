-- Migration: add requested_delivery_date to orders
-- Enables delivery scheduling in farm/admin dashboards.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS requested_delivery_date DATE;
