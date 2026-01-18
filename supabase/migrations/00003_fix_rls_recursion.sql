-- Migration: Fix RLS Policy Recursion (42P17)
-- 
-- Problem: RLS policies that check admin role by querying the profiles table
-- cause infinite recursion when profiles itself has RLS policies.
--
-- Solution: Create SECURITY DEFINER helper functions that bypass RLS when
-- checking the current user's role. These functions are safe because they
-- only read data for the authenticated user (auth.uid()).
--
-- This migration:
-- 1. Creates helper functions: get_my_role() and is_admin()
-- 2. Drops all policies that cause recursion
-- 3. Recreates them using the helper functions
-- 4. Preserves all public read policies for anonymous access

-- ============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- Get the current user's role from profiles table
-- Uses SECURITY DEFINER to bypass RLS (otherwise we'd have recursion)
-- Only returns role for the authenticated user, so it's safe
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Check if current user is an admin
-- Convenience wrapper around get_my_role()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_my_role() = 'admin', false)
$$;

-- Check if current user is a farm owner
CREATE OR REPLACE FUNCTION public.is_farm_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_my_role() = 'farm', false)
$$;

-- Grant execute to authenticated users and anon (needed for RLS evaluation)
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_farm_owner() TO authenticated;
-- Anon needs these too for when policies are evaluated during login flow
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_farm_owner() TO anon;

-- ============================================
-- DROP PROBLEMATIC POLICIES
-- ============================================

-- profiles policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- farms policies  
DROP POLICY IF EXISTS "Admins can read all farms" ON farms;
DROP POLICY IF EXISTS "Admins can update all farms" ON farms;

-- products policies
DROP POLICY IF EXISTS "Admins can read all products" ON products;

-- orders policies
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

-- order_items policies (the one with embedded admin check)
DROP POLICY IF EXISTS "Users can read order items via order access" ON order_items;

-- order_events policies
DROP POLICY IF EXISTS "Users can read order events via order access" ON order_events;
DROP POLICY IF EXISTS "Farms and admins can insert order events" ON order_events;

-- internal_notes policies
DROP POLICY IF EXISTS "Admins can read internal notes" ON internal_notes;
DROP POLICY IF EXISTS "Admins can insert internal notes" ON internal_notes;

-- ============================================
-- RECREATE POLICIES USING HELPER FUNCTIONS
-- ============================================

-- profiles: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

-- farms: Admins can read all farms
CREATE POLICY "Admins can read all farms"
  ON farms FOR SELECT
  USING (public.is_admin());

-- farms: Admins can update all farms
CREATE POLICY "Admins can update all farms"
  ON farms FOR UPDATE
  USING (public.is_admin());

-- products: Admins can read all products
CREATE POLICY "Admins can read all products"
  ON products FOR SELECT
  USING (public.is_admin());

-- orders: Admins can read all orders
CREATE POLICY "Admins can read all orders"
  ON orders FOR SELECT
  USING (public.is_admin());

-- orders: Admins can update all orders  
CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  USING (public.is_admin());

-- order_items: Users can read order items for orders they can see
-- Rewritten to use is_admin() instead of querying profiles
CREATE POLICY "Users can read order items via order access"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.customer_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM farms
          WHERE farms.id = orders.farm_id
          AND farms.owner_user_id = auth.uid()
        )
        OR public.is_admin()
      )
    )
  );

-- order_events: Users can read order events for orders they can see
CREATE POLICY "Users can read order events via order access"
  ON order_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_events.order_id
      AND (
        orders.customer_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM farms
          WHERE farms.id = orders.farm_id
          AND farms.owner_user_id = auth.uid()
        )
        OR public.is_admin()
      )
    )
  );

-- order_events: Farms and admins can insert order events
CREATE POLICY "Farms and admins can insert order events"
  ON order_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_events.order_id
      AND (
        EXISTS (
          SELECT 1 FROM farms
          WHERE farms.id = orders.farm_id
          AND farms.owner_user_id = auth.uid()
        )
        OR public.is_admin()
      )
    )
  );

-- internal_notes: Only admins can read
CREATE POLICY "Admins can read internal notes"
  ON internal_notes FOR SELECT
  USING (public.is_admin());

-- internal_notes: Only admins can insert
CREATE POLICY "Admins can insert internal notes"
  ON internal_notes FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================
-- VERIFICATION COMMENT
-- ============================================
-- 
-- After applying this migration:
-- 1. Anonymous users can SELECT approved farms (policy unchanged)
-- 2. Anonymous users can SELECT active products of approved farms (policy unchanged)
-- 3. Authenticated users with admin role can access everything
-- 4. No infinite recursion because is_admin() uses SECURITY DEFINER
--
-- To verify, run this query as anon:
--   SELECT count(*) FROM farms WHERE status = 'approved';
-- Should return the count without 42P17 error.
