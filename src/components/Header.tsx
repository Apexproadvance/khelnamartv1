import {
  Search, ShoppingCart, Heart, User, Menu, X, Store,
} from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/NotificationBell';

export default function Header() {
  const { count } = useCart();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-primary-700 text-white text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <span className="hidden sm:block">Free delivery on orders over ৳2000</span>
          <div className="flex items-center gap-4">
            <RouterLink to="/seller" className="flex items-center gap-1 hover:text-secondary-300">
              <Store size={12} />
              Sell on Khelnamart
            </RouterLink>
            {user ? (
              <button onClick={signOut} className="hover:text-secondary-300">Sign out</button>
            ) : (
              <RouterLink to="/auth" className="hover:text-secondary-300">Sign in</RouterLink>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <RouterLink to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-lg">
            K
          </div>
          <span className="text-xl font-bold text-slate-800 hidden sm:block">
            Khelna<span className="text-primary-600">mart</span>
          </span>
        </RouterLink>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for toys, brands, categories..."
              className="w-full rounded-full border-2 border-slate-200 bg-slate-50 py-2.5 pl-5 pr-12 text-sm outline-none transition-all focus:border-primary-500 focus:bg-white"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-primary-600 p-2 text-white transition-colors hover:bg-primary-700"
            >
              <Search size={16} />
            </button>
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-3">
          {user && <NotificationBell />}
          {user && (
            <RouterLink
              to="/wishlist"
              className="relative rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary-600"
            >
              <Heart size={22} />
            </RouterLink>
          )}
          <RouterLink
            to="/cart"
            className="relative rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary-600"
          >
            <ShoppingCart size={22} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-xs font-bold text-white animate-bounce-in">
                {count}
              </span>
            )}
          </RouterLink>
          {user ? (
            <RouterLink
              to="/profile"
              className="hidden sm:flex rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary-600"
            >
              <User size={22} />
            </RouterLink>
          ) : (
            <RouterLink to="/auth" className="hidden sm:block">
              <span className="btn-primary">Sign in</span>
            </RouterLink>
          )}
        </div>
      </div>

      {/* Category nav */}
      <nav className="border-t border-slate-100 bg-white">
        <div className="mx-auto hidden max-w-7xl items-center gap-1 px-4 py-2 md:flex">
          <RouterLink to="/browse" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">
            All Toys
          </RouterLink>
          <RouterLink to="/browse?category=building-blocks" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">Building Blocks</RouterLink>
          <RouterLink to="/browse?category=dolls-plush" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">Dolls & Plush</RouterLink>
          <RouterLink to="/browse?category=remote-control" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">Remote Control</RouterLink>
          <RouterLink to="/browse?category=baby-toys" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">Baby Toys</RouterLink>
          <RouterLink to="/browse?category=board-games" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">Board Games</RouterLink>
          <RouterLink to="/browse?category=art-craft" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">Art & Craft</RouterLink>
          <RouterLink to="/browse?category=educational" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">Educational</RouterLink>
          <RouterLink to="/browse?category=action-figures" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">Action Figures</RouterLink>
          <RouterLink to="/browse?category=musical-toys" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-600">Musical Toys</RouterLink>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white md:hidden">
          <div className="flex flex-col gap-1 p-4">
            <RouterLink to="/browse" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">All Toys</RouterLink>
            <RouterLink to="/browse?category=building-blocks" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Building Blocks</RouterLink>
            <RouterLink to="/browse?category=dolls-plush" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Dolls & Plush</RouterLink>
            <RouterLink to="/browse?category=remote-control" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Remote Control</RouterLink>
            <RouterLink to="/browse?category=baby-toys" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Baby Toys</RouterLink>
            <RouterLink to="/browse?category=board-games" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Board Games</RouterLink>
            <RouterLink to="/browse?category=art-craft" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Art & Craft</RouterLink>
            <RouterLink to="/browse?category=educational" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Educational</RouterLink>
            <RouterLink to="/browse?category=musical-toys" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Musical Toys</RouterLink>
            <hr className="my-2 border-slate-100" />
            {user ? (
              <>
                <RouterLink to="/profile" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">My Profile</RouterLink>
                <RouterLink to="/wishlist" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Wishlist</RouterLink>
                <RouterLink to="/orders" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">My Orders</RouterLink>
                <RouterLink to="/seller" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary-50">Seller Portal</RouterLink>
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-primary-50">Sign out</button>
              </>
            ) : (
              <RouterLink to="/auth" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50">Sign in / Register</RouterLink>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
