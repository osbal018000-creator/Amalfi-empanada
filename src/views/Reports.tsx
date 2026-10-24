import { useState, useMemo } from 'react';
import { useData } from '@/lib/data';
import type { Sale, OrderStatus } from '@/lib/types';
import { formatCOP, formatPercent, formatDate, formatNumber, formatDateTime } from '@/lib/format';
import { computeSaleTotals, orderBalance } from '@/lib/calc';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Form';
import { Badge, ORDER_STATUS_OPTIONS } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/misc';
import { BarChart3, Download, TrendingUp, Wallet, Users, Package, ClipboardList, Receipt } from 'lucide-react';

type ReportKey = 'sales' | 'costs' | 'products' | 'customers' | 'payments' | 'pending' | 'receivable' | 'method';

const REPORTS: { key: ReportKey; label: string; icon: React.ReactNode }[] = [
  { key: 'sales', label: 'Ventas por fecha', icon: <Receipt size={16} /> },
  { key: 'costs', label: 'Costos y utilidad', icon: <TrendingUp size={16} /> },
  { key: 'products', label: 'Productos más vendidos', icon: <Package size={16} /> },
  { key: 'customers', label: 'Ventas por cliente', icon: <Users size={16} /> },
  { key: 'payments', label: 'Pagos recibidos', icon: <Wallet size={16} /> },
  { key: 'pending', label: 'Pedidos pendientes', icon: <ClipboardList size={16} /> },
  { key: 'receivable', label: 'Saldos por cobrar', icon: <Wallet size={16} /> },
  { key: 'method', label: 'Ventas por método de pago', icon: <BarChart3 size={16} /> },
];

