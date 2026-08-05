import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { formatBDT, timeAgo } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { Wallet, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import type { SellerPayout, OrderItem } from '@/lib/types';

export default function SellerPayouts() {
  const { seller } = useAuth();
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!seller) return;
    const [payoutRes, orderRes] = await Promise.all([
      supabase.from('seller_payouts').select('*').eq('seller_id', seller.id).order('created_at', { ascending: false }),
      supabase.from('order_items').select('*').eq('seller_id', seller.id).order('created_at', { ascending: false }),
    ]);
    setPayouts(payoutRes.data as SellerPayout[] ?? []);
    setOrders(orderRes.data as OrderItem[] ?? []);
    setLoading(false);
  }, [seller]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const completedRevenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + o.price * o.quantity, 0);

  const pendingRevenue = orders
    .filter((o) => ['accepted', 'packed', 'ready'].includes(o.status))
    .reduce((sum, o) => sum + o.price * o.quantity, 0);

  const paidOut = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const availableBalance = completedRevenue - paidOut;

  const statCards = [
    { label: 'Available Balance', value: formatBDT(availableBalance), icon: Wallet, color: 'text-success-600 bg-success-50' },
    { label: 'Pending Revenue', value: formatBDT(pendingRevenue), icon: Clock, color: 'text-warning-600 bg-warning-50' },
    { label: 'Total Earned', value: formatBDT(completedRevenue), icon: TrendingUp, color: 'text-primary-600 bg-primary-50' },
    { label: 'Total Paid Out', value: formatBDT(paidOut), icon: CheckCircle2, color: 'text-accent-600 bg-accent-50' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">Payouts & Earnings</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                <Icon size={20} />
              </div>
              <div className="text-xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-800">Payout History</h3>
        {payouts.length === 0 ? (
          <EmptyState icon={Wallet} title="No payouts yet" description="Your settlement history will appear here once payouts are processed." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-600">{timeAgo(payout.created_at)}</td>
                    <td className="px-3 py-3 font-medium text-slate-800">{formatBDT(payout.amount)}</td>
                    <td className="px-3 py-3 text-slate-500">{payout.payment_method ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`badge ${payout.status === 'paid' ? 'bg-success-100 text-success-700' : payout.status === 'pending' ? 'bg-warning-100 text-warning-700' : 'bg-error-100 text-error-700'}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-400">{payout.transaction_ref ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
