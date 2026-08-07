import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { ProductCatalog, Category, Seller } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import EmptyState from '@/components/EmptyState';
import { SlidersHorizontal, X, Search } from 'lucide-react';

const AGE_OPTIONS = [
  { label: '0-2 years', min: 0, max: 2 },
  { label: '3-5 years', min: 3, max: 5 },
  { label: '6-8 years', min: 6, max: 8 },
  { label: '9-12 years', min: 9, max: 12 },
];

const PRICE_OPTIONS = [
  { label: 'Under ৳500', min: 0, max: 500 },
  { label: '৳500 - ৳1000', min: 500, max: 1000 },
  { label: '৳1000 - ৳2000', min: 1000, max: 2000 },
  { label: '৳2000+', min: 2000, max: 999999 },
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'discount', label: 'Biggest Discount' },
];

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductCatalog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'featured';
  const ageFilter = searchParams.get('age') || '';
  const priceFilter = searchParams.get('price') || '';
  const sellerFilter = searchParams.get('seller') || '';
  const minRating = searchParams.get('rating') || '';

  const updateParam = useCallback((key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      setCategories(data as Category[] ?? []);
    });
    supabase.from('sellers').select('id, store_name').eq('is_active', true).then(({ data }) => {
      setSellers(data as Seller[] ?? []);
    });
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase
        .from('product_catalog')
        .select('*, product_images(*), categories(*), products(*, sellers(*))')
        .eq('is_active', true);

      if (query) {
        q = q.or(`name.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%`);
      }
      if (category) {
        q = q.eq('categories.slug', category);
      }
      if (ageFilter) {
        const [min, max] = ageFilter.split('-').map(Number);
        q = q.lte('min_age', max).gte('max_age', min);
      }
      if (minRating) {
        q = q.gte('rating', Number(minRating));
      }

      switch (sort) {
        case 'newest': q = q.order('created_at', { ascending: false }); break;
        case 'rating': q = q.order('rating', { ascending: false }); break;
        case 'popular': q = q.order('rating_count', { ascending: false }); break;
        default: q = q.order('is_featured', { ascending: false }).order('rating', { ascending: false });
      }

      const { data } = await q.limit(60);
      let results = data as ProductCatalog[] ?? [];

      // Filter by seller offer (post-query since it's nested)
      if (sellerFilter) {
        results = results.filter((p) =>
          p.products?.some((o) => o.seller_id === sellerFilter)
        );
      }

      // Filter by price (based on best offer price)
      if (priceFilter) {
        const [min, max] = priceFilter.split('-').map(Number);
        results = results.filter((p) => {
          const offers = p.products?.filter((o) => o.is_active) ?? [];
          if (offers.length === 0) return false;
          const best = offers.reduce((min_o, o) => {
            const p1 = min_o.price * (1 - min_o.discount_percent / 100);
            const p2 = o.price * (1 - o.discount_percent / 100);
            return p2 < p1 ? o : min_o;
          }, offers[0]);
          const finalPrice = best.price * (1 - best.discount_percent / 100);
          return finalPrice >= min && finalPrice <= max;
        });
      }

      // Sort by price or discount (post-query since it's based on offers)
      if (sort === 'price_low' || sort === 'price_high' || sort === 'discount') {
        results.sort((a, b) => {
          const aOffers = a.products?.filter((o) => o.is_active && o.stock > 0) ?? [];
          const bOffers = b.products?.filter((o) => o.is_active && o.stock > 0) ?? [];
          if (aOffers.length === 0 && bOffers.length === 0) return 0;
          if (aOffers.length === 0) return 1;
          if (bOffers.length === 0) return -1;
          const aBest = aOffers.reduce((m, o) => Math.min(m, o.price * (1 - o.discount_percent / 100)), Infinity);
          const bBest = bOffers.reduce((m, o) => Math.min(m, o.price * (1 - o.discount_percent / 100)), Infinity);
          if (sort === 'price_low') return aBest - bBest;
          if (sort === 'price_high') return bBest - aBest;
          // discount: compare max discount percent
          const aMaxDisc = Math.max(...aOffers.map((o) => o.discount_percent));
          const bMaxDisc = Math.max(...bOffers.map((o) => o.discount_percent));
          return bMaxDisc - aMaxDisc;
        });
      }

      setProducts(results);
      setLoading(false);
    }
    load();
  }, [query, category, sort, ageFilter, priceFilter, sellerFilter, minRating]);

  const activeFilterCount = [category, ageFilter, priceFilter, sellerFilter, minRating].filter(Boolean).length;

  function clearFilters() {
    const newParams = new URLSearchParams();
    if (query) newParams.set('q', query);
    setSearchParams(newParams);
  }

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Categories</h3>
        <div className="space-y-1.5">
          <button
            onClick={() => updateParam('category', '')}
            className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${!category ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParam('category', cat.slug)}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${category === cat.slug ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Age Range</h3>
        <div className="space-y-1.5">
          <button
            onClick={() => updateParam('age', '')}
            className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${!ageFilter ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            All Ages
          </button>
          {AGE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => updateParam('age', `${opt.min}-${opt.max}`)}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${ageFilter === `${opt.min}-${opt.max}` ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Price Range</h3>
        <div className="space-y-1.5">
          <button
            onClick={() => updateParam('price', '')}
            className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${!priceFilter ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Any Price
          </button>
          {PRICE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => updateParam('price', `${opt.min}-${opt.max}`)}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${priceFilter === `${opt.min}-${opt.max}` ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Minimum Rating</h3>
        <div className="space-y-1.5">
          <button
            onClick={() => updateParam('rating', '')}
            className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${!minRating ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Any Rating
          </button>
          {[4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => updateParam('rating', String(r))}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${minRating === String(r) ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {r}+ Stars
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Seller</h3>
        <div className="space-y-1.5">
          <button
            onClick={() => updateParam('seller', '')}
            className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${!sellerFilter ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            All Sellers
          </button>
          {sellers.map((s) => (
            <button
              key={s.id}
              onClick={() => updateParam('seller', s.id)}
              className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${sellerFilter === s.id ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {s.store_name}
            </button>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button onClick={clearFilters} className="btn-outline w-full">
          Clear All Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {query ? `Results for "${query}"` : category ? categories.find(c => c.slug === category)?.name ?? 'Toys' : 'All Toys'}
          </h1>
          <p className="text-sm text-slate-500">{loading ? 'Loading...' : `${products.length} products found`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline lg:hidden"
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="badge bg-primary-100 text-primary-700">{activeFilterCount}</span>
            )}
          </button>
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="input w-auto cursor-pointer py-2 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-32 card p-5">
            <FilterContent />
          </div>
        </aside>

        {showFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-5 animate-slide-in-right">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Filters</h2>
                <button onClick={() => setShowFilters(false)}>
                  <X size={20} />
                </button>
              </div>
              <FilterContent />
            </div>
          </div>
        )}

        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No products found"
              description="Try adjusting your filters or search for something else."
              action={
                <button onClick={clearFilters} className="btn-primary mt-4">
                  Clear Filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
