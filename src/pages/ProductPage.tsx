import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Product, Review } from '@/lib/types';
import { formatBDT, discountedPrice, ageRange, timeAgo } from '@/lib/utils';
import RatingStars from '@/components/RatingStars';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import EmptyState from '@/components/EmptyState';
import {
  ShoppingCart, Heart, CheckCircle2, MapPin, Shield, Truck,
  RotateCcw, Minus, Plus, ChevronRight, Package,
} from 'lucide-react';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');

  useEffect(() => {
    setLoading(true);
    setActiveImage(0);
    setQuantity(1);

    async function load() {
      const { data: prod } = await supabase
        .from('products')
        .select('*, product_images(*), sellers(*), categories(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!prod) {
        setProduct(null);
        setLoading(false);
        return;
      }

      setProduct(prod as Product);

      // Track view
      supabase.from('product_views').insert({ product_id: (prod as Product).id, user_id: user?.id ?? null }).then();

      const [revRes, relRes] = await Promise.all([
        supabase.from('reviews').select('*').eq('product_id', (prod as Product).id).order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*, product_images(*), sellers(*)')
          .eq('is_active', true)
          .eq('category_id', (prod as Product).category_id)
          .neq('id', (prod as Product).id)
          .limit(4),
      ]);
      setReviews(revRes.data as Review[] ?? []);
      setRelated(relRes.data as Product[] ?? []);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleAddToCart() {
    if (!user) {
      showToast('Please sign in to add items to cart', 'info');
      navigate('/auth');
      return;
    }
    if (!product) return;
    await addToCart(product, quantity);
    showToast('Added to cart!');
  }

  async function handleBuyNow() {
    if (!user) {
      showToast('Please sign in to checkout', 'info');
      navigate('/auth');
      return;
    }
    if (!product) return;
    await addToCart(product, quantity);
    navigate('/cart');
  }

  async function handleWishlist() {
    if (!user) {
      showToast('Please sign in to save items', 'info');
      navigate('/auth');
      return;
    }
    if (!product) return;
    const { data: existing } = await supabase
      .from('wishlist_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle();
    if (existing) {
      showToast('Already in your wishlist', 'info');
      return;
    }
    await supabase.from('wishlist_items').insert({ user_id: user.id, product_id: product.id });
    showToast('Added to wishlist!');
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-2xl bg-slate-100" />
          <div className="space-y-4">
            <div className="h-6 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          icon={Package}
          title="Product not found"
          description="This product may have been removed or is no longer available."
          action={<Link to="/browse" className="btn-primary mt-4">Browse Toys</Link>}
        />
      </div>
    );
  }

  const finalPrice = discountedPrice(product.price, product.discount_percent);
  const images = product.product_images ?? [];
  const hasDiscount = product.discount_percent > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-sm text-slate-500">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <ChevronRight size={14} />
        <Link to="/browse" className="hover:text-primary-600">Toys</Link>
        {product.categories && (
          <>
            <ChevronRight size={14} />
            <Link to={`/browse?category=${product.categories.slug}`} className="hover:text-primary-600">
              {product.categories.name}
            </Link>
          </>
        )}
        <ChevronRight size={14} />
        <span className="truncate text-slate-700">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="mb-3 aspect-square overflow-hidden rounded-2xl bg-slate-50 card">
            {images[activeImage] ? (
              <img src={images[activeImage].image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package size={48} className="text-slate-300" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-all ${activeImage === i ? 'border-primary-600' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            {product.sellers?.verified && (
              <span className="badge bg-primary-100 text-primary-700">
                <CheckCircle2 size={12} /> Verified Seller
              </span>
            )}
            <span className="badge bg-slate-100 text-slate-600">{ageRange(product.min_age, product.max_age)}</span>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-slate-800 md:text-3xl">{product.name}</h1>

          {product.brand && <p className="mb-3 text-sm text-slate-500">Brand: <span className="font-medium text-slate-700">{product.brand}</span></p>}

          <div className="mb-4 flex items-center gap-3">
            <RatingStars rating={product.rating} size={18} showNumber count={product.rating_count} />
            <button
              onClick={() => setActiveTab('reviews')}
              className="text-sm text-primary-600 hover:underline"
            >
              {reviews.length} reviews
            </button>
          </div>

          <div className="mb-4 flex items-end gap-3">
            <span className="text-3xl font-bold text-slate-900">{formatBDT(finalPrice)}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-slate-400 line-through">{formatBDT(product.price)}</span>
                <span className="badge bg-accent-500 text-white">Save {Math.round(product.discount_percent)}%</span>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mb-4">
            {product.stock > 0 ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-success-600">
                <CheckCircle2 size={16} /> In Stock ({product.stock} available)
              </span>
            ) : (
              <span className="text-sm font-medium text-error-600">Out of Stock</span>
            )}
          </div>

          {/* Quantity + Actions */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border-2 border-slate-200">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3 text-slate-500 hover:text-primary-600"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="p-3 text-slate-500 hover:text-primary-600"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="btn-primary flex-1 min-w-[140px]"
            >
              <ShoppingCart size={18} />
              Add to Cart
            </button>
            <button
              onClick={handleWishlist}
              className="rounded-xl border-2 border-slate-200 p-3 text-slate-500 transition-colors hover:border-accent-400 hover:text-accent-500"
            >
              <Heart size={18} />
            </button>
          </div>
          <button
            onClick={handleBuyNow}
            disabled={product.stock === 0}
            className="btn-accent mb-6 w-full py-3"
          >
            Buy Now
          </button>

          {/* Seller info */}
          <Link
            to={`/browse?seller=${product.sellers?.id}`}
            className="mb-6 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 font-bold text-lg">
              {product.sellers?.store_name?.[0] ?? 'S'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-800">{product.sellers?.store_name}</span>
                {product.sellers?.verified && <CheckCircle2 size={14} className="text-primary-500" />}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin size={12} /> {product.sellers?.city}
                <span>•</span>
                <RatingStars rating={product.sellers?.rating ?? 0} size={12} />
                <span>{product.sellers?.rating?.toFixed(1)}</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </Link>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 p-3 text-center">
              <Shield size={20} className="text-primary-600" />
              <span className="text-xs text-slate-600">Safe & Certified</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 p-3 text-center">
              <Truck size={20} className="text-primary-600" />
              <span className="text-xs text-slate-600">Nationwide Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 p-3 text-center">
              <RotateCcw size={20} className="text-primary-600" />
              <span className="text-xs text-slate-600">7-Day Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <div className="mb-6 flex gap-1 border-b border-slate-200">
          {[
            { key: 'description', label: 'Description' },
            { key: 'specs', label: 'Specifications' },
            { key: 'reviews', label: `Reviews (${reviews.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'description' && (
          <div className="prose max-w-3xl">
            <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
            {product.safety_info && (
              <div className="mt-4 rounded-xl bg-warning-50 p-4">
                <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-warning-700">
                  <Shield size={16} /> Safety Information
                </h4>
                <p className="text-sm text-warning-600">{product.safety_info}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'specs' && (
          <div className="max-w-2xl">
            <dl className="divide-y divide-slate-100">
              {[
                { label: 'Brand', value: product.brand },
                { label: 'Age Range', value: ageRange(product.min_age, product.max_age) },
                { label: 'Material', value: product.material },
                { label: 'Color', value: product.color },
                { label: 'Dimensions', value: product.dimensions },
                { label: 'Weight', value: product.weight },
                { label: 'Origin', value: product.origin },
                { label: 'Warranty', value: product.warranty },
                { label: 'Safety Info', value: product.safety_info },
              ].filter((s) => s.value).map((s) => (
                <div key={s.label} className="flex py-3">
                  <dt className="w-40 shrink-0 text-sm font-medium text-slate-500">{s.label}</dt>
                  <dd className="text-sm text-slate-800">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="max-w-3xl">
            {reviews.length === 0 ? (
              <EmptyState icon={Package} title="No reviews yet" description="Be the first to review this product." />
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="card p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold">
                          {(rev.user_id?.[0] ?? 'U').toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">Customer</span>
                            {rev.is_verified_purchase && (
                              <span className="badge bg-success-100 text-success-700">
                                <CheckCircle2 size={10} /> Verified
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{timeAgo(rev.created_at)}</span>
                        </div>
                      </div>
                      <RatingStars rating={rev.rating} size={14} />
                    </div>
                    {rev.title && <h4 className="mb-1 text-sm font-semibold text-slate-800">{rev.title}</h4>}
                    {rev.body && <p className="text-sm text-slate-600">{rev.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-bold text-slate-800">Related Products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
