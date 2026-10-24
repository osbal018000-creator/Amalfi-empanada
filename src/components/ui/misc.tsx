import { type ReactNode, useState } from 'react';
import { Search, X } from 'lucide-react';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-700/40" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base pl-9 pr-9 h-10"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-700/40 hover:text-charcoal-900"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100 text-terracota-400">
        {icon}
      </div>
      <h3 className="font-display text-base font-bold text-charcoal-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-charcoal-700/70">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatPill({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'green' | 'red' | 'amber' }) {
  const tones = {
    neutral: 'bg-cream-100 text-charcoal-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`inline-flex flex-col items-center rounded-lg px-3 py-1.5 ${tones[tone]}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  function show(message: string, tone: 'success' | 'error' = 'success') {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3200);
  }
  return { toast, show };
}

export function Toast({ toast }: { toast: { message: string; tone: 'success' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 animate-fade-in">
      <div
        className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-card ${
          toast.tone === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
