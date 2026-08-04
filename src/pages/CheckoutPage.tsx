import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { supabase } from '@/lib/supabase';
import { formatBDT, discountedPrice, generateOrderNumber } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { ShoppingBag, MapPin, CreditCard, Truck, Check, Wallet, Banknote } from 'lucide-react';
import type { Coupon, Address } from '@/lib/types';

const CITIES = ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal', 'Rangpur', 'Mymensingh', 'Comilla', 'Narayanganj'];

const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery', icon: Banknote, desc: 'Pay when you receive your order' },
  { value: 'bkash', label: 'bKash', icon: Wallet, desc: 'Pay with bKash mobile banking' },
  { value: 'nagad', label: 'Nagad', icon: Wallet, desc: 'Pay with Nagad mobile banking' },
  { value: 'rocket', label: 'Rocket', icon: Wallet, desc: 'Pay with Rocket mobile banking' },
  { value: 'card', label: 'Card', icon: CreditCard, desc: 'Visa, Mastercard, Amex' },
];

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [shipping, setShipping] = useState({
    name: '',
    phone: '',
    address: '',
    city: 'Dhaka',
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [deliveryMethod, setDeliveryMethod] = useState('home');
  const [placing, setPlacing] = useState(false);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false }).then(({ data }) => {
      setAddresses(data as Address[] ?? []);
      const defaultAddr = (data as Address[])?.find((a) => a.is_default) ?? (data as Address[])?.[0];
      if (defaultAddr) {
        setShipping({ name: defaultAddr.name, phone: defaultAddr.phone, address: defaultAddr.address_line, city: defaultAddr.city });
      }
    });
  }, [user]);

  function selectAddress(addr: Address) {
    setShipping({ name: addr.name, phone: addr.phone, address: addr.address_line, city: addr.city });
  }

  useEffect(() => {
    const code = searchParams.get('coupon');
    if (code) {
      supabase.from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).maybeSingle().then(({ data }) => {
        if (data) setCoupon(data as Coupon);
      });
    }
  }, [searchParams]);

  const subtotal = items.reduce((sum, item) => {
    const price = item.products ? discountedPrice(item.products.price, item.products.discount_percent) : 0;
    return sum + price * item.quantity;
  }, 0);

  const discount = coupon
    ? Math.min((subtotal * coupon.discount_percent) / 100, coupon.max_discount ?? Infinity)
    : 0;

  const shippingCost = deliveryMethod === 'home' ? (subtotal > 2000 ? 0 : 60) : 0;
  const total = subtotal - discount + shippingCost;

  async function handlePlaceOrder() {
    if (!user) return;
    if (!shipping.name.trim() || !shipping.phone.trim() || !shipping.address.trim()) {
      showToast('Please fill in all shipping details', 'error');
      return;
    }
    if (items.length === 0) return;

    setPlacing(true);
    const orderNumber = generateOrderNumber();

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: 'pending',
        total,
        subtotal,
        shipping: shippingCost,
        discount,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
        shipping_name: shipping.name,
        shipping_phone: shipping.phone,
        shipping_address: shipping.address,
        shipping_city: shipping.city,
      })
      .select()
      .single();

    if (error || !order) {
      showToast('Failed to place order. Please try again.', 'error');
      setPlacing(false);
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      seller_id: item.products?.seller_id,
      product_name: item.products?.name ?? '',
      product_image: item.products?.product_images?.[0]?.image_url ?? null,
      price: item.products ? discountedPrice(item.products.price, item.products.discount_percent) : 0,
      quantity: item.quantity,
      status: 'pending',
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      showToast('Failed to create order items', 'error');
      setPlacing(false);
      return;
    }

    await clearCart();
    showToast('Order placed successfully!');
    navigate(`/orders?placed=${orderNumber}`);
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Add some toys before checking out!"
          action={<Link to="/browse" className="btn-primary mt-4">Browse Toys</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Shipping address */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-600" />
              <h2 className="text-lg font-bold text-slate-800">Shipping Address</h2>
            </div>
            {addresses.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => selectAddress(addr)}
                    className={`shrink-0 rounded-xl border-2 p-3 text-left text-xs transition-all ${shipping.name === addr.name && shipping.address === addr.address_line ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="badge bg-primary-100 text-primary-700">{addr.label}</span>
                      {addr.is_default && <span className="text-success-600"><Check size={10} /></span>}
                    </div>
                    <div className="mt-1 font-medium text-slate-700">{addr.name}</div>
                    <div className="text-slate-500">{addr.address_line}, {addr.city}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Full Name</label>
                <input
                  type="text"
                  value={shipping.name}
                  onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                  placeholder="John Doe"
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Phone Number</label>
                <input
                  type="tel"
                  value={shipping.phone}
                  onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                  placeholder="+880 1XXX-XXXXXX"
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Street Address</label>
                <textarea
                  value={shipping.address}
                  onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                  placeholder="House #, Road #, Area"
                  rows={2}
                  className="input resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">City</label>
                <select
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                  className="input cursor-pointer"
                >
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Delivery method */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Truck size={20} className="text-primary-600" />
              <h2 className="text-lg font-bold text-slate-800">Delivery Method</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setDeliveryMethod('home')}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${deliveryMethod === 'home' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <Truck size={24} className={deliveryMethod === 'home' ? 'text-primary-600' : 'text-slate-400'} />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Home Delivery</div>
                  <div className="text-xs text-slate-500">{shippingCost === 0 ? 'Free' : formatBDT(60)} • 2-5 days</div>
                </div>
                {deliveryMethod === 'home' && <Check size={18} className="ml-auto text-primary-600" />}
              </button>
              <button
                onClick={() => setDeliveryMethod('pickup')}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${deliveryMethod === 'pickup' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <MapPin size={24} className={deliveryMethod === 'pickup' ? 'text-primary-600' : 'text-slate-400'} />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Store Pickup</div>
                  <div className="text-xs text-slate-500">Free • Pick up from store</div>
                </div>
                {deliveryMethod === 'pickup' && <Check size={18} className="ml-auto text-primary-600" />}
              </button>
            </div>
          </div>

          {/* Payment method */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-primary-600" />
              <h2 className="text-lg font-bold text-slate-800">Payment Method</h2>
            </div>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${paymentMethod === method.value ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <Icon size={22} className={paymentMethod === method.value ? 'text-primary-600' : 'text-slate-400'} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800">{method.label}</div>
                      <div className="text-xs text-slate-500">{method.desc}</div>
                    </div>
                    {paymentMethod === method.value && <Check size={18} className="text-primary-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div>
          <div className="sticky top-32 card p-5">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Your Order</h2>
            <div className="mb-4 max-h-60 space-y-3 overflow-y-auto">
              {items.map((item) => {
                const product = item.products;
                if (!product) return null;
                const finalPrice = discountedPrice(product.price, product.discount_percent);
                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                      {product.product_images?.[0]?.image_url && (
                        <img src={product.product_images[0].image_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-1 text-xs font-medium text-slate-700">{product.name}</p>
                      <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-slate-800">{formatBDT(finalPrice * item.quantity)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">{formatBDT(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-success-600">Discount {coupon && `(${coupon.code})`}</span>
                  <span className="font-medium text-success-600">-{formatBDT(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Shipping</span>
                <span className="font-medium">{shippingCost === 0 ? 'Free' : formatBDT(shippingCost)}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
              <span className="text-lg font-bold text-slate-800">Total</span>
              <span className="text-lg font-bold text-primary-600">{formatBDT(total)}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="btn-primary mt-4 w-full py-3"
            >
              {placing ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
