-- Migration: Fix Public Farm Access for Anonymous Users
-- 
-- Problem: Anonymous users cannot view farms on /farms or /farm/[slug] pages.
-- 
-- Root cause analysis:
-- 1. RLS policies on farms and products may not correctly allow anon SELECT
-- 2. Helper functions (is_admin, get_my_role) may fail for anon users
-- 3. Subqueries in product policies might cause issues
--
-- This migration ensures:
-- 1. Anon users can SELECT approved farms
-- 2. Anon users can SELECT active products of approved farms
-- 3. Helper functions gracefully handle anon (auth.uid() = NULL)

-- ============================================
-- FIX HELPER FUNCTIONS FOR ANON USERS
-- ============================================

-- Update get_my_role to handle NULL auth.uid() gracefully
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Update is_admin to explicitly return false for anon
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE COALESCE(public.get_my_role() = 'admin', false)
  END
$$;

-- Update is_farm_owner to explicitly return false for anon
CREATE OR REPLACE FUNCTION public.is_farm_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE COALESCE(public.get_my_role() = 'farm', false)
  END
$$;

-- Ensure anon role has execute permission on helper functions
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_farm_owner() TO anon;

-- ============================================
-- VERIFY/RECREATE FARMS PUBLIC READ POLICY
-- ============================================

-- Drop and recreate the public farms policy to ensure it's correct
DROP POLICY IF EXISTS "Anyone can read approved farms" ON farms;

-- This policy allows anyone (including anon) to read approved farms
CREATE POLICY "Anyone can read approved farms"
  ON farms FOR SELECT
  USING (status = 'approved');

-- ============================================
-- VERIFY/RECREATE PRODUCTS PUBLIC READ POLICY  
-- ============================================

-- Drop and recreate the public products policy
DROP POLICY IF EXISTS "Anyone can read active products of approved farms" ON products;

-- This policy allows anyone (including anon) to read active products of approved farms
-- The subquery to farms table is allowed because anon can read approved farms
CREATE POLICY "Anyone can read active products of approved farms"
  ON products FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = products.farm_id
      AND farms.status = 'approved'
    )
  );

-- ============================================
-- GRANT SELECT PERMISSIONS TO ANON
-- ============================================

-- Ensure anon role has SELECT permission on the tables
-- (This should already exist but making it explicit)
GRANT SELECT ON public.farms TO anon;
GRANT SELECT ON public.products TO anon;

-- ============================================
-- VERIFICATION QUERIES (run these manually to test)
-- ============================================
-- 
-- As anon user (or via anon key):
-- 
-- 1. Check farms access:
--    SELECT id, name, slug, status FROM farms WHERE status = 'approved' LIMIT 5;
--
-- 2. Check products access:
--    SELECT p.id, p.name, f.name as farm_name 
--    FROM products p 
--    JOIN farms f ON f.id = p.farm_id 
--    WHERE p.is_active = true AND f.status = 'approved' 
--    LIMIT 5;
--
-- 3. Check is_admin returns false for anon:
--    SELECT public.is_admin(); -- should return false
--
-- Expected results:
-- - Query 1: Returns approved farms
-- - Query 2: Returns active products from approved farms  
-- - Query 3: Returns false
