import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { ProductCatalog, SellerOffer, Review } from '@/lib/types';
import { formatBDT, discountedPrice, ageRange, timeAgo } from '@/lib/utils';
import RatingStars from '@/components/RatingStars';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import EmptyState from '@/components/EmptyState';
import {
  ShoppingCart, Heart, CheckCircle2, MapPin, Shield, Truck,
  RotateCcw, Minus, Plus, ChevronRight, Package, Store, Award, Tag, Star, X,
} from 'lucide-react';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<ProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews' | 'offers'>('description');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActiveImage(0);
    setQuantity(1);
    setSelectedOfferId(null);

    async function load() {
      const { data: cat } = await supabase
        .from('product_catalog')
        .select('*, product_images(*), categories(*), products(*, sellers(*))')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!cat) {
        setCatalog(null);
        setLoading(false);
        return;
      }

      const catData = cat as ProductCatalog;
      setCatalog(catData);

      // Track view
      supabase.from('product_views').insert({ product_id: catData.id, user_id: user?.id ?? null }).then();

      // Auto-select best offer
      const activeOffers = catData.products?.filter((o) => o.is_active && o.stock > 0) ?? [];
      if (activeOffers.length > 0) {
        const best = activeOffers.reduce((min_o, o) => {
          const p1 = discountedPrice(min_o.price, min_o.discount_percent);
          const p2 = discountedPrice(o.price, o.discount_percent);
          return p2 < p1 ? o : min_o;
        }, activeOffers[0]);
        setSelectedOfferId(best.id);
      }

      const [revRes, relRes] = await Promise.all([
        supabase.from('reviews').select('*').eq('product_id', catData.id).order('created_at', { ascending: false }),
        supabase
          .from('product_catalog')
          .select('*, product_images(*), products(*, sellers(*))')
          .eq('is_active', true)
          .eq('category_id', catData.category_id)
          .neq('id', catData.id)
          .limit(4),
      ]);
      setReviews(revRes.data as Review[] ?? []);
      setRelated(relRes.data as ProductCatalog[] ?? []);

      // Check if user has purchased this product (for verified review badge)
      if (user) {
        const { data: purchased } = await supabase
          .from('order_items')
          .select('id')
          .eq('product_id', catData.id)
          .eq('status', 'completed')
          .limit(1);
        setHasPurchased((purchased ?? []).length > 0);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  // Sort offers: lowest final price first, then seller rating, then verified, then city
  const sortedOffers = useMemo(() => {
    if (!catalog?.products) return [];
    return [...catalog.products]
      .filter((o) => o.is_active)
      .sort((a, b) => {
        // In-stock first
        const aStock = a.stock > 0 ? 0 : 1;
        const bStock = b.stock > 0 ? 0 : 1;
        if (aStock !== bStock) return aStock - bStock;
        // Lowest final price
        const aPrice = discountedPrice(a.price, a.discount_percent);
        const bPrice = discountedPrice(b.price, b.discount_percent);
        if (aPrice !== bPrice) return aPrice - bPrice;
        // Higher seller rating
        const aRating = a.sellers?.rating ?? 0;
        const bRating = b.sellers?.rating ?? 0;
        if (aRating !== bRating) return bRating - aRating;
        // Verified first
        const aVerified = a.sellers?.verified ? 0 : 1;
        const bVerified = b.sellers?.verified ? 0 : 1;
        return aVerified - bVerified;
      });
  }, [catalog]);

  const selectedOffer = sortedOffers.find((o) => o.id === selectedOfferId) ?? sortedOffers[0] ?? null;

  async function handleAddToCart() {
    if (!user) {
      showToast('Please sign in to add items to cart', 'info');
      navigate('/auth');
      return;
    }
    if (!selectedOffer) return;
    await addToCart(selectedOffer, quantity);
    showToast('Added to cart!');
  }

  async function handleBuyNow() {
    if (!user) {
      showToast('Please sign in to checkout', 'info');
      navigate('/auth');
      return;
    }
    if (!selectedOffer) return;
    await addToCart(selectedOffer, quantity);
    navigate('/cart');
  }

  async function handleWishlist() {
    if (!user) {
      showToast('Please sign in to save items', 'info');
      navigate('/auth');
      return;
    }
    if (!catalog) return;
    const { data: existing } = await supabase
      .from('wishlist_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', catalog.id)
      .maybeSingle();
    if (existing) {
      showToast('Already in your wishlist', 'info');
      return;
    }
    await supabase.from('wishlist_items').insert({ user_id: user.id, product_id: catalog.id });
    showToast('Added to wishlist!');
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to write a review', 'info');
      navigate('/auth');
      return;
    }
    if (!catalog) return;
    if (reviewRating === 0) {
      showToast('Please select a star rating', 'error');
      return;
    }
    setReviewSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      product_id: catalog.id,
      user_id: user.id,
      rating: reviewRating,
      title: reviewTitle.trim() || null,
      body: reviewBody.trim() || null,
      is_verified_purchase: hasPurchased,
    });
    if (error) {
      showToast(error.message, 'error');
      setReviewSubmitting(false);
      return;
    }
    // Reload reviews
    const { data: newReviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', catalog.id)
      .order('created_at', { ascending: false });
    setReviews(newReviews as Review[] ?? []);
    setShowReviewForm(false);
    setReviewRating(0);
    setReviewTitle('');
    setReviewBody('');
    showToast('Review posted!');
    setReviewSubmitting(false);
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

  if (!catalog) {
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

  const images = catalog.product_images ?? [];
  const finalPrice = selectedOffer ? discountedPrice(selectedOffer.price, selectedOffer.discount_percent) : 0;
  const hasDiscount = selectedOffer ? selectedOffer.discount_percent > 0 : false;
  const inStock = selectedOffer ? selectedOffer.stock > 0 : false;
  const offerCount = sortedOffers.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-sm text-slate-500">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <ChevronRight size={14} />
        <Link to="/browse" className="hover:text-primary-600">Toys</Link>
        {catalog.categories && (
          <>
            <ChevronRight size={14} />
            <Link to={`/browse?category=${catalog.categories.slug}`} className="hover:text-primary-600">
              {catalog.categories.name}
            </Link>
          </>
        )}
        <ChevronRight size={14} />
        <span className="truncate text-slate-700">{catalog.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="mb-3 aspect-square overflow-hidden rounded-2xl bg-slate-50 card">
            {images[activeImage] ? (
              <img src={images[activeImage].image_url} alt={catalog.name} className="h-full w-full object-cover" />
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
            {selectedOffer?.sellers?.verified && (
              <span className="badge bg-primary-100 text-primary-700">
                <CheckCircle2 size={12} /> Verified Seller
              </span>
            )}
            <span className="badge bg-slate-100 text-slate-600">{ageRange(catalog.min_age, catalog.max_age)}</span>
            {offerCount > 1 && (
              <span className="badge bg-accent-100 text-accent-700">
                <Tag size={12} /> {offerCount} sellers
              </span>
            )}
          </div>

          <h1 className="mb-2 text-2xl font-bold text-slate-800 md:text-3xl">{catalog.name}</h1>

          {catalog.brand && <p className="mb-3 text-sm text-slate-500">Brand: <span className="font-medium text-slate-700">{catalog.brand}</span></p>}

          <div className="mb-4 flex items-center gap-3">
            <RatingStars rating={catalog.rating} size={18} showNumber count={catalog.rating_count} />
            <button
              onClick={() => setActiveTab('reviews')}
              className="text-sm text-primary-600 hover:underline"
            >
              {reviews.length} reviews
            </button>
          </div>

          {/* Selected offer price */}
          <div className="mb-4 flex items-end gap-3">
            <span className="text-3xl font-bold text-slate-900">{formatBDT(finalPrice)}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-slate-400 line-through">{formatBDT(selectedOffer!.price)}</span>
                <span className="badge bg-accent-500 text-white">Save {Math.round(selectedOffer!.discount_percent)}%</span>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mb-4">
            {inStock ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-success-600">
                <CheckCircle2 size={16} /> In Stock ({selectedOffer!.stock} available)
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
                onClick={() => setQuantity(Math.min(selectedOffer?.stock ?? 0, quantity + 1))}
                className="p-3 text-slate-500 hover:text-primary-600"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
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
            disabled={!inStock}
            className="btn-accent mb-6 w-full py-3"
          >
            Buy Now
          </button>

          {/* Selected seller info */}
          {selectedOffer?.sellers && (
            <Link
              to={`/store/${selectedOffer.sellers.slug}`}
              className="mb-6 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 font-bold text-lg">
                {selectedOffer.sellers.store_name?.[0] ?? 'S'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">{selectedOffer.sellers.store_name}</span>
                  {selectedOffer.sellers.verified && <CheckCircle2 size={14} className="text-primary-500" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin size={12} /> {selectedOffer.sellers.city}
                  <span>•</span>
                  <RatingStars rating={selectedOffer.sellers.rating ?? 0} size={12} />
                  <span>{selectedOffer.sellers.rating?.toFixed(1)}</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </Link>
          )}

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
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
          {[
            { key: 'description', label: 'Description' },
            { key: 'offers', label: `Seller Offers (${offerCount})` },
            { key: 'specs', label: 'Specifications' },
            { key: 'reviews', label: `Reviews (${reviews.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.key === 'offers' && <Store size={14} />}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'description' && (
          <div className="prose max-w-3xl">
            <p className="text-sm leading-relaxed text-slate-600">{catalog.description}</p>
            {catalog.safety_info && (
              <div className="mt-4 rounded-xl bg-warning-50 p-4">
                <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-warning-700">
                  <Shield size={16} /> Safety Information
                </h4>
                <p className="text-sm text-warning-600">{catalog.safety_info}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="max-w-3xl space-y-3">
            {sortedOffers.length === 0 ? (
              <EmptyState icon={Store} title="No offers available" description="No sellers are currently offering this product." />
            ) : (
              sortedOffers.map((offer, idx) => {
                const offerFinalPrice = discountedPrice(offer.price, offer.discount_percent);
                const offerHasDiscount = offer.discount_percent > 0;
                const offerInStock = offer.stock > 0;
                const isSelected = selectedOfferId === offer.id;
                const isBestPrice = idx === 0 && offerInStock;

                return (
                  <div
                    key={offer.id}
                    onClick={() => offerInStock && setSelectedOfferId(offer.id)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      isSelected ? 'border-primary-600 bg-primary-50' : 'border-slate-100 hover:border-slate-200'
                    } ${!offerInStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 font-bold text-lg">
                        {offer.sellers?.store_name?.[0] ?? 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{offer.sellers?.store_name}</span>
                          {offer.sellers?.verified && <CheckCircle2 size={14} className="text-primary-500" />}
                          {isBestPrice && (
                            <span className="badge bg-success-100 text-success-700">
                              <Award size={10} /> Best Price
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin size={12} /> {offer.sellers?.city}
                          <span>•</span>
                          <RatingStars rating={offer.sellers?.rating ?? 0} size={12} />
                          <span>{offer.sellers?.rating?.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900">{formatBDT(offerFinalPrice)}</div>
                        {offerHasDiscount && (
                          <div className="text-xs text-slate-400 line-through">{formatBDT(offer.price)}</div>
                        )}
                        <div className={`text-xs ${offerInStock ? 'text-success-600' : 'text-error-600'}`}>
                          {offerInStock ? `${offer.stock} in stock` : 'Out of stock'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'specs' && (
          <div className="max-w-2xl">
            <dl className="divide-y divide-slate-100">
              {[
                { label: 'Brand', value: catalog.brand },
                { label: 'Age Range', value: ageRange(catalog.min_age, catalog.max_age) },
                { label: 'Material', value: catalog.material },
                { label: 'Color', value: catalog.color },
                { label: 'Dimensions', value: catalog.dimensions },
                { label: 'Weight', value: catalog.weight },
                { label: 'Origin', value: catalog.origin },
                { label: 'Warranty', value: catalog.warranty },
                { label: 'Safety Info', value: catalog.safety_info },
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
            {/* Write review button / form */}
            {user && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="btn-outline mb-6"
              >
                <Star size={16} /> Write a Review
              </button>
            )}
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="card mb-6 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">Write a Review</h3>
                  <button type="button" onClick={() => setShowReviewForm(false)} className="rounded-lg p-2 hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-slate-600">Your Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setReviewHover(star)}
                        onMouseLeave={() => setReviewHover(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={28}
                          className={star <= (reviewHover || reviewRating) ? 'fill-secondary-400 text-secondary-400' : 'text-slate-200'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Title (optional)</label>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    className="input"
                    placeholder="Summarize your experience"
                    maxLength={100}
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Review (optional)</label>
                  <textarea
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    rows={4}
                    className="input resize-none"
                    placeholder="What did you like or dislike?"
                    maxLength={1000}
                  />
                </div>
                {hasPurchased && (
                  <p className="mb-3 flex items-center gap-1.5 text-xs text-success-600">
                    <CheckCircle2 size={14} /> Your review will be marked as a verified purchase.
                  </p>
                )}
                <button type="submit" disabled={reviewSubmitting} className="btn-primary w-full py-3">
                  {reviewSubmitting ? 'Posting...' : 'Post Review'}
                </button>
              </form>
            )}
            {!user && (
              <div className="card mb-6 p-5 text-center">
                <p className="text-sm text-slate-500 mb-3">Sign in to write a review</p>
                <Link to="/auth" className="btn-primary">Sign In</Link>
              </div>
            )}
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
