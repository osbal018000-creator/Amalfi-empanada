import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useData, orderWithDetails } from '@/lib/data';
import type { Customer, OrderItem, Payment, CartItem, OrderStatus, PaymentMethod } from '@/lib/types';
import { formatCOP, formatDateTime } from '@/lib/format';
import { computeOrderTotals, orderBalance, orderPaid } from '@/lib/calc';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { SearchInput, EmptyState, StatPill } from '@/components/ui/misc';
import { CustomerPicker } from '@/components/CustomerPicker';
import { QuickCustomerCreate } from '@/components/QuickCustomerCreate';
import { ClipboardList, Plus, Search, Eye, X, Package, ClipboardCheck, CheckCircle2, Wallet, Trash2 } from 'lucide-react';

interface Props {
  showToast: (m: string, t?: 'success' | 'error') => void;
  onViewOrder?: ((id: string) => void) | null;
}

export function Orders({ showToast, onViewOrder }: Props) {
  const d = useData();
  const { orders, orderItems, payments, customers } = d;
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [viewing, setViewing] = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (query.trim()) {
      const cust = customers.find((c) => c.id === o.customer_id);
      const q = query.toLowerCase();
      if (!(`#${o.number}`.includes(q) || cust?.name.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  function handleView(id: string) {
    if (onViewOrder) onViewOrder(id);
    else setViewing(id);
  }

  const viewingOrder = viewing ? orderWithDetails(viewing, d) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar por # o cliente…" className="flex-1" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)} className="sm:w-44">
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Entregados</option>
            <option value="cancelado">Cancelados</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ClipboardList size={26} />}
            title={orders.length === 0 ? 'Aún no hay pedidos' : 'Sin resultados'}
            description={orders.length === 0 ? 'Crea tu primer pedido usando el botón «Nuevo pedido» en la parte superior.' : undefined}
          />
        </div>
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => {
            const items = orderItems.filter((i) => i.order_id === o.id);
            const pays = payments.filter((p) => p.order_id === o.id);
            const totals = computeOrderTotals(items, Number(o.discount));
            const paid = orderPaid(pays);
            const balance = orderBalance(totals.total, pays);
            const cust = customers.find((c) => c.id === o.customer_id);
            return (
              <div key={o.id} className="card card-hover p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-charcoal-900">Pedido #{o.number}</p>
                    <p className="truncate text-sm text-charcoal-700/70">{cust?.name || 'Sin cliente'}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-cream-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-charcoal-700/50">Entrega</p>
                    <p className="font-semibold text-charcoal-900">{o.delivery_at ? formatDateTime(o.delivery_at) : 'Sin fecha'}</p>
                  </div>
                  <div className="rounded-lg bg-cream-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-charcoal-700/50">Items</p>
                    <p className="font-semibold text-charcoal-900">{items.length} producto(s)</p>
                  </div>
                  <div className="rounded-lg bg-cream-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-charcoal-700/50">Total</p>
                    <p className="font-bold text-charcoal-900">{formatCOP(totals.total)}</p>
                  </div>
                  <div className={`rounded-lg px-3 py-2 ${balance > 0 && o.status !== 'cancelado' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    <p className={`text-[11px] font-semibold uppercase ${balance > 0 && o.status !== 'cancelado' ? 'text-amber-700/60' : 'text-emerald-700/60'}`}>Saldo</p>
                    <p className={`font-bold ${balance > 0 && o.status !== 'cancelado' ? 'text-amber-700' : 'text-emerald-700'}`}>{formatCOP(o.status === 'cancelado' ? 0 : balance)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 border-t border-cream-200 pt-3">
                  <Button size="sm" variant="ghost" leftIcon={<Eye size={14} />} onClick={() => handleView(o.id)}>Detalle</Button>
                  {o.status === 'pendiente' && (
                    <span className="ml-auto text-xs font-semibold text-amber-600">
                      Pagado: {formatCOP(paid)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          paymentMethods={d.paymentMethods}
          onClose={() => setViewing(null)}
          onPay={() => { /* noop - handled at app level when viewing from orders */ }}
          onCancel={() => setViewing(null)}
          onComplete={() => setViewing(null)}
          onStatusChange={() => {}}
          onDelete={() => setViewing(null)}
        />
      )}
    </div>
  );
}

export function OrderForm({ onClose, onSaved, showToast, prefillCustomer, prefillDate }: { onClose: () => void; onSaved: () => void; showToast: (m: string, t?: 'success' | 'error') => void; prefillCustomer: Customer | null; prefillDate: string | null }) {
  const { products, customers, paymentMethods } = useData();
  const activeProducts = products.filter((p) => p.is_active);
  const [customer, setCustomer] = useState<Customer | null>(prefillCustomer);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [deliveryAt, setDeliveryAt] = useState(prefillDate ? prefillDate.slice(0, 16) : '');
  const [notes, setNotes] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [quickInitial, setQuickInitial] = useState<{ name: string; phone: string }>({ name: '', phone: '' });

  const totals = computeOrderTotals(
    cart.map((c) => ({ quantity: c.quantity, unit_price: c.unit_price, unit_cost: c.unit_cost })),
    parseFloat(discount) || 0,
  );
  const initialPayment = parseFloat(paymentAmount) || 0;

  function addToCart(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setCart((prev) => {
      const ex = prev.find((c) => c.product_id === productId);
      if (ex) return prev.map((c) => c.product_id === productId ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: Number(p.unit_price), unit_cost: Number(p.unit_cost) }];
    });
  }
  function updateQty(productId: string, qty: number) {
    setCart((prev) => prev.map((c) => c.product_id === productId ? { ...c, quantity: Math.max(0, qty) } : c));
  }
  function removeItem(productId: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  }
  function updatePrice(productId: string, price: number) {
    setCart((prev) => prev.map((c) => c.product_id === productId ? { ...c, unit_price: Math.max(0, price) } : c));
  }

  async function save() {
    setError('');
    const validCart = cart.filter((c) => c.quantity > 0);
    if (validCart.length === 0) { setError('Agrega al menos un producto con cantidad mayor a cero'); return; }
    if (parseFloat(discount) > totals.subtotal) { setError('El descuento no puede superar el subtotal'); return; }
    const initialPayment = parseFloat(paymentAmount) || 0;
    if (initialPayment < 0 || initialPayment > totals.total) { setError('El abono debe estar entre cero y el total del pedido'); return; }
    setSaving(true);
    const delivery = deliveryAt ? new Date(deliveryAt).toISOString() : null;
    const { data: order, error: e } = await supabase
      .from('orders')
      .insert({
        customer_id: customer?.id || null,
        delivery_at: delivery,
        discount: parseFloat(discount) || 0,
        notes: notes.trim() || null,
        status: 'pendiente',
      })
      .select('*')
      .single();
    if (e || !order) { setError('No se pudo crear el pedido'); setSaving(false); return; }
    const items = validCart.map((c) => ({
      order_id: order.id,
      product_id: c.product_id,
      product_name: c.product_name,
      quantity: c.quantity,
      unit_price: c.unit_price,
      unit_cost: c.unit_cost,
    }));
    const { error: ie } = await supabase.from('order_items').insert(items);
    if (ie) { setError('No se guardaron los detalles'); setSaving(false); return; }
    if (initialPayment > 0) {
      const { error: pe } = await supabase.from('payments').insert({
        order_id: order.id,
        amount: initialPayment,
        method_id: paymentMethodId || null,
        paid_at: new Date().toISOString(),
      });
      if (pe) { setError('El pedido se creó, pero no se pudo registrar el abono'); setSaving(false); return; }
    }
    setSaving(false);
    showToast(`Pedido #${order.number} creado`);
    onSaved();
  }

  const filteredProducts = productQuery.trim()
    ? activeProducts.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase()))
    : activeProducts;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Nuevo pedido"
        subtitle="Registra una solicitud. Podrás registrar abonos y completarla luego."
        size="xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-charcoal-700/70">Total: </span>
              <span className="font-display text-xl font-extrabold text-terracota-600">{formatCOP(totals.total)}</span>
              {initialPayment > 0 && <span className="ml-3 text-xs font-semibold text-emerald-700">Saldo {formatCOP(Math.max(0, totals.total - initialPayment))}</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={save} loading={saving} leftIcon={<ClipboardCheck size={16} />}>Crear pedido</Button>
            </div>
          </div>
        }
      >
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</div>}
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-700/40" />
              <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Buscar producto…" className="input-base pl-9" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredProducts.map((p) => (
                <button key={p.id} onClick={() => addToCart(p.id)} className="flex items-center justify-between rounded-lg border border-cream-200 bg-white px-3.5 py-2.5 text-left transition hover:border-terracota-200 hover:bg-terracota-50/40">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-charcoal-900">{p.name}</p><p className="text-xs text-charcoal-700/60">{formatCOP(p.unit_price)}</p></div>
                  <Plus size={16} className="shrink-0 text-terracota-500" />
                </button>
              ))}
              {filteredProducts.length === 0 && <p className="text-sm text-charcoal-700/50 py-4">Sin productos</p>}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-3">
            <Field label="Cliente">
              <CustomerPicker customers={customers} selected={customer} onSelect={setCustomer} onCreateNew={() => { setQuickInitial({ name: '', phone: '' }); setShowQuick(true); }} allowNone={false} />
            </Field>
            <Field label="Fecha y hora de entrega" hint="Cuándo se debe entregar el pedido">
              <Input type="datetime-local" value={deliveryAt} onChange={(e) => setDeliveryAt(e.target.value)} />
            </Field>
            <div className="rounded-xl border border-cream-200 bg-cream-50/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-700/60">Productos</p>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center"><Package size={22} className="text-charcoal-700/30" /><p className="mt-2 text-sm text-charcoal-700/50">Agrega productos</p></div>
              ) : (
                <div className="space-y-2">
                  {cart.map((c) => (
                    <div key={c.product_id} className="rounded-lg border border-cream-200 bg-white p-2.5">
                      <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-charcoal-900 leading-tight">{c.product_name}</p><button onClick={() => removeItem(c.product_id)} className="text-charcoal-700/40 hover:text-red-500"><X size={14} /></button></div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-cream-200">
                          <button onClick={() => updateQty(c.product_id, c.quantity - 1)} className="px-2 py-1 text-charcoal-700/60 hover:text-terracota-500">−</button>
                          <input type="number" min="0" value={c.quantity || ''} onChange={(e) => updateQty(c.product_id, e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)} className="w-14 border-x border-cream-200 py-1 text-center text-sm outline-none" />
                          <button onClick={() => updateQty(c.product_id, c.quantity + 1)} className="px-2 py-1 text-charcoal-700/60 hover:text-terracota-500">+</button>
                        </div>
                        <span className="text-xs text-charcoal-700/60">×</span>
                        <input type="number" min="0" value={c.unit_price} onChange={(e) => updatePrice(c.product_id, parseFloat(e.target.value) || 0)} className="w-20 rounded-lg border border-cream-200 px-2 py-1 text-sm outline-none focus:border-terracota-300" />
                        <span className="ml-auto text-sm font-bold text-charcoal-900">{formatCOP(c.quantity * c.unit_price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Descuento"><Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></Field>
              <Field label="Abono inicial" hint="Opcional"><Input type="number" min="0" max={totals.total} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" /></Field>
            </div>
            {paymentAmount && Number(paymentAmount) > 0 && (
              <Field label="Método del abono">
                <Select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                  {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
            )}
            <div className="rounded-xl bg-cream-50 p-3 text-sm">
              <div className="flex justify-between text-charcoal-700/70"><span>Subtotal</span><span>{formatCOP(totals.subtotal)}</span></div>
              <div className="flex justify-between text-charcoal-700/70"><span>Descuento</span><span>−{formatCOP(totals.discount)}</span></div>
              <div className="mt-1 flex justify-between border-t border-cream-200 pt-1 font-bold text-charcoal-900"><span>Total</span><span>{formatCOP(totals.total)}</span></div>
              <div className="mt-1 flex justify-between text-emerald-700"><span>Abono inicial</span><span>−{formatCOP(initialPayment)}</span></div>
              <div className="mt-1 flex justify-between border-t border-cream-200 pt-1 font-bold text-terracota-600"><span>Saldo pendiente</span><span>{formatCOP(Math.max(0, totals.total - initialPayment))}</span></div>
            </div>
            <Field label="Observaciones"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas" className="min-h-[60px]" /></Field>
          </div>
        </div>
      </Modal>
      {showQuick && <QuickCustomerCreate open={showQuick} onClose={() => setShowQuick(false)} onCreated={(c) => setCustomer(c)} initialName={quickInitial.name} initialPhone={quickInitial.phone} />}
    </>
  );
}

export function OrderDetailModal({ order, paymentMethods, onClose, onPay, onCancel, onComplete, onStatusChange, onDelete }: {
  order: { id: string; number: number; created_at: string; delivery_at: string | null; status: OrderStatus; discount: number; notes: string | null; sale_id: string | null; customer?: Customer | null; items: OrderItem[]; payments: Payment[] };
  paymentMethods: PaymentMethod[];
  onClose: () => void; onPay: () => void; onCancel: () => void; onComplete: () => void; onStatusChange: (s: OrderStatus) => void; onDelete: () => void;
}) {
  const totals = computeOrderTotals(order.items, Number(order.discount));
  const paid = orderPaid(order.payments);
  const balance = orderBalance(totals.total, order.payments);
  const isPendiente = order.status === 'pendiente';
  return (
    <Modal
      open
      onClose={onClose}
      title={`Pedido #${order.number}`}
      subtitle={order.delivery_at ? `Entrega: ${formatDateTime(order.delivery_at)}` : 'Sin fecha de entrega'}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {order.sale_id && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={12} />Venta registrada</span>}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select value={order.status} onChange={(e) => onStatusChange(e.target.value as OrderStatus)} className="w-36 text-xs">
              <option value="pendiente">Pendiente</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </Select>
            {isPendiente && balance > 0 && <Button variant="subtle" size="sm" leftIcon={<Wallet size={14} />} onClick={onPay}>Registrar abono</Button>}
            <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={onDelete}>Eliminar</Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Total" value={formatCOP(totals.total)} />
          <StatPill label="Pagado" value={formatCOP(paid)} tone="green" />
          <StatPill label="Saldo" value={formatCOP(order.status === 'cancelado' ? 0 : balance)} tone={balance > 0 && order.status !== 'cancelado' ? 'amber' : 'green'} />
          <StatPill label="Items" value={String(order.items.length)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-cream-50 px-3 py-2.5"><p className="text-[11px] font-semibold uppercase text-charcoal-700/50">Cliente</p><p className="text-sm font-semibold text-charcoal-900">{order.customer?.name || 'Sin cliente'}</p></div>
          <div className="rounded-lg bg-cream-50 px-3 py-2.5"><p className="text-[11px] font-semibold uppercase text-charcoal-700/50">Creado</p><p className="text-sm font-semibold text-charcoal-900">{formatDateTime(order.created_at)}</p></div>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-left text-xs font-semibold uppercase text-charcoal-700/60"><tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-center">Cant.</th><th className="px-3 py-2 text-right">Precio</th><th className="px-3 py-2 text-right">Subtotal</th></tr></thead>
            <tbody className="divide-y divide-cream-200">
              {order.items.map((it) => (<tr key={it.id}><td className="px-3 py-2 font-medium text-charcoal-900">{it.product_name}</td><td className="px-3 py-2 text-center">{it.quantity}</td><td className="px-3 py-2 text-right">{formatCOP(it.unit_price)}</td><td className="px-3 py-2 text-right font-semibold">{formatCOP(Number(it.quantity) * Number(it.unit_price))}</td></tr>))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-700/60">Abonos registrados</p>
          {order.payments.length === 0 ? <p className="text-sm text-charcoal-700/50">Sin abonos registrados</p> : (
            <div className="space-y-1.5">
              {order.payments.map((p) => {
                const pm = paymentMethods.find((m) => m.id === p.method_id);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-cream-200 px-3 py-2 text-sm">
                    <div><p className="font-semibold text-charcoal-900">{formatCOP(p.amount)}</p><p className="text-xs text-charcoal-700/60">{formatDateTime(p.paid_at)} · {pm?.name || '—'}</p></div>
                    {p.notes && <span className="text-xs text-charcoal-700/50">{p.notes}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {order.notes && <div className="rounded-lg bg-cream-50 px-3 py-2.5 text-sm text-charcoal-700/80"><strong>Observaciones:</strong> {order.notes}</div>}
      </div>
    </Modal>
  );
}

export function PaymentModal({ orderId, onClose, onSaved, showToast }: { orderId: string; onClose: () => void; onSaved: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const d = useData();
  const order = orderWithDetails(orderId, d);
  const { paymentMethods } = d;
  const totals = order ? computeOrderTotals(order.items, Number(order.discount)) : null;
  const balance = order && totals ? orderBalance(totals.total, order.payments) : 0;
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { setError('El monto debe ser mayor a cero'); return; }
    if (amt > balance) { setError(`El abono no puede superar el saldo pendiente (${formatCOP(balance)})`); return; }
    setSaving(true);
    const { error: e } = await supabase.from('payments').insert({
      order_id: orderId,
      amount: amt,
      method_id: methodId || null,
      paid_at: new Date(paidAt).toISOString(),
      notes: notes.trim() || null,
    });
    if (e) { setError('No se pudo registrar el abono'); setSaving(false); return; }
    setSaving(false);
    showToast('Abono registrado');
    onSaved();
  }

  if (!order) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar abono"
      subtitle={`Pedido #${order.number} · Saldo pendiente: ${formatCOP(balance)}`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving} leftIcon={<Wallet size={16} />}>Registrar abono</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</div>}
        <Field label="Monto del abono" required hint={`Saldo pendiente: ${formatCOP(balance)}`}>
          <Input type="number" min="0" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Método de pago"><Select value={methodId} onChange={(e) => setMethodId(e.target.value)}>{paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
          <Field label="Fecha"><Input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></Field>
        </div>
        <Field label="Observaciones"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" className="min-h-[60px]" /></Field>
      </div>
    </Modal>
  );
}
