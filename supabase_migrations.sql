
> farmdirect@0.1.0 db:print-migrations /Users/arturocano/FarmDirect
> tsx scripts/print-migrations.ts

-- ============================================
-- Farmlink Database Migrations
-- ============================================
--
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Paste this entire output
-- 5. Click 'Run' to execute
--
-- This script contains the following migrations:
--   - 00001_initial_schema.sql
--   - 00002_storage_buckets.sql
--   - 00003_fix_rls_recursion.sql
--   - 00004_order_insert_policies.sql
--   - 00005_addresses.sql
--   - 00006_email_outbox_and_order_enhancements.sql
--   - 00007_fix_public_farm_access.sql
--
-- ============================================

-- ============================================
-- Migration 1/7: 00001_initial_schema.sql
-- ============================================

-- Farmlink Initial Schema
-- This migration creates all core tables, enums, and RLS policies

-- ============================================
-- ENUMS
-- ============================================

-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'farm', 'admin');

-- Farm approval status
CREATE TYPE farm_status AS ENUM ('pending', 'approved', 'suspended');

-- Order fulfillment status
CREATE TYPE order_status AS ENUM (
  'processing',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'exception'
);

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Farms
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  story TEXT,
  short_description TEXT,
  hero_image_url TEXT,
  logo_url TEXT,
  address TEXT,
  postcode TEXT,
  postcode_rules TEXT[], -- Array of postcodes the farm delivers to
  badges TEXT[], -- Array of badge identifiers
  delivery_days TEXT[], -- Array of day names (e.g., 'Monday', 'Wednesday')
  cutoff_time TIME, -- Order cutoff time
  min_order_value INTEGER, -- In pence
  delivery_fee INTEGER DEFAULT 0, -- In pence
  status farm_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price INTEGER NOT NULL, -- In pence
  unit_label TEXT NOT NULL, -- e.g., 'per kg', 'per pack'
  weight_label TEXT, -- e.g., '500g', '1kg'
  stock_qty INTEGER, -- NULL means unlimited
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_user_id UUID NOT NULL REFERENCES profiles(id),
  farm_id UUID NOT NULL REFERENCES farms(id),
  status order_status NOT NULL DEFAULT 'processing',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  subtotal INTEGER NOT NULL, -- In pence
  delivery_fee INTEGER NOT NULL DEFAULT 0, -- In pence
  total INTEGER NOT NULL, -- In pence
  delivery_address TEXT NOT NULL,
  delivery_notes TEXT,
  delivery_window TEXT, -- e.g., 'Wednesday 2-6pm'
  stripe_checkout_session_id TEXT UNIQUE, -- For idempotency
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order Items (snapshots product data at time of order)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  price_snapshot INTEGER NOT NULL, -- In pence
  quantity INTEGER NOT NULL,
  unit_snapshot TEXT NOT NULL,
  weight_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order Events (audit trail for status changes)
CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES profiles(id),
  actor_role user_role NOT NULL,
  status_from order_status,
  status_to order_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Internal Notes (admin-only notes on orders)
CREATE TABLE internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES profiles(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);

-- Farms
CREATE INDEX idx_farms_owner ON farms(owner_user_id);
CREATE INDEX idx_farms_status ON farms(status);
CREATE INDEX idx_farms_slug ON farms(slug);

-- Products
CREATE INDEX idx_products_farm ON products(farm_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_farm_active ON products(farm_id, is_active);

-- Orders
CREATE INDEX idx_orders_customer ON orders(customer_user_id);
CREATE INDEX idx_orders_farm ON orders(farm_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_stripe_session ON orders(stripe_checkout_session_id);

-- Order Items
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Order Events
CREATE INDEX idx_order_events_order ON order_events(order_id);

-- Internal Notes
CREATE INDEX idx_internal_notes_order ON internal_notes(order_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_farms_updated_at
  BEFORE UPDATE ON farms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: profiles
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS POLICIES: farms
-- ============================================

-- Anyone can read approved farms
CREATE POLICY "Anyone can read approved farms"
  ON farms FOR SELECT
  USING (status = 'approved');

-- Farm owners can read their own farm (any status)
CREATE POLICY "Farm owners can read own farm"
  ON farms FOR SELECT
  USING (owner_user_id = auth.uid());

-- Farm owners can insert their own farm
CREATE POLICY "Farm owners can create farm"
  ON farms FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Farm owners can update their own farm
CREATE POLICY "Farm owners can update own farm"
  ON farms FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Admins can read all farms
CREATE POLICY "Admins can read all farms"
  ON farms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all farms
CREATE POLICY "Admins can update all farms"
  ON farms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS POLICIES: products
-- ============================================

-- Anyone can read active products of approved farms
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

-- Farm owners can read all their products
CREATE POLICY "Farm owners can read own products"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = products.farm_id
      AND farms.owner_user_id = auth.uid()
    )
  );

-- Farm owners can insert products
CREATE POLICY "Farm owners can create products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = products.farm_id
      AND farms.owner_user_id = auth.uid()
    )
  );

