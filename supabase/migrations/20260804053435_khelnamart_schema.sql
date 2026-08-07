/*
# Khelnamart marketplace schema

## Overview
Creates the core tables for a toy marketplace: categories, sellers (stores),
products, product images, reviews, cart, orders, order items, wishlist,
and coupons. Designed as a public marketplace catalog with authenticated
customer/seller accounts.

## New Tables
1. `categories` — toy categories (e.g. Building Blocks, Dolls, RC). Self-referencing parent_id for subcategories.
2. `sellers` — toy retail stores. Linked to auth.users for seller accounts. Includes store name, slug, city, rating, verified flag.
3. `products` — toys listed by sellers. Linked to category and seller. Price, discount, stock, age range, brand, material, safety info.
4. `product_images` — multiple images per product.
5. `reviews` — customer reviews with star rating, linked to product + reviewer.
6. `cart_items` — shopping cart for authenticated customers.
7. `orders` — customer orders with status tracking and payment method.
8. `order_items` — line items within an order (snapshot of product at purchase time).
9. `wishlist_items` — saved products for authenticated customers.
10. `coupons` — discount codes.

## Security
- RLS enabled on all tables.
- Catalog tables (categories, products, product_images, reviews, sellers, coupons) are publicly readable (anon + authenticated) so the storefront works without login.
- All products/images/reviews: public SELECT; INSERT/UPDATE/DELETE restricted to the owning seller (products, images) or reviewer (reviews).
- Cart, wishlist: owner-scoped to authenticated customer via auth.uid().
- Orders + order_items: owner-scoped to the customer. Sellers can read order_items for their own products (via EXISTS check).
- Seller profile rows: the seller themselves can update their own store info.
*/

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT TO anon, authenticated USING (true);

-- ============ SELLERS ============
CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  city text NOT NULL DEFAULT 'Dhaka',
  address text,
  phone text,
  logo_url text,
  banner_url text,
  rating numeric(2,1) NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_sellers" ON sellers;
CREATE POLICY "public_read_sellers" ON sellers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "owner_insert_seller" ON sellers;
CREATE POLICY "owner_insert_seller" ON sellers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_update_seller" ON sellers;
CREATE POLICY "owner_update_seller" ON sellers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PRODUCTS ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  brand text,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  stock int NOT NULL DEFAULT 0,
  min_age int,
  max_age int,
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
  rating numeric(2,1) NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "seller_insert_product" ON products;
CREATE POLICY "seller_insert_product" ON products FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM sellers s WHERE s.id = seller_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "seller_update_product" ON products;
CREATE POLICY "seller_update_product" ON products FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM sellers s WHERE s.id = seller_id AND s.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM sellers s WHERE s.id = seller_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "seller_delete_product" ON products;
CREATE POLICY "seller_delete_product" ON products FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM sellers s WHERE s.id = seller_id AND s.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- ============ PRODUCT IMAGES ============
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_product_images" ON product_images;
CREATE POLICY "public_read_product_images" ON product_images FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "seller_insert_product_image" ON product_images;
CREATE POLICY "seller_insert_product_image" ON product_images FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM products p JOIN sellers s ON s.id = p.seller_id WHERE p.id = product_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "seller_delete_product_image" ON product_images;
CREATE POLICY "seller_delete_product_image" ON product_images FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM products p JOIN sellers s ON s.id = p.seller_id WHERE p.id = product_id AND s.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  body text,
  is_verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_reviews" ON reviews;
CREATE POLICY "public_read_reviews" ON reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "owner_insert_review" ON reviews;
CREATE POLICY "owner_insert_review" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_delete_review" ON reviews;
CREATE POLICY "owner_delete_review" ON reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ============ CART ITEMS ============
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_select_cart" ON cart_items;
CREATE POLICY "owner_select_cart" ON cart_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_insert_cart" ON cart_items;
CREATE POLICY "owner_insert_cart" ON cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_update_cart" ON cart_items;
CREATE POLICY "owner_update_cart" ON cart_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_delete_cart" ON cart_items;
CREATE POLICY "owner_delete_cart" ON cart_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ ORDERS ============
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','packed','shipped','out_for_delivery','delivered','cancelled')),
  total numeric(10,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  shipping numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed')),
  shipping_name text NOT NULL,
  shipping_phone text NOT NULL,
  shipping_address text NOT NULL,
  shipping_city text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_select_orders" ON orders;
CREATE POLICY "owner_select_orders" ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_insert_orders" ON orders;
CREATE POLICY "owner_insert_orders" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_update_orders" ON orders;
CREATE POLICY "owner_update_orders" ON orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ORDER ITEMS ============
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_image text,
  price numeric(10,2) NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','packed','ready','completed','cancelled')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_select_order_items" ON order_items;
CREATE POLICY "owner_select_order_items" ON order_items FOR SELECT TO authenticated USING (
  auth.uid() = (SELECT user_id FROM orders WHERE orders.id = order_id)
  OR EXISTS (SELECT 1 FROM sellers s WHERE s.id = order_items.seller_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "owner_insert_order_items" ON order_items;
CREATE POLICY "owner_insert_order_items" ON order_items FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = (SELECT user_id FROM orders WHERE orders.id = order_id)
);
DROP POLICY IF EXISTS "seller_update_order_items" ON order_items;
CREATE POLICY "seller_update_order_items" ON order_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM sellers s WHERE s.id = order_items.seller_id AND s.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM sellers s WHERE s.id = order_items.seller_id AND s.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller ON order_items(seller_id);

-- ============ WISHLIST ============
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_select_wishlist" ON wishlist_items;
CREATE POLICY "owner_select_wishlist" ON wishlist_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_insert_wishlist" ON wishlist_items;
CREATE POLICY "owner_insert_wishlist" ON wishlist_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner_delete_wishlist" ON wishlist_items;
CREATE POLICY "owner_delete_wishlist" ON wishlist_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ COUPONS ============
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  max_discount numeric(10,2),
  min_order numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_coupons" ON coupons;
CREATE POLICY "public_read_coupons" ON coupons FOR SELECT TO anon, authenticated USING (is_active = true);
