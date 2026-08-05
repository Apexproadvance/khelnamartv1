import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import { Store, MapPin, Phone, FileText, ArrowRight } from 'lucide-react';

const CITIES = ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal', 'Rangpur', 'Mymensingh', 'Comilla', 'Narayanganj'];

export default function SellerRegisterPage() {
  const { user, seller, refreshSeller } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    store_name: '',
    description: '',
    city: 'Dhaka',
    address: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Store size={40} className="mx-auto mb-4 text-slate-300" />
        <h1 className="mb-2 text-xl font-bold text-slate-800">Sign in to register your store</h1>
        <p className="mb-4 text-sm text-slate-500">You need an account before you can create a store.</p>
        <Link to="/auth" className="btn-primary">Sign In / Sign Up</Link>
      </div>
    );
  }

  if (seller) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Store size={40} className="mx-auto mb-4 text-primary-500" />
        <h1 className="mb-2 text-xl font-bold text-slate-800">Your store is already registered</h1>
        <p className="mb-4 text-sm text-slate-500">{seller.store_name} is active and ready to go.</p>
        <Link to="/seller/dashboard" className="btn-primary">Go to Dashboard</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.store_name.trim()) {
      showToast('Store name is required', 'error');
      return;
    }
    setLoading(true);
    const slug = slugify(form.store_name) + '-' + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from('sellers').insert({
      user_id: user.id,
      store_name: form.store_name.trim(),
      slug,
      description: form.description.trim() || null,
      city: form.city,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
    });
    setLoading(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    await refreshSeller();
    showToast('Store registered successfully!');
    navigate('/seller/dashboard');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white">
          <Store size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Register Your Toy Store</h1>
        <p className="text-sm text-slate-500">Join Khelnamart and start selling toys online today.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">Store Name *</label>
          <input
            type="text"
            required
            value={form.store_name}
            onChange={(e) => setForm({ ...form, store_name: e.target.value })}
            placeholder="e.g. Toy World BD"
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">Store Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Tell customers about your store..."
            rows={3}
            className="input resize-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">City</label>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input cursor-pointer"
            >
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Phone</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+880 1XXX-XXXXXX"
                className="input pl-10"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">Store Address</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="House #, Road #, Area"
              rows={2}
              className="input resize-none pl-10"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Registering...' : 'Register Store'}
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