-- Farm owners can update their products
CREATE POLICY "Farm owners can update own products"
  ON products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = products.farm_id
      AND farms.owner_user_id = auth.uid()
    )
  );

-- Farm owners can delete their products
CREATE POLICY "Farm owners can delete own products"
  ON products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = products.farm_id
      AND farms.owner_user_id = auth.uid()
    )
  );

-- Admins can read all products
CREATE POLICY "Admins can read all products"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS POLICIES: orders
-- ============================================

-- Customers can read their own orders
CREATE POLICY "Customers can read own orders"
  ON orders FOR SELECT
  USING (customer_user_id = auth.uid());

-- Farms can read orders for their farm
CREATE POLICY "Farms can read farm orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = orders.farm_id
      AND farms.owner_user_id = auth.uid()
    )
  );

-- Farms can update order status for their orders
CREATE POLICY "Farms can update farm order status"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = orders.farm_id
      AND farms.owner_user_id = auth.uid()
    )
  );

-- Admins can read all orders
CREATE POLICY "Admins can read all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all orders
CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert orders (for webhooks via service role)
CREATE POLICY "Service role can insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES: order_items
-- ============================================

-- Users can read order items for orders they can see
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
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Service role can insert order items
CREATE POLICY "Service role can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES: order_events
-- ============================================

-- Users can read order events for orders they can see
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
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Farms and admins can insert order events
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
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- ============================================
-- RLS POLICIES: internal_notes
-- ============================================

-- Only admins can read internal notes
CREATE POLICY "Admins can read internal notes"
  ON internal_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert internal notes
CREATE POLICY "Admins can insert internal notes"
  ON internal_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );



-- ============================================
-- Migration 2/7: 00002_storage_buckets.sql
-- ============================================

-- Farmlink Storage Buckets
-- Creates storage buckets for farm and product images

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Farm images bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('farm-images', 'farm-images', true)
ON CONFLICT (id) DO NOTHING;

-- Product images bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES: farm-images
-- ============================================

-- Anyone can view farm images
CREATE POLICY "Anyone can view farm images"
ON storage.objects FOR SELECT
USING (bucket_id = 'farm-images');

-- Farm owners can upload their own farm images
CREATE POLICY "Farm owners can upload farm images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'farm-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can update their own farm images
CREATE POLICY "Farm owners can update farm images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'farm-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can delete their own farm images
CREATE POLICY "Farm owners can delete farm images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'farm-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Admins can manage all farm images
CREATE POLICY "Admins can manage farm images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'farm-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- STORAGE POLICIES: product-images
-- ============================================

-- Anyone can view product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Farm owners can upload their own product images
CREATE POLICY "Farm owners can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can update their own product images
CREATE POLICY "Farm owners can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can delete their own product images
CREATE POLICY "Farm owners can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Admins can manage all product images
CREATE POLICY "Admins can manage product images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);



-- ============================================
-- Migration 3/7: 00003_fix_rls_recursion.sql
-- ============================================

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



-- ============================================
-- Migration 4/7: 00004_order_insert_policies.sql
-- ============================================

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



-- ============================================
-- Migration 5/7: 00005_addresses.sql
-- ============================================

-- Migration: Add customer addresses table
-- Allows customers to save delivery addresses for reuse

-- ============================================
-- ADDRESSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home', -- Home, Work, Other
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  county TEXT,
  postcode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United Kingdom',
  is_default BOOLEAN NOT NULL DEFAULT false,
  -- Structured data for future use
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_default ON addresses(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_addresses_postcode ON addresses(postcode);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Ensure only one default address per user
-- ============================================

CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this address as default, unset all others
  IF NEW.is_default = true THEN
    UPDATE addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_address_trigger ON addresses;
CREATE TRIGGER ensure_single_default_address_trigger
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_address();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Users can read their own addresses
CREATE POLICY "Users can read own addresses"
  ON addresses FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own addresses
CREATE POLICY "Users can create own addresses"
  ON addresses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own addresses
CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (user_id = auth.uid());

-- Admins can read all addresses
CREATE POLICY "Admins can read all addresses"
  ON addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );



-- ============================================
-- Migration 6/7: 00006_email_outbox_and_order_enhancements.sql
-- ============================================

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



-- ============================================
-- Migration 7/7: 00007_fix_public_farm_access.sql
-- ============================================

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



-- ============================================
-- End of migrations
-- ============================================
