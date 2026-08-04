import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { formatBDT, orderStatusLabel, orderStatusColor, timeAgo } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { Package, CheckCircle2, Clock, Truck, MapPin, Check } from 'lucide-react';
import type { Order } from '@/lib/types';

const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get('placed');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, sellers(*))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      setOrders(data as Order[] ?? []);
      setLoading(false);
    }
    load();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">My Orders</h1>

      {justPlaced && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-success-200 bg-success-50 p-4">
          <CheckCircle2 size={24} className="text-success-600" />
          <div>
            <div className="font-semibold text-success-700">Order placed successfully!</div>
            <div className="text-sm text-success-600">Order #{justPlaced}</div>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place an order, it will appear here."
          action={<Link to="/browse" className="btn-primary mt-4">Start Shopping</Link>}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const currentStep = STATUS_STEPS.indexOf(order.status);
            const isCancelled = order.status === 'cancelled';
            return (
              <div key={order.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">#{order.order_number}</span>
                      <span className={`badge ${orderStatusColor(order.status)}`}>
                        {orderStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">{timeAgo(order.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">{formatBDT(order.total)}</div>
                    <div className="text-xs text-slate-500 capitalize">{order.payment_method} • {order.payment_status}</div>
                  </div>
                </div>

                {/* Order items */}
                <div className="p-4">
                  <div className="space-y-3">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                          {item.product_image && (
                            <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="line-clamp-1 text-sm font-medium text-slate-700">{item.product_name}</p>
                          <p className="text-xs text-slate-400">
                            {item.sellers?.store_name} • Qty: {item.quantity} × {formatBDT(item.price)}
                          </p>
                          <span className={`badge mt-1 ${orderStatusColor(item.status)}`}>
                            {orderStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-800">
                          {formatBDT(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tracking */}
                  {!isCancelled && order.status !== 'delivered' && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between">
                        {STATUS_STEPS.map((step, i) => {
                          const Icon = i === 0 ? Clock : i === STATUS_STEPS.length - 1 ? Package : i === STATUS_STEPS.length - 2 ? Truck : Check;
                          const done = i <= currentStep;
                          return (
                            <div key={step} className="flex flex-1 flex-col items-center">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${done ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                <Icon size={16} />
                              </div>
                              <span className={`mt-1 text-center text-[10px] ${done ? 'text-primary-600 font-medium' : 'text-slate-400'}`}>
                                {orderStatusLabel(step)}
                              </span>
                              {i < STATUS_STEPS.length - 1 && (
                                <div className={`absolute h-0.5 ${done ? 'bg-primary-600' : 'bg-slate-100'}`} style={{ width: '12%' }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Shipping address */}
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3">
                    <MapPin size={16} className="mt-0.5 text-slate-400" />
                    <div className="text-xs text-slate-600">
                      <span className="font-medium">{order.shipping_name}</span> • {order.shipping_phone}
                      <br />
                      {order.shipping_address}, {order.shipping_city}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
