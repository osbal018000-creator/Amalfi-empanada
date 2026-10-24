import { useState, useMemo } from 'react';
import { useData } from '@/lib/data';
import type { Sale, Order, SaleItem, Payment } from '@/lib/types';
import { formatCOP, formatPercent, formatNumber, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, addDays, addMonths, formatDate, sameDay, MONTH_LABELS_SHORT } from '@/lib/format';
import { computeSaleTotals, orderBalance, previousPeriod, type PeriodRange } from '@/lib/calc';
import { Button } from '@/components/ui/Button';
import { Badge, OrderStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/misc';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Line,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Package, ShoppingBag, DollarSign, Receipt,
  ClipboardList, ArrowRight, CalendarRange, Activity,
} from 'lucide-react';

type PeriodKey = 'today' | 'week' | 'month' | 'year' | 'custom';

export function Dashboard({ onNavigate, onNewSale }: { onNavigate: (v: any) => void; onNewSale: () => void }) {
  const d = useData();
  const { sales, saleItems, orders, orderItems, payments, customers, paymentMethods, products } = d;
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customStart, setCustomStart] = useState(formatDateInput(addDays(new Date(), -30)));
  const [customEnd, setCustomEnd] = useState(formatDateInput(new Date()));

  const range: PeriodRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) };
      case 'week': return { start: startOfDay(startOfWeek(now)), end: endOfDay(addDays(startOfWeek(now), 6)) };
      case 'month': return { start: startOfDay(startOfMonth(now)), end: endOfDay(addDays(startOfMonth(now), 30)) };
      case 'year': return { start: startOfDay(startOfYear(now)), end: endOfDay(addMonths(startOfYear(now), 12)) };
      case 'custom': return { start: startOfDay(new Date(customStart + 'T12:00:00')), end: endOfDay(new Date(customEnd + 'T12:00:00')) };
    }
  }, [period, customStart, customEnd]);

  const prev = previousPeriod(range);

  const activeSales = sales.filter((s) => !s.is_voided);
  const salesInPeriod = activeSales.filter((s) => inRange(s.created_at, range));
  const salesInPrev = activeSales.filter((s) => inRange(s.created_at, prev));
  const paymentsInPeriod = payments.filter((p) => inRange(p.paid_at, range));
  const paymentsInPrev = payments.filter((p) => inRange(p.paid_at, prev));
  const standaloneSales = activeSales.filter((s) => !s.order_id);

  // KPIs
  const kpis = useMemo(() => {
    let salesTotal = 0, salesCost = 0, units = 0, directSalesReceived = 0;
    salesInPeriod.forEach((s) => {
      const items = saleItems.filter((i) => i.sale_id === s.id);
      const t = computeSaleTotals(items, Number(s.discount));
      salesTotal += t.total; salesCost += t.totalCost; units += t.units;
      if (!s.order_id) directSalesReceived += t.total;
    });
    let prevSalesTotal = 0, prevDirectSalesReceived = 0;
    salesInPrev.forEach((s) => {
      const items = saleItems.filter((i) => i.sale_id === s.id);
      const t = computeSaleTotals(items, Number(s.discount));
      prevSalesTotal += t.total;
      if (!s.order_id) prevDirectSalesReceived += t.total;
    });
    const grossProfit = salesTotal - salesCost;
    const grossMargin = salesTotal > 0 ? (grossProfit / salesTotal) * 100 : 0;
    const moneyReceived = directSalesReceived + paymentsInPeriod.reduce((s, p) => s + Number(p.amount), 0);
    const prevMoney = prevDirectSalesReceived + paymentsInPrev.reduce((s, p) => s + Number(p.amount), 0);

    const pendingOrders = orders.filter((o) => o.status === 'pendiente' || o.status === 'en_preparacion' || o.status === 'listo').length;
    const receivable = orders
      .filter((o) => o.status !== 'cancelado')
      .reduce((sum, o) => {
        const items = orderItems.filter((i) => i.order_id === o.id);
        const t = computeSaleTotals(items, Number(o.discount));
        const pays = payments.filter((p) => p.order_id === o.id);
        return sum + orderBalance(t.total, pays);
      }, 0);

    return {
      salesTotal, salesCost, grossProfit, grossMargin, units, moneyReceived, pendingOrders, receivable,
      deltaSales: pctChange(salesTotal, prevSalesTotal),
      deltaMoney: pctChange(moneyReceived, prevMoney),
    };
  }, [salesInPeriod, salesInPrev, saleItems, paymentsInPeriod, paymentsInPrev, orders, orderItems, payments]);

  // Charts
  const salesDailySeries = useMemo(() => buildDailySeries(range, activeSales, saleItems, []), [range, activeSales, saleItems]);
  const cashDailySeries = useMemo(() => buildDailySeries(range, standaloneSales, saleItems, payments), [range, standaloneSales, saleItems, payments]);
  const productRanking = useMemo(() => buildProductRanking(salesInPeriod, saleItems), [salesInPeriod, saleItems]);
  const paymentDistribution = useMemo(() => buildPaymentDist(salesInPeriod, saleItems, paymentMethods), [salesInPeriod, saleItems, paymentMethods]);
  const salesMonthlySeries = useMemo(() => buildMonthlySeries(activeSales, saleItems, [], range), [activeSales, saleItems, range]);
  const cashMonthlySeries = useMemo(() => buildMonthlySeries(standaloneSales, saleItems, payments, range), [standaloneSales, saleItems, payments, range]);

  const recentActivity = useMemo(() => {
    const items: { date: string; type: 'sale' | 'order' | 'payment'; label: string; amount: number; id: string }[] = [];
    salesInPeriod.slice(0, 10).forEach((s) => {
      const cust = customers.find((c) => c.id === s.customer_id);
      const t = computeSaleTotals(saleItems.filter((i) => i.sale_id === s.id), Number(s.discount));
      items.push({ date: s.created_at, type: 'sale', label: `Venta #${s.number} · ${cust?.name || 'Sin cliente'}`, amount: t.total, id: s.id });
    });
    paymentsInPeriod.slice(0, 10).forEach((p) => {
      const o = orders.find((or) => or.id === p.order_id);
      const cust = o ? customers.find((c) => c.id === o.customer_id) : null;
      items.push({ date: p.paid_at, type: 'payment', label: `Abono recibido · Pedido #${o?.number || '?'} · ${cust?.name || 'Sin cliente'}`, amount: Number(p.amount), id: p.id });
    });
    orders.filter((o) => o.status === 'pendiente' && inRange(o.created_at, range)).slice(0, 10).forEach((o) => {
      const cust = customers.find((c) => c.id === o.customer_id);
      const oitems = orderItems.filter((i) => i.order_id === o.id);
      const t = computeSaleTotals(oitems, Number(o.discount));
      items.push({ date: o.created_at, type: 'order', label: `Pedido #${o.number} · ${cust?.name || 'Sin cliente'} (pendiente)`, amount: t.total, id: o.id });
    });
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [salesInPeriod, paymentsInPeriod, customers, orders, saleItems, orderItems, range]);

  const hasData = activeSales.length > 0 || orders.length > 0 || payments.length > 0;

  return (
    <div className="space-y-5">
      {/* Period filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-cream-200 bg-white p-1">
          {(['today', 'week', 'month', 'year', 'custom'] as PeriodKey[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 btn-press ${period === p ? 'bg-terracota-500 text-white shadow-soft' : 'text-charcoal-700 hover:bg-cream-100'}`}>
              {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : p === 'year' ? 'Año' : 'Personalizado'}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input-base h-9 w-auto" />
            <span className="text-charcoal-700/50">—</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input-base h-9 w-auto" />
          </div>
        )}
        <div className="hidden items-center gap-1.5 text-xs text-charcoal-700/60 sm:flex">
          <CalendarRange size={14} /> {formatDate(range.start)} — {formatDate(range.end)}
        </div>
      </div>

      {!hasData ? (
        <div className="card">
          <EmptyState
            icon={<Activity size={26} />}
            title="Bienvenida a tu panel"
            description="Aún no hay ventas ni pedidos registrados. Comienza agregando tus productos y registrando tu primera venta."
            action={<div className="flex gap-2"><Button onClick={onNewSale} leftIcon={<Receipt size={16} />}>Registrar venta</Button><Button variant="outline" onClick={() => onNavigate('products')}>Ver productos</Button></div>}
          />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={<ShoppingBag size={18} />} label="Ventas realizadas" value={formatCOP(kpis.salesTotal)} delta={kpis.deltaSales} tone="terracota" />
            <KpiCard icon={<Wallet size={18} />} label="Ingresos recibidos" value={formatCOP(kpis.moneyReceived)} delta={kpis.deltaMoney} tone="green" />
            <KpiCard icon={<Package size={18} />} label="Costo de productos vendidos" value={formatCOP(kpis.salesCost)} tone="amber" />
            <KpiCard icon={<TrendingUp size={18} />} label="Utilidad bruta" value={formatCOP(kpis.grossProfit)} tone="terracota" />
            <KpiCard icon={<Receipt size={18} />} label="Margen bruto" value={formatPercent(kpis.grossMargin)} tone="terracota" />
            <KpiCard icon={<ClipboardList size={18} />} label="Pedidos pendientes" value={formatNumber(kpis.pendingOrders)} tone="amber" />
            <KpiCard icon={<DollarSign size={18} />} label="Saldo por cobrar" value={formatCOP(kpis.receivable)} tone="amber" />
            <KpiCard icon={<Package size={18} />} label="Unidades vendidas" value={formatNumber(kpis.units)} tone="green" />
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-4 lg:col-span-2">
              <h3 className="font-display text-sm font-bold text-charcoal-900 mb-3">Ventas, costos y utilidad</h3>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={period === 'year' ? salesMonthlySeries : salesDailySeries}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B05337" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#B05337" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFE3D0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#3A3530' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => formatCOPShort(v)} tick={{ fontSize: 11, fill: '#3A3530' }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="ventas" stroke="#B05337" strokeWidth={2} fill="url(#gSales)" name="Ventas" />
                  <Bar dataKey="costos" fill="#E9B8A9" radius={[4, 4, 0, 0]} name="Costos" barSize={period === 'year' ? 16 : 10} />
                  <Line type="monotone" dataKey="utilidad" stroke="#6E3320" strokeWidth={2} dot={false} name="Utilidad" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4">
              <h3 className="font-display text-sm font-bold text-charcoal-900 mb-3">Métodos de pago</h3>
              {paymentDistribution.length === 0 ? (
                <p className="py-16 text-center text-sm text-charcoal-700/50">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={paymentDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {paymentDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-4 lg:col-span-2">
              <h3 className="font-display text-sm font-bold text-charcoal-900 mb-3">Ingresos recibidos por día</h3>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={period === 'year' ? cashMonthlySeries : cashDailySeries}>
                  <defs>
                    <linearGradient id="gMoney" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFE3D0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#3A3530' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => formatCOPShort(v)} tick={{ fontSize: 11, fill: '#3A3530' }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="ventasDirectas" stroke="#B05337" strokeWidth={2} fill="url(#gMoney)" name="Ventas directas" />
                  <Bar dataKey="abonos" fill="#10b981" radius={[4, 4, 0, 0]} name="Abonos de pedidos" barSize={period === 'year' ? 16 : 10} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4">
              <h3 className="font-display text-sm font-bold text-charcoal-900 mb-3">Productos más vendidos</h3>
              {productRanking.length === 0 ? <p className="py-16 text-center text-sm text-charcoal-700/50">Sin datos</p> : (
                <div className="space-y-2.5">
                  {productRanking.slice(0, 6).map((p, i) => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 truncate"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-cream-100 text-[10px] font-bold text-charcoal-700">{i + 1}</span><span className="truncate font-semibold text-charcoal-900">{p.name}</span></span>
                        <span className="ml-2 shrink-0 font-semibold text-charcoal-800">{formatNumber(p.units)}u</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-cream-100"><div className="h-full rounded-full bg-gradient-to-r from-terracota-300 to-terracota-500 transition-[width] duration-700 ease-out-expo" style={{ width: `${(p.units / (productRanking[0]?.units || 1)) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-bold text-charcoal-900">Actividad reciente</h3>
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />} onClick={() => onNavigate('sales')}>Ver todas</Button>
            </div>
            {recentActivity.length === 0 ? <p className="py-8 text-center text-sm text-charcoal-700/50">Sin actividad en este periodo</p> : (
              <div className="divide-y divide-cream-200">
                {recentActivity.map((a) => (
                  <div key={a.id + a.type} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.type === 'sale' ? 'bg-terracota-50 text-terracota-500' : a.type === 'payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {a.type === 'sale' ? <Receipt size={15} /> : a.type === 'payment' ? <Wallet size={15} /> : <ClipboardList size={15} />}
                      </div>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-charcoal-900">{a.label}</p><p className="text-xs text-charcoal-700/60">{formatDate(a.date)}</p></div>
                    </div>
                    <span className={`shrink-0 text-sm font-bold ${a.type === 'sale' ? 'text-charcoal-900' : a.type === 'payment' ? 'text-emerald-600' : 'text-amber-600'}`}>{formatCOP(a.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, delta, tone }: { icon: React.ReactNode; label: string; value: string; delta?: number | null; tone: 'terracota' | 'green' | 'amber' }) {
  const toneClass = { terracota: 'bg-terracota-50 text-terracota-500', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' }[tone];
  return (
    <div className="card card-hover group p-4">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:-rotate-3 ${toneClass}`}>{icon}</div>
        {delta !== undefined && delta !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-charcoal-700/50">{label}</p>
      <p className="mt-0.5 font-display text-xl font-extrabold text-charcoal-900">{value}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-cream-200 bg-white/95 px-3 py-2 text-xs shadow-lift backdrop-blur">
      <p className="mb-1 font-bold text-charcoal-900">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {formatCOP(p.value)}</p>
      ))}
    </div>
  );
}

const PIE_COLORS = ['#B05337', '#10b981', '#E9B8A9', '#3A3530', '#C76B4D'];

function formatCOPShort(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
}

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function inRange(d: string, r: PeriodRange): boolean {
  const date = new Date(d);
  return date >= r.start && date <= r.end;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

function buildDailySeries(range: PeriodRange, sales: Sale[], saleItems: SaleItem[], payments: Payment[]) {
  const days: { label: string; date: Date; ventas: number; costos: number; utilidad: number; ventasDirectas: number; abonos: number }[] = [];
  const span = Math.min(90, Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000) + 1);
  for (let i = 0; i < span; i++) {
    const day = addDays(range.start, i);
    days.push({ label: `${day.getDate()}/${day.getMonth() + 1}`, date: day, ventas: 0, costos: 0, utilidad: 0, ventasDirectas: 0, abonos: 0 });
  }
  sales.forEach((s) => {
    const items = saleItems.filter((i) => i.sale_id === s.id);
    const t = computeSaleTotals(items, Number(s.discount));
    const day = days.find((d) => sameDay(d.date, new Date(s.created_at)));
    if (day) { day.ventas += t.total; day.costos += t.totalCost; day.utilidad += t.grossProfit; day.ventasDirectas += t.total; }
  });
  payments.forEach((p) => {
    const day = days.find((d) => sameDay(d.date, new Date(p.paid_at)));
    if (day) day.abonos += Number(p.amount);
  });
  return days;
}

function buildMonthlySeries(sales: Sale[], saleItems: SaleItem[], payments: Payment[], range: PeriodRange) {
  const months: { label: string; ventas: number; costos: number; utilidad: number; ventasDirectas: number; abonos: number }[] = [];
  const start = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  let m = 0;
  while (true) {
    const monthStart = new Date(start.getFullYear(), start.getMonth() + m, 1);
    if (monthStart > range.end) break;
    months.push({ label: MONTH_LABELS_SHORT[monthStart.getMonth()], ventas: 0, costos: 0, utilidad: 0, ventasDirectas: 0, abonos: 0 });
    m++;
  }
  sales.forEach((s) => {
    const items = saleItems.filter((i) => i.sale_id === s.id);
    const t = computeSaleTotals(items, Number(s.discount));
    const sd = new Date(s.created_at);
    const mo = months.find((_, i) => {
      const ms = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return sd.getMonth() === ms.getMonth() && sd.getFullYear() === ms.getFullYear();
    });
    if (mo) { mo.ventas += t.total; mo.costos += t.totalCost; mo.utilidad += t.grossProfit; mo.ventasDirectas += t.total; }
  });
  payments.forEach((p) => {
    const pd = new Date(p.paid_at);
    const mo = months.find((_, i) => {
      const ms = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return pd.getMonth() === ms.getMonth() && pd.getFullYear() === ms.getFullYear();
    });
    if (mo) mo.abonos += Number(p.amount);
  });
  return months;
}

function buildProductRanking(sales: Sale[], saleItems: SaleItem[]) {
  const map = new Map<string, { name: string; units: number; revenue: number }>();
  sales.forEach((s) => {
    saleItems.filter((i) => i.sale_id === s.id).forEach((i) => {
      const k = i.product_id;
      const ex = map.get(k) || { name: i.product_name, units: 0, revenue: 0 };
      ex.units += Number(i.quantity);
      ex.revenue += Number(i.quantity) * Number(i.unit_price);
      map.set(k, ex);
    });
  });
  return Array.from(map.values()).sort((a, b) => b.units - a.units);
}

function buildPaymentDist(sales: Sale[], saleItems: SaleItem[], methods: { id: string; name: string }[]) {
  const map = new Map<string, number>();
  sales.forEach((s) => {
    const items = saleItems.filter((i) => i.sale_id === s.id);
    const t = computeSaleTotals(items, Number(s.discount));
    const name = methods.find((m) => m.id === s.method_id)?.name || 'Sin método';
    map.set(name, (map.get(name) || 0) + t.total);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}
