export function formatBDT(amount: number): string {
  return '৳' + Math.round(amount).toLocaleString('en-BD');
}

export function discountedPrice(price: number, discountPercent: number): number {
  return price * (1 - discountPercent / 100);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ageRange(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return 'All ages';
  if (min != null && max != null) return `${min}-${max} years`;
  if (min != null) return `${min}+ years`;
  return `Up to ${max} years`;
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KM${timestamp}${random}`;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function orderStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-warning-100 text-warning-700',
    confirmed: 'bg-primary-100 text-primary-700',
    packed: 'bg-primary-100 text-primary-700',
    shipped: 'bg-primary-100 text-primary-700',
    out_for_delivery: 'bg-secondary-100 text-secondary-700',
    delivered: 'bg-success-100 text-success-700',
    cancelled: 'bg-error-100 text-error-700',
    accepted: 'bg-success-100 text-success-700',
    rejected: 'bg-error-100 text-error-700',
    ready: 'bg-secondary-100 text-secondary-700',
    completed: 'bg-success-100 text-success-700',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
}

export function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    packed: 'Packed',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    accepted: 'Accepted',
    rejected: 'Rejected',
    ready: 'Ready for Pickup',
    completed: 'Completed',
  };
  return map[status] || status;
}
