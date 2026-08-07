import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { supabase } from '@/lib/supabase';
import type { Address, Customer, Order } from '@/lib/types';
import { formatBDT, orderStatusLabel, orderStatusColor, timeAgo } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { MapPin, Plus, Trash2, Pencil, X, Package, ShoppingBag, Heart, User, Check } from 'lucide-react';

const CITIES = ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal', 'Rangpur', 'Mymensingh', 'Comilla', 'Narayanganj'];

type Tab = 'profile' | 'addresses' | 'orders' | 'wishlist';

export default function CustomerProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('profile');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState({ label: 'Home', name: '', phone: '', address_line: '', city: 'Dhaka', is_default: false });

  const load = useCallback(async () => {
    if (!user) return;
    const [custRes, addrRes, orderRes] = await Promise.all([
      supabase.from('customers').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);
    setCustomer(custRes.data as Customer | null);
    setAddresses(addrRes.data as Address[] ?? []);
    setOrders(orderRes.data as Order[] ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    load();
  }, [user, navigate, load]);

  async function saveProfile(name: string, phone: string) {
    if (!user) return;
    if (customer) {
      await supabase.from('customers').update({ full_name: name, phone }).eq('id', customer.id);
    } else {
      await supabase.from('customers').insert({ user_id: user.id, full_name: name, phone });
    }
    showToast('Profile saved!');
    load();
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!addrForm.name.trim() || !addrForm.phone.trim() || !addrForm.address_line.trim()) {
      showToast('Please fill all fields', 'error');
      return;
    }
    if (addrForm.is_default) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    }
    if (editingAddr) {
      await supabase.from('addresses').update(addrForm).eq('id', editingAddr);
      showToast('Address updated!');
    } else {
      await supabase.from('addresses').insert({ ...addrForm, user_id: user.id });
      showToast('Address added!');
    }
    setShowAddrForm(false);
    setEditingAddr(null);
    setAddrForm({ label: 'Home', name: '', phone: '', address_line: '', city: 'Dhaka', is_default: false });
    load();
  }

  async function deleteAddress(id: string) {
    await supabase.from('addresses').delete().eq('id', id);
    showToast('Address deleted');
    load();
  }

  function openEditAddr(addr: Address) {
    setEditingAddr(addr.id);
    setAddrForm({ label: addr.label, name: addr.name, phone: addr.phone, address_line: addr.address_line, city: addr.city, is_default: addr.is_default });
    setShowAddrForm(true);
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-10"><div className="h-96 animate-pulse rounded-2xl bg-slate-100" /></div>;
  }

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'addresses', label: 'Addresses', icon: MapPin },
    { key: 'orders', label: 'Orders', icon: ShoppingBag },
    { key: 'wishlist', label: 'Wishlist', icon: Heart },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">My Account</h1>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === 'profile' && (
          <ProfileTab customer={customer} email={user?.email ?? ''} onSave={saveProfile} />
        )}

        {tab === 'addresses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Saved Addresses</h2>
              <button onClick={() => { setEditingAddr(null); setAddrForm({ label: 'Home', name: '', phone: '', address_line: '', city: 'Dhaka', is_default: false }); setShowAddrForm(true); }} className="btn-primary">
                <Plus size={18} /> Add Address
              </button>
            </div>
            {addresses.length === 0 ? (
              <EmptyState icon={MapPin} title="No saved addresses" description="Add an address for faster checkout." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((addr) => (
                  <div key={addr.id} className="card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="badge bg-primary-100 text-primary-700">{addr.label}</span>
                      {addr.is_default && <span className="badge bg-success-100 text-success-700"><Check size={10} /> Default</span>}
                    </div>
                    <p className="font-medium text-slate-800">{addr.name}</p>
                    <p className="text-sm text-slate-500">{addr.phone}</p>
                    <p className="text-sm text-slate-500">{addr.address_line}, {addr.city}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => openEditAddr(addr)} className="btn-ghost text-xs"><Pencil size={14} /> Edit</button>
                      <button onClick={() => deleteAddress(addr.id)} className="btn-ghost text-xs text-error-600 hover:bg-error-50"><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <EmptyState icon={Package} title="No orders yet" description="Your order history will appear here." action={<Link to="/browse" className="btn-primary mt-4">Browse Toys</Link>} />
            ) : (
              orders.map((order) => (
                <div key={order.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">#{order.order_number}</span>
                      <span className={`badge ml-2 ${orderStatusColor(order.status)}`}>{orderStatusLabel(order.status)}</span>
                    </div>
                    <span className="text-sm text-slate-400">{timeAgo(order.created_at)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-slate-500">{order.shipping_city}</span>
                    <span className="font-bold text-slate-900">{formatBDT(order.total)}</span>
                  </div>
                  <Link to="/orders" className="mt-2 inline-block text-sm text-primary-600 hover:underline">View details</Link>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'wishlist' && (
          <div className="text-center py-10">
            <Heart size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 mb-4">View your saved toys</p>
            <Link to="/wishlist" className="btn-primary">Go to Wishlist</Link>
          </div>
        )}
      </div>

      {/* Address form modal */}
      {showAddrForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddrForm(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 animate-bounce-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{editingAddr ? 'Edit Address' : 'Add Address'}</h2>
              <button onClick={() => setShowAddrForm(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form onSubmit={saveAddress} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Label</label>
                <select value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} className="input cursor-pointer">
                  <option>Home</option><option>Office</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Full Name</label>
                <input value={addrForm.name} onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })} className="input" placeholder="John Doe" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Phone</label>
                <input value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} className="input" placeholder="+880 1XXX-XXXXXX" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Address</label>
                <textarea value={addrForm.address_line} onChange={(e) => setAddrForm({ ...addrForm, address_line: e.target.value })} rows={2} className="input resize-none" placeholder="House #, Road #, Area" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">City</label>
                <select value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} className="input cursor-pointer">
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={addrForm.is_default} onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })} className="h-4 w-4 rounded text-primary-600" />
                Set as default address
              </label>
              <button type="submit" className="btn-primary w-full py-3">{editingAddr ? 'Update' : 'Add'} Address</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileTab({ customer, email, onSave }: { customer: Customer | null; email: string; onSave: (name: string, phone: string) => void }) {
  const [name, setName] = useState(customer?.full_name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');

  return (
    <div className="card max-w-md p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xl font-bold">
          {(name || email)[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{name || 'Your Name'}</h2>
          <p className="text-sm text-slate-500">{email}</p>
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSave(name, phone); }} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your name" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+880 1XXX-XXXXXX" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">Email</label>
          <input value={email} disabled className="input bg-slate-50 text-slate-400" />
        </div>
        <button type="submit" className="btn-primary w-full py-3">Save Profile</button>
      </form>
    </div>
  );
}
