import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { supabase } from '@/lib/supabase';
import { formatBDT, orderStatusLabel, orderStatusColor, timeAgo } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { ShoppingBag, Check, X, Package, Clock, MapPin, User, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import type { OrderItem, Order } from '@/lib/types';

const STATUS_FLOW: Record<string, string[]> = {
  pending: ['accepted', 'rejected'],
  accepted: ['packed'],
  packed: ['shipped'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['completed'],
  completed: [],
  rejected: [],
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  accepted: 'Accept Order',
  packed: 'Mark as Packed',
  shipped: 'Mark as Shipped',
  out_for_delivery: 'Mark as Out for Delivery',
  delivered: 'Mark as Delivered',
  completed: 'Complete Order',
};

interface OrderItemWithOrder extends OrderItem {
  orders?: Order;
}

export default function SellerOrders() {
  const { seller } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderItemWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!seller) return;
    const { data } = await supabase
      .from('order_items')
      .select('*, orders(*), products(*)')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false });
    setOrders(data as OrderItemWithOrder[] ?? []);
    setLoading(false);
  }, [seller]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(orderItemId: string, newStatus: string) {
    const { error } = await supabase.from('order_items').update({ status: newStatus }).eq('id', orderItemId);
    if (error) {
      showToast('Failed to update order', 'error');
      return;
    }
    showToast(`Order ${orderStatusLabel(newStatus).toLowerCase()}`);

    // Send notification to customer
    const orderItem = orders.find((o) => o.id === orderItemId);
    if (orderItem?.orders?.user_id) {
      await supabase.from('notifications').insert({
        user_id: orderItem.orders.user_id,
        type: 'order',
        title: `Order #{orderItem.orders.order_number} ${orderStatusLabel(newStatus)}`,
        body: `Your item "${orderItem.product_name}" has been ${orderStatusLabel(newStatus).toLowerCase()}.`,
        link: '/orders',
      });
    }

    load();
  }

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const filterTabs = [
    { value: 'all', label: 'All', count: orders.length },
    { value: 'pending', label: 'Pending', count: statusCounts.pending ?? 0 },
    { value: 'accepted', label: 'Accepted', count: statusCounts.accepted ?? 0 },
    { value: 'packed', label: 'Packed', count: statusCounts.packed ?? 0 },
    { value: 'shipped', label: 'Shipped', count: statusCounts.shipped ?? 0 },
    { value: 'out_for_delivery', label: 'In Transit', count: statusCounts.out_for_delivery ?? 0 },
    { value: 'delivered', label: 'Delivered', count: statusCounts.delivered ?? 0 },
    { value: 'completed', label: 'Completed', count: statusCounts.completed ?? 0 },
    { value: 'rejected', label: 'Rejected', count: statusCounts.rejected ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Orders ({orders.length})</h2>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description="Orders from customers will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const possibleStatuses = STATUS_FLOW[order.status] ?? [];
            const isExpanded = expandedId === order.id;
            const orderInfo = order.orders;
            return (
              <div key={order.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-start gap-4 p-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                    {order.product_image && (
                      <img src={order.product_image} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">{order.product_name}</p>
                    <p className="text-xs text-slate-400">
                      Qty: {order.quantity} × {formatBDT(order.price)} = {formatBDT(order.price * order.quantity)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`badge ${orderStatusColor(order.status)}`}>
                        {orderStatusLabel(order.status)}
                      </span>
                      {orderInfo && (
                        <span className="text-xs font-medium text-slate-500">
                          #{orderInfo.order_number}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{timeAgo(order.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-lg font-bold text-slate-900">{formatBDT(order.price * order.quantity)}</div>
                    {possibleStatuses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {possibleStatuses.map((status) => {
                          const isAccept = status === 'accepted';
                          const isReject = status === 'rejected';
                          return (
                            <button
                              key={status}
                              onClick={() => updateStatus(order.id, status)}
                              className={`btn text-xs px-3 py-1.5 ${
                                isReject
                                  ? 'bg-error-100 text-error-700 hover:bg-error-600 hover:text-white'
                                  : isAccept
                                  ? 'bg-success-100 text-success-700 hover:bg-success-600 hover:text-white'
                                  : 'bg-primary-100 text-primary-700 hover:bg-primary-600 hover:text-white'
                              }`}
                            >
                              {isReject ? <><X size={12} /> Reject</> : isAccept ? <><Check size={12} /> Accept</> : NEXT_STATUS_LABEL[status]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expandable customer/shipping info */}
                {orderInfo && (
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="flex w-full items-center justify-between px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-1.5">
                        <User size={14} /> Customer & Shipping Info
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {isExpanded && (
                      <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <h4 className="mb-2 text-xs font-semibold text-slate-500">Customer</h4>
                          <div className="space-y-1 text-sm text-slate-700">
                            <p className="flex items-center gap-2"><User size={14} className="text-slate-400" /> {orderInfo.shipping_name}</p>
                            <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {orderInfo.shipping_phone}</p>
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <h4 className="mb-2 text-xs font-semibold text-slate-500">Shipping Address</h4>
                          <div className="flex items-start gap-2 text-sm text-slate-700">
                            <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                            <div>
                              {orderInfo.shipping_address}
                              <br />
                              {orderInfo.shipping_city}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
                          <h4 className="mb-2 text-xs font-semibold text-slate-500">Payment</h4>
                          <div className="flex items-center gap-3 text-sm text-slate-700">
                            <span className="capitalize">{orderInfo.payment_method}</span>
                            <span className={`badge ${orderInfo.payment_status === 'paid' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                              {orderInfo.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
