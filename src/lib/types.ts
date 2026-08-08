export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
}

export interface Seller {
  id: string;
  user_id: string;
  store_name: string;
  slug: string;
  description: string | null;
  city: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  banner_url: string | null;
  rating: number;
  rating_count: number;
  verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

/** Shared catalog entry — one per toy, multiple sellers attach offers to it */
export interface ProductCatalog {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  category_id: string | null;
  min_age: number | null;
  max_age: number | null;
  gender: string;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  weight: string | null;
  safety_info: string | null;
  origin: string | null;
  warranty: string | null;
  is_featured: boolean;
  is_active: boolean;
  rating: number;
  rating_count: number;
  created_at: string;
  product_images?: ProductImage[];
  categories?: Category;
  /** Nested offers from multiple sellers */
  products?: SellerOffer[];
}

/** A seller's offer for a catalog product — has price, stock, discount */
export interface SellerOffer {
  id: string;
  seller_id: string;
  catalog_id: string | null;
  category_id: string | null;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  price: number;
  discount_percent: number;
  stock: number;
  min_age: number | null;
  max_age: number | null;
  gender: string;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  weight: string | null;
  safety_info: string | null;
  origin: string | null;
  warranty: string | null;
  is_featured: boolean;
  is_active: boolean;
  rating: number;
  rating_count: number;
  created_at: string;
  sellers?: Seller;
  categories?: Category;
  product_catalog?: ProductCatalog;
}

/** Legacy alias — old Product type is now SellerOffer */
export type Product = SellerOffer;

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  products?: SellerOffer;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product_catalog?: ProductCatalog;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  payment_method: string;
  payment_status: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  seller_id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  created_at: string;
  status: string;
  sellers?: Seller;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  max_discount: number | null;
  min_order: number;
  is_active: boolean;
  expires_at: string | null;
}

export interface Customer {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  name: string;
  phone: string;
  address_line: string;
  city: string;
  is_default: boolean;
  created_at: string;
}

export interface SellerPayout {
  id: string;
  seller_id: string;
  amount: number;
  status: string;
  period_start: string | null;
  period_end: string | null;
  payment_method: string | null;
  transaction_ref: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ProductView {
  id: string;
  product_id: string;
  user_id: string | null;
  viewed_at: string;
}

export interface Admin {
  id: string;
  user_id: string;
  is_super: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_user_id: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  reported_seller_id: string | null;
  reported_product_id: string | null;
  order_id: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeaturedListing {
  id: string;
  product_id: string;
  seller_id: string;
  placement: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}
