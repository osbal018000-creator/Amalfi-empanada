import { useState } from 'react';
import { useData, orderWithDetails } from '@/lib/data';
import type { Order, OrderStatus } from '@/lib/types';
import { formatCOP, formatDate, formatTime, WEEKDAY_LABELS, MONTH_LABELS, startOfDay, endOfDay, sameDay, addDays, isSameMonth, startOfWeek } from '@/lib/format';
import { computeOrderTotals, computeSaleTotals, orderBalance } from '@/lib/calc';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge, OrderStatusBadge } from '@/components/ui/Badge';
import { StatPill } from '@/components/ui/misc';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Clock } from 'lucide-react';

interface Props {
  onCreateOrderForDate: (date: string) => void;
  onViewOrder: (orderId: string) => void;
}

type View = 'month' | 'week' | 'day';

export function Calendar({ onCreateOrderForDate, onViewOrder }: Props) {
  const d = useData();
  const { orders, orderItems, payments, sales, saleItems } = d;
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  function ordersForDay(day: Date): Order[] {
    return orders.filter((o) => o.delivery_at && sameDay(new Date(o.delivery_at), day));
  }

  function daySummary(day: Date) {
    const dayOrders = ordersForDay(day);
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const daySales = sales.filter((s) => !s.is_voided && new Date(s.created_at) >= dayStart && new Date(s.created_at) <= dayEnd);
    const dayPayments = payments.filter((p) => new Date(p.paid_at) >= dayStart && new Date(p.paid_at) <= dayEnd);
    let salesTotal = 0, salesCost = 0, salesProfit = 0;
    daySales.forEach((s) => {
      const items = saleItems.filter((i) => i.sale_id === s.id);
      const t = computeSaleTotals(items, Number(s.discount));
      salesTotal += t.total; salesCost += t.totalCost; salesProfit += t.grossProfit;
    });
    const paymentsTotal = dayPayments.reduce((s, p) => s + Number(p.amount), 0);
    const pending = dayOrders.filter((o) => o.status === 'pendiente' || o.status === 'en_preparacion').length;
    const delivered = dayOrders.filter((o) => o.status === 'entregado').length;
    return { dayOrders, daySales, salesTotal, salesCost, salesProfit, paymentsTotal, pending, delivered };
  }

  const statusColor: Record<OrderStatus, string> = {
    pendiente: 'bg-amber-400',
    en_preparacion: 'bg-sky-400',
    listo: 'bg-terracota-400',
    entregado: 'bg-emerald-400',
    cancelado: 'bg-red-300',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(addDays(cursor, view === 'month' ? -30 : view === 'week' ? -7 : -1))}><ChevronLeft size={18} /></Button>
          <div className="min-w-[180px] text-center">
            <p className="font-display text-base font-bold text-charcoal-900 capitalize">
              {view === 'month' && `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`}
              {view === 'week' && `Semana del ${formatDate(startOfWeek(cursor))}`}
              {view === 'day' && formatDate(cursor)}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setCursor(addDays(cursor, view === 'month' ? 30 : view === 'week' ? 7 : 1))}><ChevronRight size={18} /></Button>
          <Button variant="ghost" size="sm" onClick={() => { setCursor(new Date()); setSelectedDay(new Date()); }}>Hoy</Button>
        </div>
        <div className="flex rounded-lg border border-cream-200 bg-white p-0.5">
          {(['day', 'week', 'month'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${view === v ? 'bg-terracota-500 text-white' : 'text-charcoal-700 hover:bg-cream-100'}`}>{v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 card p-3 sm:p-4">
          {view === 'month' && <MonthView cursor={cursor} ordersForDay={ordersForDay} statusColor={statusColor} selectedDay={selectedDay} onSelect={(day) => setSelectedDay(day)} />}
          {view === 'week' && <WeekView cursor={cursor} ordersForDay={ordersForDay} statusColor={statusColor} selectedDay={selectedDay} onSelect={(day) => setSelectedDay(day)} />}
          {view === 'day' && <DayView cursor={cursor} ordersForDay={ordersForDay} onViewOrder={onViewOrder} />}
        </div>

        <div className="card p-4">
          {selectedDay ? (
            <DaySummary day={selectedDay} summary={daySummary(selectedDay)} onViewOrder={onViewOrder} onCreateOrder={() => onCreateOrderForDate(selectedDay.toISOString())} />
          ) : (
            <p className="text-sm text-charcoal-700/50 py-8 text-center">Selecciona un día</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthView({ cursor, ordersForDay, statusColor, selectedDay, onSelect }: {
  cursor: Date; ordersForDay: (d: Date) => Order[]; statusColor: Record<OrderStatus, string>; selectedDay: Date | null; onSelect: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((w) => <div key={w} className="text-center text-xs font-semibold uppercase text-charcoal-700/50 py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor);
          const ords = ordersForDay(day);
          const isToday = sameDay(day, new Date());
          const isSelected = selectedDay && sameDay(day, selectedDay);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={`min-h-[64px] rounded-lg border p-1.5 text-left transition sm:min-h-[78px] ${isSelected ? 'border-terracota-300 bg-terracota-50/60' : 'border-cream-200 bg-white hover:bg-cream-50'} ${!inMonth ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isToday ? 'flex h-5 w-5 items-center justify-center rounded-full bg-terracota-500 text-white' : 'text-charcoal-800'}`}>{day.getDate()}</span>
                {ords.length > 0 && <span className="text-[10px] font-semibold text-charcoal-700/50">{ords.length}</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {ords.slice(0, 4).map((o) => <span key={o.id} className={`h-1.5 w-1.5 rounded-full ${statusColor[o.status]}`} />)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, ordersForDay, statusColor, selectedDay, onSelect }: {
  cursor: Date; ordersForDay: (d: Date) => Order[]; statusColor: Record<OrderStatus, string>; selectedDay: Date | null; onSelect: (d: Date) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const ords = ordersForDay(day);
        const isToday = sameDay(day, new Date());
        const isSelected = selectedDay && sameDay(day, selectedDay);
        return (
          <button key={day.toISOString()} onClick={() => onSelect(day)} className={`min-h-[160px] rounded-lg border p-2 text-left transition ${isSelected ? 'border-terracota-300 bg-terracota-50/60' : 'border-cream-200 bg-white hover:bg-cream-50'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase text-charcoal-700/50">{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</span>
              <span className={`text-xs font-bold ${isToday ? 'flex h-5 w-5 items-center justify-center rounded-full bg-terracota-500 text-white' : 'text-charcoal-800'}`}>{day.getDate()}</span>
            </div>
            <div className="space-y-1">
              {ords.slice(0, 4).map((o) => (
                <div key={o.id} className="rounded bg-cream-50 px-1.5 py-1 text-[10px]">
                  <div className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${statusColor[o.status]}`} /><span className="font-semibold text-charcoal-900 truncate">#{o.number}</span></div>
                  {o.delivery_at && <p className="text-charcoal-700/60">{formatTime(o.delivery_at)}</p>}
                </div>
              ))}
              {ords.length > 4 && <p className="text-[10px] text-charcoal-700/50">+{ords.length - 4} más</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DayView({ cursor, ordersForDay, onViewOrder }: { cursor: Date; ordersForDay: (d: Date) => Order[]; onViewOrder: (id: string) => void }) {
  const ords = ordersForDay(cursor).sort((a, b) => (a.delivery_at || '').localeCompare(b.delivery_at || ''));
  return (
    <div>
      <p className="mb-3 font-display text-sm font-bold capitalize text-charcoal-900">{formatDate(cursor)}</p>
      {ords.length === 0 ? <p className="py-10 text-center text-sm text-charcoal-700/50">No hay pedidos programados</p> : (
        <div className="space-y-2">
          {ords.map((o) => (
            <button key={o.id} onClick={() => onViewOrder(o.id)} className="flex w-full items-center justify-between rounded-lg border border-cream-200 px-3 py-2.5 text-left hover:bg-cream-50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-100 text-charcoal-700/60"><Clock size={16} /></div>
                <div><p className="text-sm font-semibold text-charcoal-900">Pedido #{o.number}</p><p className="text-xs text-charcoal-700/60">{o.delivery_at ? formatTime(o.delivery_at) : 'Sin hora'}</p></div>
              </div>
              <OrderStatusBadge status={o.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DaySummary({ day, summary, onViewOrder, onCreateOrder }: { day: Date; summary: { dayOrders: Order[]; daySales: any[]; salesTotal: number; salesCost: number; salesProfit: number; paymentsTotal: number; pending: number; delivered: number }; onViewOrder: (id: string) => void; onCreateOrder: () => void }) {
  const { customers, orderItems, payments } = useData();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-terracota-500" />
          <p className="font-display text-sm font-bold capitalize text-charcoal-900">{formatDate(day)}</p>
        </div>
        <Button size="sm" variant="subtle" leftIcon={<Plus size={14} />} onClick={onCreateOrder}>Pedido para este día</Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatPill label="Pedidos" value={String(summary.dayOrders.length)} />
        <StatPill label="Pendientes" value={String(summary.pending)} tone={summary.pending > 0 ? 'amber' : 'neutral'} />
        <StatPill label="Entregados" value={String(summary.delivered)} tone="green" />
        <StatPill label="Ventas" value={String(summary.daySales.length)} />
      </div>
      <div className="rounded-xl bg-cream-50 p-3 text-sm space-y-1.5">
        <div className="flex justify-between text-charcoal-700/80"><span>Ventas del día</span><strong>{formatCOP(summary.salesTotal)}</strong></div>
        <div className="flex justify-between text-charcoal-700/70"><span>Costo</span><span>{formatCOP(summary.salesCost)}</span></div>
        <div className="flex justify-between font-semibold text-terracota-600 border-t border-cream-200 pt-1.5"><span>Utilidad bruta</span><span>{formatCOP(summary.salesProfit)}</span></div>
        <div className="flex justify-between text-charcoal-700/80 border-t border-cream-200 pt-1.5"><span>Dinero recibido</span><strong>{formatCOP(summary.paymentsTotal)}</strong></div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-700/60">Pedidos programados</p>
        {summary.dayOrders.length === 0 ? <p className="text-sm text-charcoal-700/50">Sin pedidos para este día</p> : (
          <div className="space-y-1.5">
            {summary.dayOrders.map((o) => {
              const items = orderItems.filter((i) => i.order_id === o.id);
              const pays = payments.filter((p) => p.order_id === o.id);
              const totals = computeOrderTotals(items, Number(o.discount));
              const cust = customers.find((c) => c.id === o.customer_id);
              return (
                <button key={o.id} onClick={() => onViewOrder(o.id)} className="flex w-full items-center justify-between rounded-lg border border-cream-200 px-3 py-2 text-left hover:bg-cream-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal-900">#{o.number} · {cust?.name || 'Sin cliente'}</p>
                    <p className="text-xs text-charcoal-700/60">{o.delivery_at ? formatTime(o.delivery_at) : 'Sin hora'} · {formatCOP(totals.total)}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
