/*
# Khelnamart Phase 1a/1b schema expansion

## Overview
Adds 6 new tables to support the full MVP:
1. `customers` — customer profile (name, phone, default address, avatar)
2. `addresses` — saved delivery addresses for repeat checkout
3. `seller_payouts` — seller balance, settlement history, invoices
4. `notifications` — order updates, price alerts, general notices
5. `product_views` — track product page views for seller analytics
6. `featured_listings` — paid sponsored product placement on homepage

## New Tables

### customers
- id (uuid PK), user_id (uuid → auth.users, unique), full_name, phone, avatar_url, created_at
- One row per authenticated customer. Auto-created via default auth.uid().

### addresses
- id (uuid PK), user_id (uuid → auth.users), label, name, phone, address_line, city, is_default, created_at
- Multiple addresses per customer. is_default flags the preferred one.

### seller_payouts
- id (uuid PK), seller_id (uuid → sellers), amount, status (pending/paid/cancelled), period_start, period_end, payment_method, transaction_ref, created_at
- Tracks each settlement payout to a seller for their orders in a given period.

### notifications
- id (uuid PK), user_id (uuid → auth.users), type (order/price_alert/system/wishlist), title, body, link, is_read, created_at
- Per-user notifications for order updates, price drops, and system messages.

### product_views
- id (uuid PK), product_id (uuid → products), user_id (uuid nullable → auth.users), viewed_at
- Anonymous + authenticated view tracking for analytics. Used to compute view counts.

### featured_listings
- id (uuid PK), product_id (uuid → products), seller_id (uuid → sellers), placement (homepage/flash_sale/trending), start_date, end_date, is_active, created_at
- Paid promotional placements. A product can be featured on homepage, flash sale, or trending section.

## Security
- RLS enabled on all 6 tables.
- customers: owner-scoped CRUD (authenticated, auth.uid() = user_id).
- addresses: owner-scoped CRUD (authenticated, auth.uid() = user_id).
- seller_payouts: sellers can read their own payouts (EXISTS check on sellers.user_id = auth.uid()). No direct insert/update/delete from the client — payouts are created by the system/admin.
- notifications: owner-scoped SELECT + UPDATE (for marking read) + DELETE. INSERT is owner-scoped (for client-created notifications like price alerts).
- product_views: public INSERT (anon + authenticated, so anyone can record a view). SELECT restricted to the seller who owns the product (for analytics).
- featured_listings: public SELECT (anon + authenticated, so the storefront can display them). No client INSERT/UPDATE/DELETE — managed by admin.
*/

-- ============ CUSTOMERS ============
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_select_customer" ON customers;
CREATE POLICY "owner_select_customer" ON customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_insert_customer" ON customers;
CREATE POLICY "owner_insert_customer" ON customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_update_customer" ON customers;
CREATE POLICY "owner_update_customer" ON customers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_delete_customer" ON customers;
CREATE POLICY "owner_delete_customer" ON customers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ ADDRESSES ============
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  name text NOT NULL,
  phone text NOT NULL,
  address_line text NOT NULL,
  city text NOT NULL DEFAULT 'Dhaka',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_select_addresses" ON addresses;
CREATE POLICY "owner_select_addresses" ON addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_insert_addresses" ON addresses;
CREATE POLICY "owner_insert_addresses" ON addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_update_addresses" ON addresses;
CREATE POLICY "owner_update_addresses" ON addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_delete_addresses" ON addresses;
CREATE POLICY "owner_delete_addresses" ON addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SELLER_PAYOUTS ============
CREATE TABLE IF NOT EXISTS seller_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  period_start timestamptz,
  period_end timestamptz,
  payment_method text,
  transaction_ref text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seller_select_payouts" ON seller_payouts;
CREATE POLICY "seller_select_payouts" ON seller_payouts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM sellers s WHERE s.id = seller_payouts.seller_id AND s.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_payouts_seller ON seller_payouts(seller_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system' CHECK (type IN ('order','price_alert','system','wishlist')),
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_select_notifications" ON notifications;
CREATE POLICY "owner_select_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_insert_notifications" ON notifications;
CREATE POLICY "owner_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_update_notifications" ON notifications;
CREATE POLICY "owner_update_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_delete_notifications" ON notifications;
CREATE POLICY "owner_delete_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ============ PRODUCT_VIEWS ============
CREATE TABLE IF NOT EXISTS product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now()
);
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
-- Anyone can record a view (anon + authenticated)
DROP POLICY IF EXISTS "public_insert_views" ON product_views;
CREATE POLICY "public_insert_views" ON product_views FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Sellers can read views for their own products
DROP POLICY IF EXISTS "seller_select_views" ON product_views;
CREATE POLICY "seller_select_views" ON product_views FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM products p JOIN sellers s ON s.id = p.seller_id WHERE p.id = product_views.product_id AND s.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_views_product ON product_views(product_id);

-- ============ FEATURED_LISTINGS ============
CREATE TABLE IF NOT EXISTS featured_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  placement text NOT NULL DEFAULT 'homepage' CHECK (placement IN ('homepage','flash_sale','trending')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE featured_listings ENABLE ROW LEVEL SECURITY;
-- Public read so the storefront can display featured listings
DROP POLICY IF EXISTS "public_read_featured" ON featured_listings;
CREATE POLICY "public_read_featured" ON featured_listings FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE INDEX IF NOT EXISTS idx_featured_product ON featured_listings(product_id);
