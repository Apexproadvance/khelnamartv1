import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Product, Category } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import {
  Blocks, Heart, Car, Baby, Dices, Palette,
  GraduationCap, Users, Bike, Music, ArrowRight, Sparkles, TrendingUp, Clock,
} from 'lucide-react';

const iconMap: Record<string, typeof Blocks> = {
  Blocks, Heart, Car, Baby, Dices, Palette, GraduationCap, Users, Bike, Music,
};

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [featRes, newRes, trendRes, catRes, featuredListingRes] = await Promise.all([
        supabase.from('products').select('*, product_images(*), sellers(*)').eq('is_featured', true).eq('is_active', true).order('rating', { ascending: false }).limit(8),
        supabase.from('products').select('*, product_images(*), sellers(*)').eq('is_active', true).order('created_at', { ascending: false }).limit(4),
        supabase.from('products').select('*, product_images(*), sellers(*)').eq('is_active', true).order('rating_count', { ascending: false }).limit(4),
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('featured_listings').select('product_id').eq('is_active', true).eq('placement', 'homepage'),
      ]);

      // Merge featured listings into the featured products array
      const featuredIds = new Set((featuredListingRes.data ?? []).map((f: { product_id: string }) => f.product_id));
      const baseFeatured = featRes.data as Product[] ?? [];
      if (featuredIds.size > 0) {
        const sponsored = baseFeatured.filter((p) => featuredIds.has(p.id));
        const rest = baseFeatured.filter((p) => !featuredIds.has(p.id));
        setFeatured([...sponsored, ...rest]);
      } else {
        setFeatured(baseFeatured);
      }

      setNewArrivals(newRes.data as Product[] ?? []);
      setTrending(trendRes.data as Product[] ?? []);
      setCategories(catRes.data as Category[] ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-secondary-400 blur-3xl" />
          <div className="absolute right-20 top-20 h-32 w-32 rounded-full bg-accent-400 blur-3xl" />
          <div className="absolute bottom-10 left-1/3 h-24 w-24 rounded-full bg-white blur-2xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Sparkles size={16} className="text-secondary-300" />
              Bangladesh's Largest Toy Marketplace
            </div>
            <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-6xl">
              Every toy in Bangladesh, <span className="text-secondary-300">one click away</span>
            </h1>
            <p className="mb-8 text-lg text-primary-100 md:text-xl">
              Discover toys from hundreds of local retailers across the country. Compare prices, find the perfect gift, and get it delivered to your door.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/browse" className="btn-accent text-base px-7 py-3.5">
                Start Shopping
                <ArrowRight size={20} />
              </Link>
              <Link to="/seller/register" className="btn bg-white/10 text-white backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 px-7 py-3.5 text-base">
                Sell on Khelnamart
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-6 text-2xl font-bold text-slate-800">Shop by Category</h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-10">
          {categories.map((cat) => {
            const Icon = (cat.icon ? iconMap[cat.icon] : null) ?? Blocks;
            return (
              <Link
                key={cat.id}
                to={`/browse?category=${cat.slug}`}
                className="group flex flex-col items-center gap-2"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 transition-all group-hover:bg-primary-600 group-hover:text-white group-hover:scale-110 md:h-20 md:w-20">
                  <Icon size={28} />
                </div>
                <span className="text-center text-xs font-medium text-slate-600 group-hover:text-primary-600 md:text-sm">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Flash sale banner */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-accent-500 to-accent-400 px-6 py-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <Clock size={24} className="animate-countdown-pulse" />
            <div>
              <div className="text-lg font-bold">Flash Sale — Up to 25% Off!</div>
              <div className="text-sm text-accent-50">Limited time only. Grab your favorite toys before they're gone.</div>
            </div>
          </div>
          <Link to="/browse?sort=discount" className="hidden sm:flex btn bg-white text-accent-600 hover:bg-accent-50 px-5 py-2.5 text-sm font-bold">
            Shop Deals
          </Link>
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-secondary-400" size={24} />
            <h2 className="text-2xl font-bold text-slate-800">Featured Toys</h2>
          </div>
          <Link to="/browse" className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:gap-2 transition-all">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-accent-500" size={24} />
            <h2 className="text-2xl font-bold text-slate-800">Trending Now</h2>
          </div>
          <Link to="/browse?sort=popular" className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:gap-2 transition-all">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : trending.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* New arrivals */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">New Arrivals</h2>
          <Link to="/browse?sort=newest" className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:gap-2 transition-all">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Seller CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-slate-900 px-8 py-12 md:flex-row">
          <div className="max-w-lg">
            <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">Are you a toy retailer?</h2>
            <p className="text-slate-300">
              Join Khelnamart and start selling online today. No website needed — we bring customers to you. Manage your inventory, track orders, and grow your business.
            </p>
          </div>
          <Link to="/seller/register" className="btn-secondary whitespace-nowrap px-8 py-3.5 text-base">
            Become a Seller
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
