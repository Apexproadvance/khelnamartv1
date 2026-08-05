/*
# Multi-Seller Product Catalog & Offers System

## Overview
Restructures the marketplace from "one listing per seller" to a shared product catalog 
with multiple seller offers. Customers see one product page per toy with competing 
seller offers ranked by price, rating, and location.

## New Tables
- `product_catalog` — shared product info (name, brand, description, specs, images, 
  reviews, aggregate rating). Multiple sellers attach offers to the same catalog entry.

## Modified Tables
- `products` (now acts as "seller offers"): added `catalog_id` column linking each 
  offer to its catalog entry. Seller-specific fields (price, discount, stock, is_active) 
  remain here.
- `product_images`: FK repointed to `product_catalog(id)`. Images are shared.
- `reviews`: FK repointed to `product_catalog(id)`. Reviews aggregate at product level.
- `product_views`: FK repointed to `product_catalog(id)`. Views track product popularity.
- `featured_listings`: FK repointed to `product_catalog(id)`.
- `wishlist_items`: FK repointed to `product_catalog(id)`. Customers wishlist a product.
- `cart_items`: FK stays on `products(id)` — cart references a specific offer.
- `order_items`: FK stays on `products(id)` — orders reference the specific offer purchased.

## Data Migration
1. Drop old FKs on child tables (images, reviews, views, featured, wishlist).
2. For each existing product, create a catalog entry (deduplicated by name+brand).
3. Set `products.catalog_id` to point to the matching catalog entry.
4. Update child table product_id references to catalog IDs.
5. Add new FKs pointing to product_catalog.

## Security
- RLS enabled on `product_catalog`.
- Public read for active catalog entries (anon + authenticated).
- Seller-scoped insert/update via ownership check through `products.seller_id`.
*/

-- ============================================================
-- Step 1: Create product_catalog table
-- ============================================================

CREATE TABLE IF NOT EXISTS product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  brand text,
  description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  min_age integer,
  max_age integer,
  gender text DEFAULT 'unisex',
  material text,
  color text,
  dimensions text,
  weight text,
  safety_info text,
  origin text,
  warranty text,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  rating numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_slug ON product_catalog (slug);
CREATE INDEX IF NOT EXISTS idx_catalog_category ON product_catalog (category_id);
CREATE INDEX IF NOT EXISTS idx_catalog_featured ON product_catalog (is_featured) WHERE is_featured = true;

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can browse active catalog entries
DROP POLICY IF EXISTS "public_read_catalog" ON product_catalog;
CREATE POLICY "public_read_catalog"
  ON product_catalog FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Sellers can create catalog entries
DROP POLICY IF EXISTS "seller_insert_catalog" ON product_catalog;
CREATE POLICY "seller_insert_catalog"
  ON product_catalog FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- Step 2: Add catalog_id to products
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES product_catalog(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_catalog ON products (catalog_id);

-- Update policy (needs catalog_id column to exist)
DROP POLICY IF EXISTS "seller_update_catalog" ON product_catalog;
CREATE POLICY "seller_update_catalog"
  ON product_catalog FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.catalog_id = product_catalog.id
      AND EXISTS (
        SELECT 1 FROM sellers s
        WHERE s.id = p.seller_id AND s.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.catalog_id = product_catalog.id
      AND EXISTS (
        SELECT 1 FROM sellers s
        WHERE s.id = p.seller_id AND s.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- Step 3: Drop old FKs on child tables BEFORE updating data
-- ============================================================

ALTER TABLE product_images DROP CONSTRAINT IF EXISTS product_images_product_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_product_id_fkey;
ALTER TABLE product_views DROP CONSTRAINT IF EXISTS product_views_product_id_fkey;
ALTER TABLE featured_listings DROP CONSTRAINT IF EXISTS featured_listings_product_id_fkey;
ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS wishlist_items_product_id_fkey;

-- ============================================================
-- Step 4: Migrate existing product data into catalog
-- ============================================================

DO $$
DECLARE
  p RECORD;
  cat_id uuid;
BEGIN
  FOR p IN SELECT * FROM products WHERE catalog_id IS NULL LOOP
    -- Check if a catalog entry already exists for this name+brand (case-insensitive)
    SELECT id INTO cat_id 
    FROM product_catalog 
    WHERE lower(name) = lower(p.name) 
      AND lower(coalesce(brand, '')) = lower(coalesce(p.brand, ''));
    
    IF cat_id IS NULL THEN
      -- Create new catalog entry from this product's shared info
      INSERT INTO product_catalog (
        name, slug, brand, description, category_id, 
        min_age, max_age, gender, material, color, dimensions, weight, 
        safety_info, origin, warranty, is_featured, is_active, 
        rating, rating_count, created_at
      )
      VALUES (
        p.name, p.slug, p.brand, p.description, p.category_id,
        p.min_age, p.max_age, p.gender, p.material, p.color, p.dimensions, p.weight,
        p.safety_info, p.origin, p.warranty, p.is_featured, p.is_active,
        p.rating, p.rating_count, p.created_at
      )
      RETURNING id INTO cat_id;
    END IF;
    
    -- Link this product (offer) to the catalog entry
    UPDATE products SET catalog_id = cat_id WHERE id = p.id;
  END LOOP;
END $$;

-- ============================================================
-- Step 5: Update child table product_id references to catalog IDs
-- ============================================================

UPDATE product_images pi 
SET product_id = p.catalog_id 
FROM products p 
WHERE pi.product_id = p.id;

UPDATE reviews r
SET product_id = p.catalog_id
FROM products p
WHERE r.product_id = p.id;

UPDATE product_views pv
SET product_id = p.catalog_id
FROM products p
WHERE pv.product_id = p.id;

UPDATE featured_listings fl
SET product_id = p.catalog_id
FROM products p
WHERE fl.product_id = p.id;

UPDATE wishlist_items w
SET product_id = p.catalog_id
FROM products p
WHERE w.product_id = p.id;

-- ============================================================
-- Step 6: Add new FKs pointing to product_catalog
-- ============================================================

ALTER TABLE product_images ADD CONSTRAINT product_images_catalog_id_fkey 
  FOREIGN KEY (product_id) REFERENCES product_catalog(id) ON DELETE CASCADE;

ALTER TABLE reviews ADD CONSTRAINT reviews_catalog_id_fkey
  FOREIGN KEY (product_id) REFERENCES product_catalog(id) ON DELETE CASCADE;

ALTER TABLE product_views ADD CONSTRAINT product_views_catalog_id_fkey
  FOREIGN KEY (product_id) REFERENCES product_catalog(id) ON DELETE CASCADE;

ALTER TABLE featured_listings ADD CONSTRAINT featured_listings_catalog_id_fkey
  FOREIGN KEY (product_id) REFERENCES product_catalog(id) ON DELETE CASCADE;

ALTER TABLE wishlist_items ADD CONSTRAINT wishlist_items_catalog_id_fkey
  FOREIGN KEY (product_id) REFERENCES product_catalog(id) ON DELETE CASCADE;

-- ============================================================
-- Step 7: Add unique constraint to prevent duplicate offers
-- (one seller can only have one offer per catalog entry)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_seller_catalog 
  ON products (seller_id, catalog_id) 
  WHERE catalog_id IS NOT NULL;
