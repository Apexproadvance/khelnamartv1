import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Mail, Lock, User, Store, ShoppingBag } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (result.error) {
      showToast(result.error, 'error');
    } else {
      showToast(mode === 'signin' ? 'Welcome back!' : 'Account created!');
      navigate('/');
    }
  }

  function fillDemo(role: 'customer' | 'seller') {
    if (role === 'customer') {
      setEmail('customer@khelnamart.bd');
      setMode('signin');
    } else {
      setEmail('toyworld@khelnamart.bd');
      setMode('signin');
    }
    setPassword('password123');
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-10 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-2xl">
              K
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm text-slate-500">
              {mode === 'signin' ? 'Sign in to your Khelnamart account' : 'Join Khelnamart today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="font-semibold text-primary-600 hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-center text-xs text-slate-400">Try a demo account:</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fillDemo('customer')} className="btn-outline text-xs">
                <ShoppingBag size={14} /> Customer
              </button>
              <button onClick={() => fillDemo('seller')} className="btn-outline text-xs">
                <Store size={14} /> Seller
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Are you a toy retailer? <Link to="/seller/register" className="text-primary-600 hover:underline">Register your store</Link>
        </p>
      </div>
    </div>
  );
}
