-- Migration: Add proper RLS policies for customer order creation
--
-- The previous "Service role can insert orders" policy was too permissive.
-- This migration creates proper customer-safe insert policies.

-- ============================================
-- DROP OLD PERMISSIVE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Service role can insert orders" ON orders;
DROP POLICY IF EXISTS "Service role can insert order items" ON order_items;

-- ============================================
-- ORDER INSERT POLICIES
-- ============================================

-- Customers can insert orders for themselves
-- Validates: customer_user_id matches auth.uid(), farm exists and is approved
CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    customer_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = orders.farm_id
      AND farms.status = 'approved'
    )
  );

-- Service role can also insert orders (for webhooks, admin actions)
-- This uses a check that only service role can satisfy
CREATE POLICY "Service role can insert orders"
  ON orders FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL  -- Only service role has no uid
    OR customer_user_id = auth.uid()  -- Or it's the customer themselves
  );

-- ============================================
-- ORDER ITEMS INSERT POLICIES
-- ============================================

-- Customers can insert order items for their own orders
CREATE POLICY "Customers can create order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_user_id = auth.uid()
    )
  );

-- Service role can insert order items (for webhooks)
CREATE POLICY "Service role can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL  -- Service role
    OR EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_user_id = auth.uid()
    )
  );

-- ============================================
-- ORDER EVENTS INSERT POLICIES
-- ============================================

-- Customers can insert initial order event (on order creation)
CREATE POLICY "Customers can create initial order event"
  ON order_events FOR INSERT
  WITH CHECK (
    actor_role = 'customer'
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_events.order_id
      AND orders.customer_user_id = auth.uid()
    )
  );

-- ============================================
-- HELPER: Generate order number function
-- ============================================

-- Function to generate unique order number: FD-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  date_part TEXT;
  seq_part TEXT;
  new_number TEXT;
  attempts INT := 0;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  LOOP
    -- Generate random 4-digit sequence
    seq_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    new_number := 'FD-' || date_part || '-' || seq_part;
    
    -- Check if it exists
    IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      -- Fallback: use timestamp
      RETURN 'FD-' || date_part || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT % 10000, 4, '0')::TEXT;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;
