import { type ReactNode } from 'react';

type Tone = 'neutral' | 'terracota' | 'green' | 'amber' | 'red' | 'blue' | 'gray';

const tones: Record<Tone, string> = {
  neutral: 'bg-cream-100 text-charcoal-700',
  terracota: 'bg-terracota-50 text-terracota-600',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-sky-50 text-sky-700',
  gray: 'bg-gray-100 text-gray-600',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

import type { OrderStatus } from '@/lib/types';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_META: Record<OrderStatus, { label: string; tone: Tone; icon: ReactNode }> = {
  pendiente: { label: 'Pendiente', tone: 'amber', icon: <Clock size={12} /> },
  en_preparacion: { label: 'En preparación', tone: 'blue', icon: <Clock size={12} /> },
  listo: { label: 'Listo', tone: 'terracota', icon: <CheckCircle2 size={12} /> },
  entregado: { label: 'Entregado', tone: 'green', icon: <CheckCircle2 size={12} /> },
  cancelado: { label: 'Cancelado', tone: 'red', icon: <XCircle size={12} /> },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status];
  return <Badge tone={m.tone}>{m.icon}{m.label}</Badge>;
}

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];
