/*
# Admin Moderation System

## Overview
Adds the tables, functions, and policies needed for marketplace administrators
to approve/verify/suspend sellers, moderate catalog entries, and resolve
customer/seller dispute reports.

## New Tables
1. `admins` — links an auth.users account to an admin role. One row per admin
   user. `is_super` flags the primary admin who can manage other admins.
2. `reports` — dispute / moderation tickets filed by customers or sellers
   against a product, seller, or order. Has a status (open / investigating /
   resolved / dismissed), a priority (low / medium / high), a category
   (counterfeit / inappropriate / broken / dispute / other), a reporter_user_id,
   and optional target references (reported_seller_id, reported_product_id,
   order_id). Includes `resolution_note` for admin notes.

## New Functions (SECURITY DEFINER)
All admin actions run as SECURITY DEFINER so the browser (anon-key client)
can call them via `.rpc()` while the underlying tables stay locked behind RLS.
Each function verifies the caller is an admin before mutating anything.
1. `is_admin()` — returns true if the calling user has a row in `admins`.
2. `admin_set_seller_verified(seller_id, verified)` — set the `verified` flag
   on a seller row.
3. `admin_set_seller_active(seller_id, is_active)` — activate or suspend a
   seller store.
4. `admin_set_catalog_active(catalog_id, is_active)` — activate or deactivate
   a catalog entry (moderate/take down a product).
5. `admin_set_catalog_featured(catalog_id, is_featured)` — feature or unfeature
   a catalog entry on the homepage.
6. `admin_update_report(report_id, status, priority, resolution_note)` — update
   a report's status, priority, and admin resolution note.

## Security
- RLS enabled on `admins` and `reports`.
- `admins`: any authenticated user can read the table (needed so the frontend
  can check `is_admin` via the RPC function); only the database/SECURITY
  DEFINER functions can insert/update/delete (no direct client writes).
- `reports`: any authenticated user can INSERT (file a report about their own
  order/interaction); only admin users (checked via `is_admin()`) can SELECT,
  UPDATE. The reporter can also SELECT their own reports.
- All mutations on `sellers` and `product_catalog` that are admin-only go
  through SECURITY DEFINER functions, not through RLS policies, so the
  existing seller/owner-scoped policies on those tables remain unchanged.
*/

-- ============================================================
-- 1. admins table
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read admins (needed to check admin status via RPC)
DROP POLICY IF EXISTS "authenticated_read_admins" ON admins;
CREATE POLICY "authenticated_read_admins"
  ON admins FOR SELECT TO authenticated USING (true);

-- No direct INSERT/UPDATE/DELETE from the client — managed via SQL/SECURITY DEFINER

-- ============================================================
-- 2. reports table
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('counterfeit','inappropriate','broken','dispute','spam','other')),
  subject text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
  reported_seller_id uuid REFERENCES sellers(id) ON DELETE SET NULL,
  reported_product_id uuid REFERENCES product_catalog(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can file a report
DROP POLICY IF EXISTS "auth_insert_reports" ON reports;
CREATE POLICY "auth_insert_reports"
  ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_user_id);

-- Admins can read all reports; reporters can read their own
DROP POLICY IF EXISTS "admin_or_reporter_select_reports" ON reports;
CREATE POLICY "admin_or_reporter_select_reports"
  ON reports FOR SELECT TO authenticated USING (
    auth.uid() = reporter_user_id
    OR EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );

-- Only admins can update reports (status, priority, resolution)
DROP POLICY IF EXISTS "admin_update_reports" ON reports;
CREATE POLICY "admin_update_reports"
  ON reports FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_user_id);

-- ============================================================
-- 3. is_admin() helper function
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
$$;

-- ============================================================
-- 4. Admin action: set seller verified
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_seller_verified(p_seller_id uuid, p_verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  UPDATE sellers SET verified = p_verified WHERE id = p_seller_id;
END;
$$;

-- ============================================================
-- 5. Admin action: set seller active/suspended
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_seller_active(p_seller_id uuid, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  UPDATE sellers SET is_active = p_is_active WHERE id = p_seller_id;
END;
$$;

-- ============================================================
-- 6. Admin action: set catalog entry active/inactive (moderation)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_catalog_active(p_catalog_id uuid, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  UPDATE product_catalog SET is_active = p_is_active WHERE id = p_catalog_id;
END;
$$;

-- ============================================================
-- 7. Admin action: set catalog entry featured
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_catalog_featured(p_catalog_id uuid, p_is_featured boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  UPDATE product_catalog SET is_featured = p_is_featured WHERE id = p_catalog_id;
END;
$$;

-- ============================================================
-- 8. Admin action: update report
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_report(
  p_report_id uuid,
  p_status text,
  p_priority text DEFAULT NULL,
  p_resolution_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  UPDATE reports
  SET
    status = p_status,
    priority = COALESCE(p_priority, priority),
    resolution_note = COALESCE(p_resolution_note, resolution_note),
    updated_at = now()
  WHERE id = p_report_id;
END;
$$;

-- ============================================================
-- 9. Admin-only SELECT policies for sellers and product_catalog
-- Admins need to see ALL sellers (including inactive) and ALL catalog entries
-- (including inactive) for moderation. The existing public_read policies only
-- show active rows. We add admin SELECT policies that run alongside them.
-- ============================================================
DROP POLICY IF EXISTS "admin_read_all_sellers" ON sellers;
CREATE POLICY "admin_read_all_sellers"
  ON sellers FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_read_all_catalog" ON product_catalog;
CREATE POLICY "admin_read_all_catalog"
  ON product_catalog FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );

-- Admins also need to read all orders (for dispute resolution context)
DROP POLICY IF EXISTS "admin_read_all_orders" ON orders;
CREATE POLICY "admin_read_all_orders"
  ON orders FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );

-- Admins need to read all order_items (for dispute context)
DROP POLICY IF EXISTS "admin_read_all_order_items" ON order_items;
CREATE POLICY "admin_read_all_order_items"
  ON order_items FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );

-- Admins need to read all products (including inactive) for moderation
DROP POLICY IF EXISTS "admin_read_all_products" ON products;
CREATE POLICY "admin_read_all_products"
  ON products FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );

-- Admins need to read all reviews (for moderation)
DROP POLICY IF EXISTS "admin_read_all_reviews" ON reviews;
CREATE POLICY "admin_read_all_reviews"
  ON reviews FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );

-- Admins need to read all product_images (including for inactive products)
DROP POLICY IF EXISTS "admin_read_all_product_images" ON product_images;
CREATE POLICY "admin_read_all_product_images"
  ON product_images FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );

-- Admins need to read customers (for dispute resolution)
DROP POLICY IF EXISTS "admin_read_all_customers" ON customers;
CREATE POLICY "admin_read_all_customers"
  ON customers FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
  );
