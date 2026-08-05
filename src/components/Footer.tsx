import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Shield, Truck, RotateCcw, CreditCard } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      {/* Trust badges */}
      <div className="border-b border-slate-100">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
          <div className="flex items-center gap-3">
            <Shield className="text-primary-600" size={28} />
            <div>
              <div className="text-sm font-semibold text-slate-800">Secure Payment</div>
              <div className="text-xs text-slate-500">bKash, Nagad, Card</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Truck className="text-primary-600" size={28} />
            <div>
              <div className="text-sm font-semibold text-slate-800">Nationwide Delivery</div>
              <div className="text-xs text-slate-500">All 64 districts</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RotateCcw className="text-primary-600" size={28} />
            <div>
              <div className="text-sm font-semibold text-slate-800">Easy Returns</div>
              <div className="text-xs text-slate-500">7-day return policy</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="text-primary-600" size={28} />
            <div>
              <div className="text-sm font-semibold text-slate-800">Cash on Delivery</div>
              <div className="text-xs text-slate-500">Pay when you receive</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-lg">K</div>
            <span className="text-xl font-bold text-slate-800">Khelna<span className="text-primary-600">mart</span></span>
          </div>
          <p className="text-sm text-slate-500">
            Bangladesh's largest toy marketplace. Discover toys from retailers across the country, all in one place.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-800">Shop</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link to="/browse" className="hover:text-primary-600">All Toys</Link></li>
            <li><Link to="/browse?category=building-blocks" className="hover:text-primary-600">Building Blocks</Link></li>
            <li><Link to="/browse?category=dolls-plush" className="hover:text-primary-600">Dolls & Plush</Link></li>
            <li><Link to="/browse?category=educational" className="hover:text-primary-600">Educational Toys</Link></li>
            <li><Link to="/browse?category=remote-control" className="hover:text-primary-600">Remote Control</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-800">Sell</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link to="/seller" className="hover:text-primary-600">Seller Portal</Link></li>
            <li><Link to="/seller/register" className="hover:text-primary-600">Become a Seller</Link></li>
            <li><Link to="/seller/dashboard" className="hover:text-primary-600">Dashboard</Link></li>
            <li><Link to="/seller/products" className="hover:text-primary-600">Manage Products</Link></li>
            <li><Link to="/seller/orders" className="hover:text-primary-600">Orders</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-800">Contact</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-2"><Mail size={14} /> support@khelnamart.bd</li>
            <li className="flex items-center gap-2"><Phone size={14} /> +880 1700-000000</li>
            <li className="flex items-center gap-2"><MapPin size={14} /> Dhaka, Bangladesh</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 sm:flex-row">
          <p className="text-xs text-slate-400">© 2026 Khelnamart. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">bKash</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Nagad</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Rocket</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">VISA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
