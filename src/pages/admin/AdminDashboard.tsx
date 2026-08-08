import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatBDT } from '@/lib/utils';
import { Store, Package, ShoppingBag, Flag, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Stats {
  totalSellers: number;
  verifiedSellers: number;
  pendingSellers: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  openReports: number;
  totalCustomers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSellers, setRecentSellers] = useState<{ id: string; store_name: string; city: string; verified: boolean; is_active: boolean; created_at: string }[]>([]);
  const [recentReports, setRecentReports] = useState<{ id: string; subject: string; status: string; priority: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [sellersRes, productsRes, ordersRes, reportsRes, customersRes] = await Promise.all([
        supabase.from('sellers').select('id, verified, is_active, store_name, city, created_at'),
        supabase.from('product_catalog').select('id, is_active'),
        supabase.from('orders').select('id, status, total'),
        supabase.from('reports').select('id, subject, status, priority, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
      ]);

      const sellers = sellersRes.data ?? [];
      const products = productsRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const reports = reportsRes.data ?? [];

      setStats({
        totalSellers: sellers.length,
        verifiedSellers: sellers.filter((s) => s.verified).length,
        pendingSellers: sellers.filter((s) => !s.verified).length,
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.is_active).length,
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        totalRevenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
        openReports: 0,
        totalCustomers: customersRes.count ?? 0,
      });

      const openCount = await supabase.from('reports').select('id', { count: 'exact', head: true }).in('status', ['open', 'investigating']);
      setStats((prev) => prev ? { ...prev, openReports: openCount.count ?? 0 } : prev);

      setRecentSellers(
        sellers
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
      );
      setRecentReports(reports);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !stats) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const cards = [
    { label: 'Total Sellers', value: stats.totalSellers, sub: `${stats.verifiedSellers} verified`, icon: Store, color: 'primary' },
    { label: 'Pending Sellers', value: stats.pendingSellers, sub: 'Awaiting verification', icon: Clock, color: 'warning' },
    { label: 'Catalog Entries', value: stats.totalProducts, sub: `${stats.activeProducts} active`, icon: Package, color: 'secondary' },
    { label: 'Total Orders', value: stats.totalOrders, sub: `${stats.pendingOrders} pending`, icon: ShoppingBag, color: 'primary' },
    { label: 'Revenue', value: formatBDT(stats.totalRevenue), sub: 'All orders', icon: TrendingUp, color: 'success' },
    { label: 'Open Reports', value: stats.openReports, sub: 'Needs attention', icon: Flag, color: 'error' },
  ];

  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">Marketplace Overview</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-800">{card.value}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[card.color]}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent sellers */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recent Sellers</h3>
            <Link to="/admin/sellers" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentSellers.length === 0 ? (
              <p className="text-sm text-slate-400">No sellers yet</p>
            ) : (
              recentSellers.map((seller) => (
                <div key={seller.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{seller.store_name}</p>
                    <p className="text-xs text-slate-400">{seller.city}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {seller.verified ? (
                      <span className="badge bg-success-100 text-success-700"><CheckCircle2 size={10} /> Verified</span>
                    ) : (
                      <span className="badge bg-warning-100 text-warning-700"><Clock size={10} /> Pending</span>
                    )}
                    {!seller.is_active && (
                      <span className="badge bg-error-100 text-error-700"><XCircle size={10} /> Suspended</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent reports */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recent Reports</h3>
            <Link to="/admin/reports" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentReports.length === 0 ? (
              <p className="text-sm text-slate-400">No reports filed</p>
            ) : (
              recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-sm font-medium text-slate-700">{report.subject}</p>
                  <span className={`badge ${
                    report.priority === 'high' ? 'bg-error-100 text-error-700' :
                    report.priority === 'medium' ? 'bg-warning-100 text-warning-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{report.priority}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Store size={20} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Customers</p>
            <p className="text-xl font-bold text-slate-800">{stats.totalCustomers}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
