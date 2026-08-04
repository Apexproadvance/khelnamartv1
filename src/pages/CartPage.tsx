import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { supabase } from '@/lib/supabase';
import { formatBDT, discountedPrice } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { Minus, Plus, Trash2, ShoppingBag, Tag, ArrowRight, Check } from 'lucide-react';
import type { Coupon } from '@/lib/types';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, loading } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const subtotal = items.reduce((sum, item) => {
    const price = item.products ? discountedPrice(item.products.price, item.products.discount_percent) : 0;
    return sum + price * item.quantity;
  }, 0);

  const discount = appliedCoupon
    ? Math.min(
        (subtotal * appliedCoupon.discount_percent) / 100,
        appliedCoupon.max_discount ?? Infinity
      )
    : 0;

  const shipping = subtotal > 2000 ? 0 : 60;
  const total = subtotal - discount + shipping;

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponError('');
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    if (!data) {
      setAppliedCoupon(null);
      setCouponError('Invalid or expired coupon code');
    } else if (subtotal < data.min_order) {
      setAppliedCoupon(null);
      setCouponError(`Minimum order of ${formatBDT(data.min_order)} required`);
    } else {
      setAppliedCoupon(data as Coupon);
      setCouponError('');
      showToast(`Coupon applied: ${data.description ?? data.code}`);
    }
    setCheckingCoupon(false);
  }

  function handleCheckout() {
    const couponParam = appliedCoupon ? `?coupon=${appliedCoupon.code}` : '';
    navigate(`/checkout${couponParam}`);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">Shopping Cart</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse our collection and find the perfect toy!"
          action={<Link to="/browse" className="btn-primary mt-4">Start Shopping</Link>}
        />
      </div>
    );
  }

  // Group by seller
  const bySeller = items.reduce((acc, item) => {
    const sellerId = item.products?.seller_id ?? 'unknown';
    if (!acc[sellerId]) acc[sellerId] = [];
    acc[sellerId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Shopping Cart ({items.length} items)</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart items */}
        <div className="space-y-4 lg:col-span-2">
          {Object.entries(bySeller).map(([sellerId, sellerItems]) => (
            <div key={sellerId} className="card p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600 text-sm font-bold">
                  {sellerItems[0]?.products?.sellers?.store_name?.[0] ?? 'S'}
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {sellerItems[0]?.products?.sellers?.store_name ?? 'Unknown Seller'}
                </span>
                <span className="text-xs text-slate-400">• {sellerItems[0]?.products?.sellers?.city}</span>
              </div>
              <div className="space-y-4">
                {sellerItems.map((item) => {
                  const product = item.products;
                  if (!product) return null;
                  const finalPrice = discountedPrice(product.price, product.discount_percent);
                  return (
                    <div key={item.id} className="flex gap-4">
                      <Link to={`/product/${product.slug}`} className="shrink-0">
                        <div className="h-20 w-20 overflow-hidden rounded-xl bg-slate-50">
                          {product.product_images?.[0]?.image_url ? (
                            <img src={product.product_images[0].image_url} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center"><ShoppingBag size={20} className="text-slate-300" /></div>
                          )}
                        </div>
                      </Link>
                      <div className="flex flex-1 flex-col">
                        <Link to={`/product/${product.slug}`} className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-primary-600">
                          {product.name}
                        </Link>
                        <span className="text-xs text-slate-500">{product.brand}</span>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-slate-200">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 text-slate-500 hover:text-primary-600">
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, Math.min(product.stock, item.quantity + 1))}
                              className="p-1.5 text-slate-500 hover:text-primary-600"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900">{formatBDT(finalPrice * item.quantity)}</span>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-error-50 hover:text-error-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 card p-5">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Order Summary</h2>

            {/* Coupon */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Coupon Code</label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl border-2 border-success-200 bg-success-50 p-3">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-success-600" />
                    <div>
                      <div className="text-sm font-semibold text-success-700">{appliedCoupon.code}</div>
                      <div className="text-xs text-success-600">{appliedCoupon.description}</div>
                    </div>
                  </div>
                  <button onClick={() => setAppliedCoupon(null)} className="text-slate-400 hover:text-error-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="WELCOME10"
                      className="input pl-9"
                    />
                  </div>
                  <button onClick={applyCoupon} disabled={checkingCoupon} className="btn-outline whitespace-nowrap">
                    Apply
                  </button>
                </div>
              )}
              {couponError && <p className="mt-1 text-xs text-error-600">{couponError}</p>}
              <p className="mt-1.5 text-xs text-slate-400">Try: WELCOME10, EID15, TOYDAY20</p>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-800">{formatBDT(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-success-600">Discount</span>
                  <span className="font-medium text-success-600">-{formatBDT(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Shipping</span>
                <span className="font-medium text-slate-800">{shipping === 0 ? 'Free' : formatBDT(shipping)}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-slate-400">Add {formatBDT(2000 - subtotal)} more for free shipping</p>
              )}
            </div>

            <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
              <span className="text-lg font-bold text-slate-800">Total</span>
              <span className="text-lg font-bold text-primary-600">{formatBDT(total)}</span>
            </div>

            <button onClick={handleCheckout} className="btn-primary mt-4 w-full py-3">
              Proceed to Checkout
              <ArrowRight size={18} />
            </button>

            <Link to="/browse" className="mt-3 block text-center text-sm text-primary-600 hover:underline">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
