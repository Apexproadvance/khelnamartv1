import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import type { Seller } from '@/lib/types';
import { timeAgo } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { Store, CheckCircle2, XCircle, Search, Shield, Ban, ExternalLink } from 'lucide-react';

type Filter = 'all' | 'pending' | 'verified' | 'suspended';

export default function AdminSellers() {
  const { showToast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Failed to load sellers', 'error');
      return;
    }
    setSellers((data as Seller[]) ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function toggleVerified(seller: Seller) {
    const { error } = await supabase.rpc('admin_set_seller_verified', {
      p_seller_id: seller.id,
      p_verified: !seller.verified,
    });
    if (error) {
      showToast('Failed to update seller', 'error');
      return;
    }
    showToast(seller.verified ? 'Seller unverified' : 'Seller verified!');
    load();
  }

  async function toggleActive(seller: Seller) {
    const { error } = await supabase.rpc('admin_set_seller_active', {
      p_seller_id: seller.id,
      p_is_active: !seller.is_active,
    });
    if (error) {
      showToast('Failed to update seller', 'error');
      return;
    }
    showToast(seller.is_active ? 'Seller suspended' : 'Seller reactivated!');
    load();
  }

  const filtered = sellers.filter((s) => {
    if (filter === 'pending' && s.verified) return false;
    if (filter === 'verified' && !s.verified) return false;
    if (filter === 'suspended' && s.is_active) return false;
    if (search && !s.store_name.toLowerCase().includes(search.toLowerCase()) && !s.city.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: sellers.length },
    { key: 'pending', label: 'Pending', count: sellers.filter((s) => !s.verified).length },
    { key: 'verified', label: 'Verified', count: sellers.filter((s) => s.verified).length },
    { key: 'suspended', label: 'Suspended', count: sellers.filter((s) => !s.is_active).length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-800">Seller Management</h2>
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by store or city..."
            className="input pl-10"
          />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${filter === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Store} title="No sellers found" description="Sellers matching your filter will appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((seller) => (
            <div key={seller.id} className="card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                    <Store size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/store/${seller.slug}`} className="font-bold text-slate-800 hover:text-primary-600">
                        {seller.store_name}
                      </Link>
                      {seller.verified ? (
                        <span className="badge bg-success-100 text-success-700"><CheckCircle2 size={10} /> Verified</span>
                      ) : (
                        <span className="badge bg-warning-100 text-warning-700">Pending</span>
                      )}
                      {!seller.is_active && (
                        <span className="badge bg-error-100 text-error-700"><Ban size={10} /> Suspended</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{seller.city} · Joined {timeAgo(seller.created_at)}</p>
                    <p className="text-xs text-slate-400">{seller.phone ?? 'No phone'} · {seller.description ?? 'No description'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/store/${seller.slug}`}
                    className="btn-ghost text-xs"
                  >
                    <ExternalLink size={14} /> View Store
                  </Link>
                  <button
                    onClick={() => toggleVerified(seller)}
                    className={`btn text-xs px-4 py-2 ${
                      seller.verified
                        ? 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'bg-success-500 text-white hover:bg-success-600'
                    }`}
                  >
                    <Shield size={14} />
                    {seller.verified ? 'Unverify' : 'Verify'}
                  </button>
                  <button
                    onClick={() => toggleActive(seller)}
                    className={`btn text-xs px-4 py-2 ${
                      seller.is_active
                        ? 'bg-error-500 text-white hover:bg-error-600'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {seller.is_active ? <><Ban size={14} /> Suspend</> : <><CheckCircle2 size={14} /> Reactivate</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
