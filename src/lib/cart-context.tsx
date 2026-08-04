import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { CartItem, Product } from '@/lib/types';

interface CartContextValue {
  items: CartItem[];
  loading: boolean;
  count: number;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (cartId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('cart_items')
      .select('*, products(*, product_images(*), sellers(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems((data as CartItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [user?.id]);

  async function addToCart(product: Product, quantity = 1) {
    if (!user) return;
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      await updateQuantity(existing.id, existing.quantity + quantity);
    } else {
      await supabase.from('cart_items').insert({
        user_id: user.id,
        product_id: product.id,
        quantity,
      });
      refresh();
    }
  }

  async function updateQuantity(cartId: string, quantity: number) {
    if (quantity < 1) return;
    await supabase.from('cart_items').update({ quantity }).eq('id', cartId);
    refresh();
  }

  async function removeFromCart(cartId: string) {
    await supabase.from('cart_items').delete().eq('id', cartId);
    refresh();
  }

  async function clearCart() {
    if (!user) return;
    await supabase.from('cart_items').delete().eq('user_id', user.id);
    setItems([]);
  }

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, loading, count, addToCart, updateQuantity, removeFromCart, clearCart, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
