import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, Store, Package, Flag, ArrowLeft, Shield,
} from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/sellers', label: 'Sellers', icon: Store },
  { to: '/admin/products', label: 'Catalog', icon: Package },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
];

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-10"><div className="h-96 animate-pulse rounded-2xl bg-slate-100" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="card p-8 text-center">
          <Shield size={40} className="mx-auto mb-4 text-slate-300" />
          <h2 className="mb-2 text-lg font-bold text-slate-800">Admin access required</h2>
          <p className="mb-4 text-sm text-slate-500">Sign in with an admin account to access the moderation panel.</p>
          <Link to="/auth" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="card p-8 text-center">
          <Shield size={40} className="mx-auto mb-4 text-slate-300" />
          <h2 className="mb-2 text-lg font-bold text-slate-800">You don't have admin access</h2>
          <p className="mb-4 text-sm text-slate-500">This account is not authorized to view the admin panel.</p>
          <Link to="/" className="btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Admin Panel</h1>
            <p className="text-sm text-slate-500">Marketplace moderation & management</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2">
          <Shield size={18} className="text-primary-600" />
          <span className="text-sm font-semibold text-primary-700">Administrator</span>
        </div>
      </div>

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
    </div>
  );
}
