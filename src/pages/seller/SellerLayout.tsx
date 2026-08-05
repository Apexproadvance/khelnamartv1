import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, Package, ShoppingBag, Wallet, Store, ArrowLeft, CheckCircle2,
} from 'lucide-react';

const navItems = [
  { to: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/seller/products', label: 'Products', icon: Package },
  { to: '/seller/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/seller/payouts', label: 'Payouts', icon: Wallet },
];

export default function SellerLayout() {
  const { seller, user } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Seller Portal</h1>
            {seller && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                {seller.store_name}
                {seller.verified && <CheckCircle2 size={14} className="text-primary-500" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {!user ? (
        <div className="card p-8 text-center">
          <Store size={40} className="mx-auto mb-4 text-slate-300" />
          <h2 className="mb-2 text-lg font-bold text-slate-800">Sign in to access the Seller Portal</h2>
          <p className="mb-4 text-sm text-slate-500">You need an account to manage your store.</p>
          <div className="flex justify-center gap-3">
            <Link to="/auth" className="btn-primary">Sign In</Link>
            <Link to="/seller/register" className="btn-outline">Register Your Store</Link>
          </div>
        </div>
      ) : !seller ? (
        <div className="card p-8 text-center">
          <Store size={40} className="mx-auto mb-4 text-slate-300" />
          <h2 className="mb-2 text-lg font-bold text-slate-800">You don't have a store yet</h2>
          <p className="mb-4 text-sm text-slate-500">Register your toy store to start selling on Khelnamart.</p>
          <Link to="/seller/register" className="btn-primary">Register Your Store</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-60 shrink-0">
            <nav className="flex gap-1 overflow-x-auto lg:flex-col">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </aside>
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      )}
    </div>
  );
}