export function Reports({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const d = useData();
  const { sales, saleItems, customers, paymentMethods, orders, orderItems, payments, products } = d;
  const [active, setActive] = useState<ReportKey>('sales');
  const [start, setStart] = useState(formatDateInput(addDays(new Date(), -30)));
  const [end, setEnd] = useState(formatDateInput(new Date()));
  const [productFilter, setProductFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const range = { start: new Date(start + 'T00:00:00'), end: new Date(end + 'T23:59:59') };
  const inRange = (d: string) => { const date = new Date(d); return date >= range.start && date <= range.end; };

  const activeSales = sales.filter((s) => !s.is_voided);

  function saleTotal(s: Sale) {
    return computeSaleTotals(saleItems.filter((i) => i.sale_id === s.id), Number(s.discount));
  }

  function exportCSV(rows: (string | number)[][], filename: string) {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Reporte exportado');
  }

  const report = useMemo(() => {
    let salesQ = activeSales.filter((s) => inRange(s.created_at));
    if (productFilter !== 'all') salesQ = salesQ.filter((s) => saleItems.some((i) => i.sale_id === s.id && i.product_id === productFilter));
    if (customerFilter !== 'all') salesQ = salesQ.filter((s) => s.customer_id === customerFilter);

    switch (active) {
      case 'sales': {
        const rows = salesQ.map((s) => {
          const t = saleTotal(s);
          const cust = customers.find((c) => c.id === s.customer_id);
          return { s, t, cust };
        });
        const total = rows.reduce((sum, r) => sum + r.t.total, 0);
        return { rows, total };
      }
      case 'costs': {
        const rows = salesQ.map((s) => {
          const t = saleTotal(s);
          const cust = customers.find((c) => c.id === s.customer_id);
          return { s, t, cust };
        });
        const total = rows.reduce((sum, r) => sum + r.t.total, 0);
        const totalCost = rows.reduce((sum, r) => sum + r.t.totalCost, 0);
        const totalProfit = rows.reduce((sum, r) => sum + r.t.grossProfit, 0);
        return { rows, total, totalCost, totalProfit };
      }
      case 'products': {
        const map = new Map<string, { name: string; units: number; revenue: number; cost: number; profit: number }>();
        salesQ.forEach((s) => {
          saleItems.filter((i) => i.sale_id === s.id).forEach((i) => {
            const ex = map.get(i.product_id) || { name: i.product_name, units: 0, revenue: 0, cost: 0, profit: 0 };
            ex.units += Number(i.quantity);
            ex.revenue += Number(i.quantity) * Number(i.unit_price);
            ex.cost += Number(i.quantity) * Number(i.unit_cost);
            ex.profit += Number(i.quantity) * (Number(i.unit_price) - Number(i.unit_cost));
            map.set(i.product_id, ex);
          });
        });
        return { rows: Array.from(map.values()).sort((a, b) => b.units - a.units) };
      }
      case 'customers': {
        const map = new Map<string, { name: string; sales: number; total: number; profit: number; orders: number; orderTotal: number }>();
        salesQ.forEach((s) => {
          const t = saleTotal(s);
          const name = customers.find((c) => c.id === s.customer_id)?.name || 'Sin cliente';
          const key = s.customer_id || 'none';
          const ex = map.get(key) || { name, sales: 0, total: 0, profit: 0, orders: 0, orderTotal: 0 };
          ex.sales += 1; ex.total += t.total; ex.profit += t.grossProfit;
          map.set(key, ex);
        });
        orders.filter((o) => o.status !== 'cancelado' && inRange(o.created_at)).forEach((o) => {
          const items = orderItems.filter((i) => i.order_id === o.id);
          const t = computeSaleTotals(items, Number(o.discount));
          const name = customers.find((c) => c.id === o.customer_id)?.name || 'Sin cliente';
          const key = o.customer_id || 'none';
          const ex = map.get(key) || { name, sales: 0, total: 0, profit: 0, orders: 0, orderTotal: 0 };
          ex.orders += 1; ex.orderTotal += t.total;
          map.set(key, ex);
        });
        return { rows: Array.from(map.values()).sort((a, b) => (b.total + b.orderTotal) - (a.total + a.orderTotal)) };
      }
      case 'payments': {
        const paysQ = payments.filter((p) => inRange(p.paid_at));
        const rows = paysQ.map((p) => {
          const o = orders.find((or) => or.id === p.order_id);
          const pm = paymentMethods.find((m) => m.id === p.method_id);
          const cust = customers.find((c) => c.id === o?.customer_id);
          return { p, o, pm, cust };
        });
        const total = rows.reduce((s, r) => s + Number(r.p.amount), 0);
        return { rows, total };
      }
      case 'pending': {
        let ords = orders.filter((o) => o.status !== 'cancelado' && o.status !== 'entregado');
        if (statusFilter !== 'all') ords = ords.filter((o) => o.status === statusFilter);
        const rows = ords.map((o) => {
          const items = orderItems.filter((i) => i.order_id === o.id);
          const t = computeSaleTotals(items, Number(o.discount));
          const pays = payments.filter((p) => p.order_id === o.id);
          const cust = customers.find((c) => c.id === o.customer_id);
          return { o, t, paid: pays.reduce((s, p) => s + Number(p.amount), 0), balance: orderBalance(t.total, pays), cust };
        });
        return { rows };
      }
      case 'receivable': {
        const ords = orders.filter((o) => o.status !== 'cancelado');
        const rows = ords.map((o) => {
          const items = orderItems.filter((i) => i.order_id === o.id);
          const t = computeSaleTotals(items, Number(o.discount));
          const pays = payments.filter((p) => p.order_id === o.id);
          const balance = orderBalance(t.total, pays);
          const cust = customers.find((c) => c.id === o.customer_id);
          return { o, t, balance, cust };
        }).filter((r) => r.balance > 0);
        const total = rows.reduce((s, r) => s + r.balance, 0);
        return { rows, total };
      }
      case 'method': {
        const map = new Map<string, { name: string; count: number; total: number }>();
        salesQ.forEach((s) => {
          const t = saleTotal(s);
          const name = paymentMethods.find((m) => m.id === s.method_id)?.name || 'Sin método';
          const ex = map.get(name) || { name, count: 0, total: 0 };
          ex.count += 1; ex.total += t.total;
          map.set(name, ex);
        });
        const total = Array.from(map.values()).reduce((s, r) => s + r.total, 0);
        return { rows: Array.from(map.values()).sort((a, b) => b.total - a.total), total };
      }
    }
  }, [active, sales, saleItems, customers, paymentMethods, orders, orderItems, payments, start, end, productFilter, customerFilter, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="card p-3 lg:col-span-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-charcoal-700/50">Reportes</p>
          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {REPORTS.map((r) => (
              <button key={r.key} onClick={() => setActive(r.key)} className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${active === r.key ? 'bg-terracota-500 text-white' : 'text-charcoal-700 hover:bg-cream-100'}`}>
                {r.icon}{r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="card p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div><label className="label-base">Desde</label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-auto" /></div>
              <div><label className="label-base">Hasta</label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-auto" /></div>
              {(active === 'sales' || active === 'costs' || active === 'products') && (
                <div><label className="label-base">Producto</label><Select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="w-auto min-w-[160px]"><option value="all">Todos</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
              )}
              {(active === 'sales' || active === 'costs' || active === 'customers') && (
                <div><label className="label-base">Cliente</label><Select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="w-auto min-w-[160px]"><option value="all">Todos</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
              )}
              {active === 'pending' && (
                <div><label className="label-base">Estado</label><Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-auto min-w-[140px]"><option value="all">Todos</option>{ORDER_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></div>
              )}
              <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={() => handleExport()} className="ml-auto">Exportar CSV</Button>
            </div>
          </div>

          <div className="card overflow-hidden">
            {renderReport()}
          </div>
        </div>
      </div>
    </div>
  );

  function handleExport() {
    const filename = `reporte_${active}_${start}_${end}.csv`;
    switch (active) {
      case 'sales':
        exportCSV([['#', 'Fecha', 'Cliente', 'Método', 'Subtotal', 'Descuento', 'Total'], ...((report as any).rows || []).map((r: any) => [r.s.number, formatDate(r.s.created_at), r.cust?.name || 'Sin cliente', paymentMethods.find((m) => m.id === r.s.method_id)?.name || '—', r.t.subtotal, r.t.discount, r.t.total])], filename);
        break;
      case 'costs':
        exportCSV([['#', 'Fecha', 'Cliente', 'Total', 'Costo', 'Utilidad', 'Margen %'], ...((report as any).rows || []).map((r: any) => [r.s.number, formatDate(r.s.created_at), r.cust?.name || 'Sin cliente', r.t.total, r.t.totalCost, r.t.grossProfit, r.t.grossMargin.toFixed(2)]), ['', '', '', (report as any).total || 0, (report as any).totalCost || 0, (report as any).totalProfit || 0, '']], filename);
        break;
      case 'products':
        exportCSV([['Producto', 'Unidades', 'Ingresos', 'Costo', 'Utilidad'], ...((report as any).rows || []).map((r: any) => [r.name, r.units, r.revenue, r.cost, r.profit])], filename);
        break;
      case 'customers':
        exportCSV([['Cliente', 'N° ventas', 'Total ventas', 'N° pedidos', 'Total pedidos'], ...((report as any).rows || []).map((r: any) => [r.name, r.sales, r.total, r.orders, r.orderTotal])], filename);
        break;
      case 'payments':
        exportCSV([['Fecha', 'Pedido', 'Cliente', 'Método', 'Monto', 'Notas'], ...((report as any).rows || []).map((r: any) => [formatDateTime(r.p.paid_at), r.o?.number || '', r.cust?.name || 'Sin cliente', r.pm?.name || '—', r.p.amount, r.p.notes || ''])], filename);
        break;
      case 'pending':
        exportCSV([['#', 'Cliente', 'Entrega', 'Estado', 'Total', 'Pagado', 'Saldo'], ...((report as any).rows || []).map((r: any) => [r.o.number, r.cust?.name || 'Sin cliente', r.o.delivery_at ? formatDateTime(r.o.delivery_at) : '—', r.o.status, r.t.total, r.paid, r.balance])], filename);
        break;
      case 'receivable':
        exportCSV([['#', 'Cliente', 'Entrega', 'Estado', 'Total', 'Saldo'], ...((report as any).rows || []).map((r: any) => [r.o.number, r.cust?.name || 'Sin cliente', r.o.delivery_at ? formatDateTime(r.o.delivery_at) : '—', r.o.status, r.t.total, r.balance])], filename);
        break;
      case 'method':
        exportCSV([['Método', 'N° ventas', 'Total'], ...((report as any).rows || []).map((r: any) => [r.name, r.count, r.total])], filename);
        break;
    }
  }

  function renderReport() {
    const r = report as any;
    if (!r) return null;
    if ((!r.rows || r.rows.length === 0)) {
      return <EmptyState icon={<BarChart3 size={24} />} title="Sin datos en este rango" description="Ajusta el rango de fechas o los filtros." />;
    }

    switch (active) {
      case 'sales':
        return (
          <>
            <Table headers={['#', 'Fecha', 'Cliente', 'Método', 'Total']} rows={r.rows.map((x: any) => [`#${x.s.number}`, formatDate(x.s.created_at), x.cust?.name || 'Sin cliente', paymentMethods.find((m) => m.id === x.s.method_id)?.name || '—', formatCOP(x.t.total)])} footers={['', '', '', 'Total', formatCOP(r.total)]} />
          </>
        );
      case 'costs':
        return <Table headers={['#', 'Fecha', 'Cliente', 'Total', 'Costo', 'Utilidad', 'Margen']} rows={r.rows.map((x: any) => [`#${x.s.number}`, formatDate(x.s.created_at), x.cust?.name || 'Sin cliente', formatCOP(x.t.total), formatCOP(x.t.totalCost), formatCOP(x.t.grossProfit), formatPercent(x.t.grossMargin)])} footers={['', '', 'Totales', formatCOP(r.total), formatCOP(r.totalCost), formatCOP(r.totalProfit), '']} />;
      case 'products':
        return <Table headers={['Producto', 'Unidades', 'Ingresos', 'Costo', 'Utilidad']} rows={r.rows.map((x: any) => [x.name, formatNumber(x.units), formatCOP(x.revenue), formatCOP(x.cost), formatCOP(x.profit)])} footers={['', '', '', '', '']} />;
      case 'customers':
        return <Table headers={['Cliente', 'N° ventas', 'Total ventas', 'N° pedidos', 'Total pedidos']} rows={r.rows.map((x: any) => [x.name, x.sales, formatCOP(x.total), x.orders, formatCOP(x.orderTotal)])} footers={['', '', '', '', '']} />;
      case 'payments':
        return <Table headers={['Fecha', 'Pedido', 'Cliente', 'Método', 'Monto']} rows={r.rows.map((x: any) => [formatDateTime(x.p.paid_at), x.o ? `#${x.o.number}` : '—', x.cust?.name || 'Sin cliente', x.pm?.name || '—', formatCOP(x.p.amount)])} footers={['', '', '', 'Total', formatCOP(r.total)]} />;
      case 'pending':
        return <Table headers={['#', 'Cliente', 'Entrega', 'Estado', 'Total', 'Pagado', 'Saldo']} rows={r.rows.map((x: any) => [`#${x.o.number}`, x.cust?.name || 'Sin cliente', x.o.delivery_at ? formatDateTime(x.o.delivery_at) : '—', <Badge tone="amber">{x.o.status}</Badge>, formatCOP(x.t.total), formatCOP(x.paid), formatCOP(x.balance)])} footers={[]} />;
      case 'receivable':
        return <Table headers={['#', 'Cliente', 'Entrega', 'Estado', 'Total', 'Saldo']} rows={r.rows.map((x: any) => [`#${x.o.number}`, x.cust?.name || 'Sin cliente', x.o.delivery_at ? formatDateTime(x.o.delivery_at) : '—', <Badge tone="amber">{x.o.status}</Badge>, formatCOP(x.t.total), formatCOP(x.balance)])} footers={['', '', '', '', 'Total', formatCOP(r.total)]} />;
      case 'method':
        return <Table headers={['Método', 'N° ventas', 'Total']} rows={r.rows.map((x: any) => [x.name, x.count, formatCOP(x.total)])} footers={['', 'Total', formatCOP(r.total)]} />;
    }
  }
}

function Table({ headers, rows, footers }: { headers: string[]; rows: (string | number | React.ReactNode)[][]; footers?: (string | number)[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-cream-50 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-700/60">
          <tr>{headers.map((h, i) => <th key={i} className={`px-4 py-3 ${i >= headers.length - 2 ? 'text-right' : ''}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-cream-200">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-cream-50/60">
              {row.map((cell, j) => <td key={j} className={`px-4 py-2.5 ${j >= row.length - 2 ? 'text-right font-semibold' : 'text-charcoal-700/80'}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
        {footers && footers.some((f) => f !== '' && f !== 0) && (
          <tfoot className="bg-cream-50 font-bold text-charcoal-900">
            <tr>{footers.map((f, i) => <td key={i} className={`px-4 py-3 ${i >= footers.length - 2 ? 'text-right' : ''}`}>{f}</td>)}</tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function formatDateInput(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
