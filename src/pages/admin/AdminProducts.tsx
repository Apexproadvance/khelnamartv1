import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import type { ProductCatalog } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import { Package, Search, Star, Eye, EyeOff, Sparkles, ExternalLink } from 'lucide-react';

type Filter = 'all' | 'active' | 'inactive' | 'featured';

export default function AdminProducts() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<ProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('product_catalog')
      .select('*, product_images(*), categories(*)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Failed to load catalog', 'error');
      return;
    }
    setProducts((data as ProductCatalog[]) ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(product: ProductCatalog) {
    const { error } = await supabase.rpc('admin_set_catalog_active', {
      p_catalog_id: product.id,
      p_is_active: !product.is_active,
    });
    if (error) {
      showToast('Failed to update product', 'error');
      return;
    }
    showToast(product.is_active ? 'Product deactivated' : 'Product activated!');
    load();
  }

  async function toggleFeatured(product: ProductCatalog) {
    const { error } = await supabase.rpc('admin_set_catalog_featured', {
      p_catalog_id: product.id,
      p_is_featured: !product.is_featured,
    });
    if (error) {
      showToast('Failed to update product', 'error');
      return;
    }
    showToast(product.is_featured ? 'Removed from featured' : 'Featured on homepage!');
    load();
  }

  const filtered = products.filter((p) => {
    if (filter === 'active' && !p.is_active) return false;
    if (filter === 'inactive' && p.is_active) return false;
    if (filter === 'featured' && !p.is_featured) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.brand ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: products.length },
    { key: 'active', label: 'Active', count: products.filter((p) => p.is_active).length },
    { key: 'inactive', label: 'Inactive', count: products.filter((p) => !p.is_active).length },
    { key: 'featured', label: 'Featured', count: products.filter((p) => p.is_featured).length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-800">Catalog Moderation</h2>
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or brand..."
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
        <EmptyState icon={Package} title="No products found" description="Products matching your filter will appear here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((product) => (
            <div key={product.id} className="card p-4">
              <div className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {product.product_images?.[0] && (
                    <img src={product.product_images[0].image_url} alt={product.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/product/${product.slug}`} className="truncate font-medium text-slate-800 hover:text-primary-600">
                      {product.name}
                    </Link>
                  </div>
                  <p className="text-xs text-slate-400">{product.brand ?? 'No brand'} · {product.categories?.name ?? 'Uncategorized'}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {product.is_active ? (
                      <span className="badge bg-success-100 text-success-700"><Eye size={10} /> Active</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-500"><EyeOff size={10} /> Inactive</span>
                    )}
                    {product.is_featured && (
                      <span className="badge bg-secondary-100 text-secondary-700"><Sparkles size={10} /> Featured</span>
                    )}
                    {product.rating > 0 && (
                      <span className="badge bg-primary-100 text-primary-700"><Star size={10} /> {product.rating}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/product/${product.slug}`} className="btn-ghost text-xs">
                  <ExternalLink size={14} /> View
                </Link>
                <button
                  onClick={() => toggleFeatured(product)}
                  className={`btn text-xs px-4 py-2 ${
                    product.is_featured
                      ? 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                      : 'bg-secondary-400 text-slate-900 hover:bg-secondary-500'
                  }`}
                >
                  <Sparkles size={14} />
                  {product.is_featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  onClick={() => toggleActive(product)}
                  className={`btn text-xs px-4 py-2 ${
                    product.is_active
                      ? 'bg-error-500 text-white hover:bg-error-600'
                      : 'bg-success-500 text-white hover:bg-success-600'
                  }`}
                >
                  {product.is_active ? <><EyeOff size={14} /> Deactivate</> : <><Eye size={14} /> Activate</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
