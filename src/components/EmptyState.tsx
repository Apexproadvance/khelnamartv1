import { Package } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
}: {
  icon?: typeof Package;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
        <Icon size={36} className="text-slate-300" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  );
}
