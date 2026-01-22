-- FairFarm Initial Schema
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
