import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useData, saleWithDetails } from '@/lib/data';
import type { Customer, SaleItem, CartItem } from '@/lib/types';
import { formatCOP, formatPercent, formatDateTime, formatDate } from '@/lib/format';
import { computeSaleTotals } from '@/lib/calc';
import { Button } from '@/components/ui/Button';
import { Modal, Confirm } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Badge } from '@/components/ui/Badge';
import { SearchInput, EmptyState, StatPill } from '@/components/ui/misc';
import { CustomerPicker } from '@/components/CustomerPicker';
import { QuickCustomerCreate } from '@/components/QuickCustomerCreate';
import { ProductImage } from '@/components/ProductImage';
import { ShoppingCart, Plus, Search, Eye, Ban, Package, X, Receipt, Trash2 } from 'lucide-react';

interface Props {
  showToast: (m: string, t?: 'success' | 'error') => void;
  onViewSale?: ((id: string) => void) | null;
}

export function Sales({ showToast }: Props) {
  const d = useData();
  const { sales, saleItems, customers, paymentMethods, refreshSales } = d;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'voided'>('active');
  const [viewing, setViewing] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = sales.filter((s) => {
    if (filter === 'active' && s.is_voided) return false;
    if (filter === 'voided' && !s.is_voided) return false;
    if (query.trim()) {
      const cust = customers.find((c) => c.id === s.customer_id);
      const q = query.toLowerCase();
      if (!(`#${s.number}`.includes(q) || (cust?.name.toLowerCase().includes(q)))) return false;
    }
    return true;
  });

  async function handleVoid() {
    if (!voiding) return;
    const { error } = await supabase.from('sales').update({ is_voided: true, voided_at: new Date().toISOString() }).eq('id', voiding);
    if (error) { showToast('No se pudo anular la venta', 'error'); return; }
    await refreshSales();
    showToast('Venta anulada');
    setVoiding(null);
    setViewing(null);
  }

  async function handleDelete() {
    if (!deleting) return;
    const sale = sales.find((s) => s.id === deleting);
    if (!sale) return;
    if (sale.order_id) {
      const { error: oe } = await supabase.from('orders').update({ sale_id: null }).eq('id', sale.order_id);
      if (oe) { showToast('No se pudo eliminar la venta', 'error'); return; }
    }
    const { error } = await supabase.from('sales').delete().eq('id', deleting);
    if (error) { showToast('No se pudo eliminar la venta', 'error'); return; }
    await refreshSales();
    showToast('Venta eliminada');
    setDeleting(null);
    setViewing(null);
  }

  const viewingSale = viewing ? saleWithDetails(viewing, d) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar por # o cliente…" className="flex-1" />
          <Select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'voided')} className="sm:w-40">
            <option value="active">Vigentes</option>
            <option value="voided">Anuladas</option>
            <option value="all">Todas</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ShoppingCart size={26} />}
            title={sales.length === 0 ? 'Aún no hay ventas' : 'Sin resultados'}
            description={sales.length === 0 ? 'Registra tu primera venta usando el botón «Registrar venta» en la parte superior.' : undefined}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-700/60">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="hidden px-4 py-3 md:table-cell">Pago</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="hidden px-4 py-3 text-right lg:table-cell">Utilidad</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {filtered.map((s) => {
                  const items = saleItems.filter((i) => i.sale_id === s.id);
                  const totals = computeSaleTotals(items, Number(s.discount));
                  const cust = customers.find((c) => c.id === s.customer_id);
                  const pm = paymentMethods.find((m) => m.id === s.method_id);
                  return (
                    <tr key={s.id} className={`transition-colors duration-200 hover:bg-terracota-50/40 ${s.is_voided ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-bold text-charcoal-900">#{s.number}</td>
                      <td className="px-4 py-3 text-charcoal-700/80">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-charcoal-800">{cust?.name || 'Sin cliente'}</td>
                      <td className="hidden px-4 py-3 text-charcoal-700/80 md:table-cell">{pm?.name || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-charcoal-900">{formatCOP(totals.total)}</td>
                      <td className="hidden px-4 py-3 text-right text-charcoal-700/80 lg:table-cell">{formatCOP(totals.grossProfit)}</td>
                      <td className="px-4 py-3 text-center">{s.is_voided ? <Badge tone="red">Anulada</Badge> : <Badge tone="green">Vigente</Badge>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewing(s.id)} className="btn-press rounded-lg p-1.5 text-charcoal-700/60 transition-all hover:bg-cream-100 hover:text-terracota-500" title="Ver detalle">
                            <Eye size={15} />
                          </button>
                          {!s.is_voided && (
                            <button onClick={() => setVoiding(s.id)} className="btn-press rounded-lg p-1.5 text-charcoal-700/40 transition-all hover:bg-red-50 hover:text-red-500" title="Anular">
                              <Ban size={15} />
                            </button>
                          )}
                          <button onClick={() => setDeleting(s.id)} className="btn-press rounded-lg p-1.5 text-charcoal-700/40 transition-all hover:bg-red-50 hover:text-red-500" title="Eliminar">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingSale && (
        <SaleDetailModal sale={viewingSale} onClose={() => setViewing(null)} onVoid={() => setVoiding(viewingSale.id)} onDelete={() => setDeleting(viewingSale.id)} />
      )}

      <Confirm
        open={!!deleting}
        title="Eliminar venta"
        message="Esta acción eliminará la venta y sus productos registrados de forma permanente. ¿Deseas continuar?"
        confirmLabel="Eliminar venta"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      <Confirm
        open={!!voiding}
        title="Anular venta"
        message="La venta se marcará como anulada conservando el historial. No sumará a ingresos ni costos. ¿Deseas continuar?"
        confirmLabel="Anular venta"
        onConfirm={handleVoid}
        onCancel={() => setVoiding(null)}
      />
    </div>
  );
}

export function SaleForm({ onClose, onSaved, showToast, prefillCustomer }: { onClose: () => void; onSaved: () => void; showToast: (m: string, t?: 'success' | 'error') => void; prefillCustomer: Customer | null }) {
  const { products, customers, paymentMethods } = useData();
  const activeProducts = products.filter((p) => p.is_active);
  const [customer, setCustomer] = useState<Customer | null>(prefillCustomer);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [methodId, setMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [quickInitial, setQuickInitial] = useState<{ name: string; phone: string }>({ name: '', phone: '' });

  const totals = computeSaleTotals(
    cart.map((c) => ({ quantity: c.quantity, unit_price: c.unit_price, unit_cost: c.unit_cost })),
    parseFloat(discount) || 0,
  );

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

  const filteredProducts = productQuery.trim()
    ? activeProducts.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase()))
    : activeProducts;

  async function save() {
    setError('');
    const validCart = cart.filter((c) => c.quantity > 0);
    if (validCart.length === 0) { setError('Agrega al menos un producto con cantidad mayor a cero'); return; }
    if (parseFloat(discount) > totals.subtotal) { setError('El descuento no puede superar el subtotal'); return; }
    setSaving(true);
    const { data: sale, error: e } = await supabase
      .from('sales')
      .insert({
        customer_id: customer?.id || null,
        method_id: methodId || null,
        discount: parseFloat(discount) || 0,
        notes: notes.trim() || null,
      })
      .select('*')
      .single();
    if (e || !sale) { setError('No se pudo registrar la venta'); setSaving(false); return; }
    const items = validCart.map((c) => ({
      sale_id: sale.id,
      product_id: c.product_id,
      product_name: c.product_name,
      quantity: c.quantity,
      unit_price: c.unit_price,
      unit_cost: c.unit_cost,
    }));
    const { error: ie } = await supabase.from('sale_items').insert(items);
    if (ie) { setError('No se guardaron los detalles'); setSaving(false); return; }
    setSaving(false);
    showToast(`Venta #${sale.number} registrada`);
    onSaved();
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Registrar venta"
        subtitle="Selecciona productos, cantidades y método de pago"
        size="xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-charcoal-700/70">Total: </span>
              <span className="font-display text-xl font-extrabold text-terracota-600">{formatCOP(totals.total)}</span>
              <span className="ml-3 text-xs text-charcoal-700/60">Utilidad {formatCOP(totals.grossProfit)} · Margen {formatPercent(totals.grossMargin)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={save} loading={saving} leftIcon={<Receipt size={16} />}>Confirmar venta</Button>
            </div>
          </div>
        }
      >
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</div>}
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-700/40" />
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Buscar producto para agregar…"
                className="input-base pl-9"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p.id)}
                  aria-label={`Agregar ${p.name}`}
                  className="group overflow-hidden rounded-xl border border-cream-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-terracota-300 hover:shadow-card"
                >
                  <ProductImage src={p.image_url} alt={p.name} className="h-28 w-full transition duration-300 group-hover:scale-[1.02]" iconSize={26} />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-charcoal-900">{p.name}</p><p className="mt-0.5 text-sm font-bold text-terracota-600">{formatCOP(p.unit_price)}</p></div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracota-50 text-terracota-500 transition group-hover:bg-terracota-500 group-hover:text-white"><Plus size={17} /></span>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && <p className="text-sm text-charcoal-700/50 py-4">Sin productos</p>}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <Field label="Cliente">
              <CustomerPicker
                customers={customers}
                selected={customer}
                onSelect={setCustomer}
                onCreateNew={() => { setQuickInitial({ name: '', phone: '' }); setShowQuick(true); }}
              />
            </Field>

            <div className="rounded-xl border border-cream-200 bg-cream-50/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-700/60">Productos</p>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Package size={22} className="text-charcoal-700/30" />
                  <p className="mt-2 text-sm text-charcoal-700/50">Agrega productos a la venta</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((c) => (
                    <div key={c.product_id} className="rounded-lg border border-cream-200 bg-white p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2"><ProductImage src={products.find((p) => p.id === c.product_id)?.image_url} alt={c.product_name} className="h-10 w-10 shrink-0 rounded-lg" iconSize={15} /><p className="truncate text-sm font-semibold text-charcoal-900 leading-tight">{c.product_name}</p></div>
                        <button onClick={() => removeItem(c.product_id)} className="text-charcoal-700/40 hover:text-red-500"><X size={14} /></button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-cream-200">
                          <button onClick={() => updateQty(c.product_id, c.quantity - 1)} className="px-2 py-1 text-charcoal-700/60 hover:text-terracota-500">−</button>
                          <input
                            type="number"
                            min="0"
                            value={c.quantity || ''}
                            onChange={(e) => updateQty(c.product_id, e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                            className="w-14 border-x border-cream-200 py-1 text-center text-sm outline-none"
                          />
                          <button onClick={() => updateQty(c.product_id, c.quantity + 1)} className="px-2 py-1 text-charcoal-700/60 hover:text-terracota-500">+</button>
                        </div>
                        <span className="text-xs text-charcoal-700/60">×</span>
                        <input
                          type="number"
                          min="0"
                          value={c.unit_price}
                          onChange={(e) => updatePrice(c.product_id, parseFloat(e.target.value) || 0)}
                          className="w-20 rounded-lg border border-cream-200 px-2 py-1 text-sm outline-none focus:border-terracota-300"
                        />
                        <span className="ml-auto text-sm font-bold text-charcoal-900">{formatCOP(c.quantity * c.unit_price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Descuento">
                <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Método de pago">
                <Select value={methodId} onChange={(e) => setMethodId(e.target.value)}>
                  {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
            </div>

            <div className="rounded-xl bg-cream-50 p-3 text-sm">
              <div className="flex justify-between text-charcoal-700/70"><span>Subtotal</span><span>{formatCOP(totals.subtotal)}</span></div>
              <div className="flex justify-between text-charcoal-700/70"><span>Descuento</span><span>−{formatCOP(totals.discount)}</span></div>
              <div className="mt-1 flex justify-between border-t border-cream-200 pt-1 font-bold text-charcoal-900"><span>Total</span><span>{formatCOP(totals.total)}</span></div>
              <div className="mt-1 flex justify-between text-xs text-charcoal-700/60"><span>Costo</span><span>{formatCOP(totals.totalCost)}</span></div>
              <div className="flex justify-between text-xs font-semibold text-terracota-600"><span>Utilidad bruta</span><span>{formatCOP(totals.grossProfit)}</span></div>
            </div>

            <Field label="Observaciones">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas" className="min-h-[60px]" />
            </Field>
          </div>
        </div>
      </Modal>

      {showQuick && (
        <QuickCustomerCreate
          open={showQuick}
          onClose={() => setShowQuick(false)}
          onCreated={(c) => setCustomer(c)}
          initialName={quickInitial.name}
          initialPhone={quickInitial.phone}
        />
      )}
    </>
  );
}

function SaleDetailModal({ sale, onClose, onVoid, onDelete }: { sale: { id: string; number: number; created_at: string; customer?: Customer | null; payment_method?: { name: string } | null; items: SaleItem[]; discount: number; notes: string | null; is_voided: boolean; customer_id: string | null }; onClose: () => void; onVoid: () => void; onDelete: () => void }) {
  const totals = computeSaleTotals(sale.items, Number(sale.discount));
  return (
    <Modal
      open
      onClose={onClose}
      title={`Venta #${sale.number}`}
      subtitle={formatDateTime(sale.created_at)}
      size="lg"
      footer={
        <div className="flex justify-between">
          <div className="flex gap-2">
            {sale.is_voided ? <Badge tone="red">Anulada</Badge> : <Badge tone="green">Vigente</Badge>}
          </div>
          <div className="flex gap-2">
            {!sale.is_voided && <Button variant="danger" leftIcon={<Ban size={15} />} onClick={onVoid}>Anular venta</Button>}
            <Button variant="danger" leftIcon={<Trash2 size={15} />} onClick={onDelete}>Eliminar</Button>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Total" value={formatCOP(totals.total)} />
          <StatPill label="Costo" value={formatCOP(totals.totalCost)} />
          <StatPill label="Utilidad" value={formatCOP(totals.grossProfit)} tone="green" />
          <StatPill label="Margen" value={formatPercent(totals.grossMargin)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-cream-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase text-charcoal-700/50">Cliente</p>
            <p className="text-sm font-semibold text-charcoal-900">{sale.customer?.name || 'Sin cliente'}</p>
          </div>
          <div className="rounded-lg bg-cream-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase text-charcoal-700/50">Método de pago</p>
            <p className="text-sm font-semibold text-charcoal-900">{sale.payment_method?.name || '—'}</p>
          </div>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-left text-xs font-semibold uppercase text-charcoal-700/60">
              <tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-center">Cant.</th><th className="px-3 py-2 text-right">Precio</th><th className="px-3 py-2 text-right">Subtotal</th></tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {sale.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 font-medium text-charcoal-900">{it.product_name}</td>
                  <td className="px-3 py-2 text-center">{it.quantity}</td>
                  <td className="px-3 py-2 text-right">{formatCOP(it.unit_price)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatCOP(Number(it.quantity) * Number(it.unit_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sale.notes && <div className="rounded-lg bg-cream-50 px-3 py-2.5 text-sm text-charcoal-700/80"><strong>Observaciones:</strong> {sale.notes}</div>}
      </div>
    </Modal>
  );
}
