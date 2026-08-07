import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Seller, ProductCatalog } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import RatingStars from '@/components/RatingStars';
import EmptyState from '@/components/EmptyState';
import { Store, MapPin, CheckCircle2, Package, ChevronRight, MessageSquare } from 'lucide-react';

export default function SellerStorePage() {
  const { slug } = useParams();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<ProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!sellerData) {
        setSeller(null);
        setLoading(false);
        return;
      }

      const s = sellerData as Seller;
      setSeller(s);

      // Get all catalog entries this seller has offers for
      const { data: offers } = await supabase
        .from('products')
        .select('catalog_id')
        .eq('seller_id', s.id)
        .eq('is_active', true)
        .not('catalog_id', 'is', null);

      const catalogIds = [...new Set((offers ?? []).map((o: { catalog_id: string }) => o.catalog_id))];
      if (catalogIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data: catalogData } = await supabase
        .from('product_catalog')
        .select('*, product_images(*), categories(*), products(*, sellers(*))')
        .in('id', catalogIds)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false });

      setProducts(catalogData as ProductCatalog[] ?? []);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          icon={Store}
          title="Store not found"
          description="This store may not exist or is no longer active."
          action={<Link to="/browse" className="btn-primary mt-4">Browse Toys</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-sm text-slate-500">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <ChevronRight size={14} />
        <span className="text-slate-700">{seller.store_name}</span>
      </nav>

      {/* Store banner */}
      <div className="card overflow-hidden">
        {seller.banner_url ? (
          <div className="h-40 w-full overflow-hidden bg-slate-100">
            <img src={seller.banner_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-40 w-full bg-gradient-to-r from-primary-500 to-primary-700" />
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 text-2xl font-bold">
              {seller.logo_url ? (
                <img src={seller.logo_url} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                seller.store_name?.[0] ?? 'S'
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">{seller.store_name}</h1>
                {seller.verified && (
                  <span className="badge bg-primary-100 text-primary-700">
                    <CheckCircle2 size={14} /> Verified
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {seller.city}
                </span>
                <span className="flex items-center gap-1">
                  <RatingStars rating={seller.rating} size={14} showNumber />
                  <span className="text-slate-400">({seller.rating_count} reviews)</span>
                </span>
                <span className="flex items-center gap-1">
                  <Package size={14} /> {products.length} products
                </span>
              </div>
              {seller.description && (
                <p className="mt-3 max-w-2xl text-sm text-slate-600">{seller.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="mt-8">
        <h2 className="mb-6 text-xl font-bold text-slate-800">Products from {seller.store_name}</h2>
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="This store hasn't listed any products yet."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
