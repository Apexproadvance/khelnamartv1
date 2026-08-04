import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Heart, Trash2 } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import EmptyState from '@/components/EmptyState';
import type { Product, WishlistItem } from '@/lib/types';

export default function WishlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    async function load() {
      const { data } = await supabase
        .from('wishlist_items')
        .select('*, products(*, product_images(*), sellers(*))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      setItems((data as WishlistItem[])?.map((w) => w.products).filter((p): p is Product => p != null) ?? []);
      setLoading(false);
    }
    load();
  }, [user, navigate]);

  async function handleRemove(productId: string) {
    if (!user) return;
    await supabase.from('wishlist_items').delete().eq('user_id', user.id).eq('product_id', productId);
    setItems((prev) => prev.filter((p) => p.id !== productId));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">My Wishlist</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save toys you love and come back to them later."
          action={<Link to="/browse" className="btn-primary mt-4">Browse Toys</Link>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {items.map((product) => (
            <div key={product.id} className="relative">
              <ProductCard product={product} />
              <button
                onClick={() => handleRemove(product.id)}
                className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-1.5 shadow-md transition-colors hover:bg-error-50"
              >
                <Trash2 size={14} className="text-error-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
