import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, MapPin, CheckCircle2, Tag } from 'lucide-react';
import type { ProductCatalog, SellerOffer } from '@/lib/types';
import { formatBDT, discountedPrice, ageRange } from '@/lib/utils';
import RatingStars from '@/components/RatingStars';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { supabase } from '@/lib/supabase';

interface ProductCardProps {
  product: ProductCatalog;
}

function pickBestOffer(offers: SellerOffer[] | undefined): SellerOffer | null {
  if (!offers || offers.length === 0) return null;
  const active = offers.filter((o) => o.is_active && o.stock > 0);
  const pool = active.length > 0 ? active : offers;
  return pool.reduce((best, o) => {
    const bestPrice = discountedPrice(best.price, best.discount_percent);
    const oPrice = discountedPrice(o.price, o.discount_percent);
    return oPrice < bestPrice ? o : best;
  }, pool[0]);
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const bestOffer = pickBestOffer(product.products);
  const finalPrice = bestOffer ? discountedPrice(bestOffer.price, bestOffer.discount_percent) : 0;
  const originalPrice = bestOffer?.price ?? 0;
  const hasDiscount = bestOffer ? bestOffer.discount_percent > 0 : false;
  const image = product.product_images?.[0]?.image_url;
  const offerCount = product.products?.length ?? 0;
  const inStock = bestOffer ? bestOffer.stock > 0 : false;

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Please sign in to add items to cart', 'info');
      return;
    }
    if (!bestOffer) return;
    await addToCart(bestOffer, 1);
    showToast('Added to cart!');
  }

  async function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Please sign in to save items', 'info');
      return;
    }
    const { data: existing } = await supabase
      .from('wishlist_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle();
    if (existing) {
      showToast('Already in your wishlist', 'info');
      return;
    }
    await supabase.from('wishlist_items').insert({ user_id: user.id, product_id: product.id });
    showToast('Added to wishlist!');
  }

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group card overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <ShoppingCart size={32} className="text-slate-300" />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-3 left-3 badge bg-accent-500 text-white">
            -{Math.round(bestOffer!.discount_percent)}%
          </span>
        )}
        {offerCount > 1 && (
          <span className="absolute top-3 left-3 badge bg-primary-600 text-white">
            <Tag size={10} /> {offerCount} sellers
          </span>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="badge bg-slate-800 text-white text-sm px-3 py-1">Out of Stock</span>
          </div>
        )}
        <button
          onClick={handleWishlist}
          className="absolute top-3 right-3 rounded-full bg-white/90 p-2 shadow-sm opacity-0 transition-all group-hover:opacity-100 hover:bg-white hover:scale-110"
        >
          <Heart size={16} className="text-accent-500" />
        </button>
      </div>
      <div className="p-4">
        <div className="mb-1 flex items-center gap-1.5">
          {bestOffer?.sellers?.verified && (
            <CheckCircle2 size={14} className="text-primary-500" />
          )}
          <span className="truncate text-xs text-slate-500">{bestOffer?.sellers?.store_name ?? 'Unknown store'}</span>
          <span className="flex items-center gap-0.5 text-xs text-slate-400">
            <MapPin size={10} />
            {bestOffer?.sellers?.city ?? ''}
          </span>
        </div>
        <h3 className="mb-1 line-clamp-2 text-sm font-medium text-slate-800 group-hover:text-primary-600">
          {product.name}
        </h3>
        <div className="mb-2 flex items-center gap-2">
          <RatingStars rating={product.rating} size={14} showNumber count={product.rating_count} />
        </div>
        <div className="mb-2 text-xs text-slate-400">
          {ageRange(product.min_age, product.max_age)}
        </div>
        <div className="flex items-end justify-between">
          <div>
            {bestOffer ? (
              <>
                <div className="text-lg font-bold text-slate-900">{formatBDT(finalPrice)}</div>
                {hasDiscount && (
                  <div className="text-xs text-slate-400 line-through">{formatBDT(originalPrice)}</div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-400">No offers</div>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className="rounded-xl bg-primary-50 p-2.5 text-primary-600 transition-all hover:bg-primary-600 hover:text-white active:scale-90 disabled:opacity-40"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </Link>
  );
}
