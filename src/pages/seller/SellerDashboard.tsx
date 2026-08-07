import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { formatBDT, orderStatusLabel, orderStatusColor, timeAgo } from '@/lib/utils';
import { TrendingUp, Package, ShoppingBag, Star, ArrowRight, Plus, Eye } from 'lucide-react';
import type { SellerOffer, OrderItem } from '@/lib/types';

export default function SellerDashboard() {
  const { seller } = useAuth();
  const [stats, setStats] = useState({ revenue: 0, orders: 0, products: 0, rating: 0, views: 0 });
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [topProducts, setTopProducts] = useState<{ product: SellerOffer; views: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seller) return;
    async function load() {
      const [prodRes, orderRes] = await Promise.all([
        supabase.from('products').select('*, product_catalog(*, product_images(*))').eq('seller_id', seller!.id),
        supabase
          .from('order_items')
          .select('*, products(*), sellers(*)')
          .eq('seller_id', seller!.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const products = prodRes.data as SellerOffer[] ?? [];
      const orders = orderRes.data as OrderItem[] ?? [];

      // Get view counts for each product
      const productIds = products.map((p) => p.id);
      let totalViews = 0;
      const viewsByProduct: Record<string, number> = {};
      if (productIds.length > 0) {
        const { data: viewData } = await supabase
          .from('product_views')
          .select('product_id')
          .in('product_id', productIds);
        (viewData ?? []).forEach((v: { product_id: string }) => {
          viewsByProduct[v.product_id] = (viewsByProduct[v.product_id] ?? 0) + 1;
          totalViews++;
        });
      }

      const revenue = orders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'rejected')
        .reduce((sum, o) => sum + o.price * o.quantity, 0);

      setStats({
        revenue,
        orders: orders.length,
        products: products.length,
        rating: seller!.rating,
        views: totalViews,
      });
      setRecentOrders(orders);

      const top = products
        .map((p) => ({ product: p, views: viewsByProduct[p.id] ?? 0 }))
        .sort((a, b) => b.product.rating_count - a.product.rating_count)
        .slice(0, 5);
      setTopProducts(top);
      setLoading(false);
    }
    load();
  }, [seller]);

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const statCards = [
    { label: 'Revenue', value: formatBDT(stats.revenue), icon: TrendingUp, color: 'text-success-600 bg-success-50' },
    { label: 'Orders', value: stats.orders, icon: ShoppingBag, color: 'text-primary-600 bg-primary-50' },
    { label: 'Products', value: stats.products, icon: Package, color: 'text-accent-600 bg-accent-50' },
    { label: 'Store Rating', value: stats.rating > 0 ? `${stats.rating.toFixed(1)} ★` : 'New', icon: Star, color: 'text-secondary-600 bg-secondary-50' },
    { label: 'Total Views', value: stats.views, icon: Eye, color: 'text-primary-600 bg-primary-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                <Icon size={20} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link to="/seller/products" className="btn-primary">
          <Plus size={18} /> Add Product
        </Link>
        <Link to="/seller/orders" className="btn-outline">
          <ShoppingBag size={18} /> View Orders
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Recent Orders</h2>
            <Link to="/seller/orders" className="flex items-center gap-1 text-sm text-primary-600 hover:gap-2 transition-all">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    {order.product_image && <img src={order.product_image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 text-sm font-medium text-slate-700">{order.product_name}</p>
                    <p className="text-xs text-slate-400">Qty: {order.quantity} × {formatBDT(order.price)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-800">{formatBDT(order.price * order.quantity)}</div>
                    <span className={`badge mt-1 ${orderStatusColor(order.status)}`}>
                      {orderStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Top Products</h2>
            <Link to="/seller/products" className="flex items-center gap-1 text-sm text-primary-600 hover:gap-2 transition-all">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No products yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map(({ product, views }) => (
                <div key={product.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    {product.product_catalog?.product_images?.[0]?.image_url ? (
                      <img src={product.product_catalog.product_images[0].image_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 text-sm font-medium text-slate-700">{product.name}</p>
                    <p className="text-xs text-slate-400">{formatBDT(product.price)} • Stock: {product.stock}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Star size={14} className="text-secondary-400 fill-secondary-400" />
                      {product.rating > 0 ? product.rating.toFixed(1) : 'New'}
                    </div>
                    <div className="text-xs text-slate-400">{views} views • {product.rating_count} reviews</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
