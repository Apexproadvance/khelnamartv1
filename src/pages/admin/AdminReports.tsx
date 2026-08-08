import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import type { Report } from '@/lib/types';
import { timeAgo } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { Flag, X, AlertTriangle, CheckCircle2, Clock, ChevronDown } from 'lucide-react';

type Filter = 'all' | 'open' | 'investigating' | 'resolved' | 'dismissed';

const categoryLabels: Record<string, string> = {
  counterfeit: 'Counterfeit',
  inappropriate: 'Inappropriate Content',
  broken: 'Broken / Defective',
  dispute: 'Order Dispute',
  spam: 'Spam',
  other: 'Other',
};

const priorityColors: Record<string, string> = {
  high: 'bg-error-100 text-error-700',
  medium: 'bg-warning-100 text-warning-700',
  low: 'bg-slate-100 text-slate-600',
};

const statusColors: Record<string, string> = {
  open: 'bg-error-100 text-error-700',
  investigating: 'bg-warning-100 text-warning-700',
  resolved: 'bg-success-100 text-success-700',
  dismissed: 'bg-slate-100 text-slate-500',
};

export default function AdminReports() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Failed to load reports', 'error');
      return;
    }
    setReports((data as Report[]) ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function updateReport(reportId: string, status: string, priority?: string) {
    const { error } = await supabase.rpc('admin_update_report', {
      p_report_id: reportId,
      p_status: status,
      p_priority: priority ?? null,
      p_resolution_note: status === 'resolved' || status === 'dismissed' ? resolutionNote || null : null,
    });
    if (error) {
      showToast('Failed to update report', 'error');
      return;
    }
    showToast(`Report marked as ${status}`);
    setSelectedReport(null);
    setResolutionNote('');
    load();
  }

  const filtered = reports.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: reports.length },
    { key: 'open', label: 'Open', count: reports.filter((r) => r.status === 'open').length },
    { key: 'investigating', label: 'Investigating', count: reports.filter((r) => r.status === 'investigating').length },
    { key: 'resolved', label: 'Resolved', count: reports.filter((r) => r.status === 'resolved').length },
    { key: 'dismissed', label: 'Dismissed', count: reports.filter((r) => r.status === 'dismissed').length },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Reports & Disputes</h2>

      <div className="flex gap-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${filter === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" description="Reports filed by customers and sellers will appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <div key={report.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-primary-100 text-primary-700">{categoryLabels[report.category] ?? report.category}</span>
                    <span className={`badge ${priorityColors[report.priority]}`}>{report.priority} priority</span>
                    <span className={`badge ${statusColors[report.status]}`}>{report.status}</span>
                  </div>
                  <h3 className="mt-2 font-bold text-slate-800">{report.subject}</h3>
                  <p className="mt-1 text-sm text-slate-500">{report.description}</p>
                  <p className="mt-2 text-xs text-slate-400">Filed {timeAgo(report.created_at)}</p>
                  {report.resolution_note && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-2.5">
                      <p className="text-xs font-medium text-slate-500">Resolution:</p>
                      <p className="text-sm text-slate-600">{report.resolution_note}</p>
                    </div>
                  )}
                </div>
              </div>

              {report.status !== 'resolved' && report.status !== 'dismissed' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.status !== 'investigating' && (
                    <button
                      onClick={() => updateReport(report.id, 'investigating')}
                      className="btn text-xs px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      <Clock size={14} /> Start Investigation
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedReport(report); setResolutionNote(''); }}
                    className="btn text-xs px-4 py-2 bg-success-500 text-white hover:bg-success-600"
                  >
                    <CheckCircle2 size={14} /> Resolve
                  </button>
                  <button
                    onClick={() => updateReport(report.id, 'dismissed')}
                    className="btn text-xs px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100"
                  >
                    <X size={14} /> Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolution modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedReport(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 animate-bounce-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Resolve Report</h2>
              <button onClick={() => setSelectedReport(null)} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="mb-4 rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">{selectedReport.subject}</p>
              <p className="text-xs text-slate-500">{categoryLabels[selectedReport.category]}</p>
            </div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Resolution Note</label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={4}
              className="input resize-none"
              placeholder="Describe the action taken..."
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => updateReport(selectedReport.id, 'resolved')}
                className="btn-primary flex-1 py-3"
              >
                <CheckCircle2 size={16} /> Mark Resolved
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="btn-outline px-5 py-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
