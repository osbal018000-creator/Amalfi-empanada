import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useData } from '@/lib/data';
import type { Product } from '@/lib/types';
import { formatCOP, formatPercent, formatDate, formatDateTime } from '@/lib/format';
import { grossMarginPercent, grossProfitPerUnit } from '@/lib/calc';
import { Button } from '@/components/ui/Button';
import { Modal, Confirm } from '@/components/ui/Modal';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { Badge } from '@/components/ui/Badge';
import { ProductImage } from '@/components/ProductImage';
import { SearchInput, EmptyState } from '@/components/ui/misc';
import { Package, Plus, Pencil, History, TrendingUp, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

interface Props {
  showToast: (m: string, t?: 'success' | 'error') => void;
}

export function Products({ showToast }: Props) {
  const { products, priceHistory, refreshProducts } = useData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [historyFor, setHistoryFor] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const filtered = products.filter((p) => {
    if (filter === 'active' && !p.is_active) return false;
    if (filter === 'inactive' && p.is_active) return false;
    if (query.trim() && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.category.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  async function toggleActive(p: Product) {
    const { error } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) { showToast('No se pudo actualizar el estado', 'error'); return; }
    await refreshProducts();
    showToast(p.is_active ? 'Producto desactivado' : 'Producto activado');
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase.from('products').delete().eq('id', confirmDelete.id);
    if (error) {
      showToast('No se puede eliminar: tiene ventas o pedidos asociados', 'error');
    } else {
      await refreshProducts();
      showToast('Producto eliminado');
    }
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar producto…" className="flex-1" />
          <Select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')} className="sm:w-44">
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </Select>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true); }}>
          Nuevo producto
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Package size={26} />}
            title={products.length === 0 ? 'Aún no hay productos' : 'Sin resultados'}
            description={products.length === 0 ? 'Agrega tu primera empanada para empezar a registrar ventas y calcular utilidades.' : 'Prueba con otro término de búsqueda.'}
            action={products.length === 0 ? <Button leftIcon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true); }}>Agregar producto</Button> : undefined}
          />
        </div>
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const margin = grossMarginPercent(Number(p.unit_price), Number(p.unit_cost));
            const profit = grossProfitPerUnit(Number(p.unit_price), Number(p.unit_cost));
            return (
              <div key={p.id} className="card card-hover flex flex-col p-4">
                <ProductImage src={p.image_url} alt={p.name} className="-mx-4 -mt-4 mb-4 h-36 rounded-t-xl" iconSize={30} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-charcoal-900">{p.name}</h3>
                    <p className="mt-0.5 text-xs text-charcoal-700/60">{p.category}</p>
                  </div>
                  <Badge tone={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                {p.description && <p className="mt-2 line-clamp-2 text-sm text-charcoal-700/70">{p.description}</p>}
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-cream-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-700/50">Precio</p>
                    <p className="font-bold text-charcoal-900">{formatCOP(p.unit_price)}</p>
                  </div>
                  <div className="rounded-lg bg-cream-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-700/50">Costo</p>
                    <p className="font-bold text-charcoal-900">{formatCOP(p.unit_cost)}</p>
                  </div>
                  <div className="rounded-lg bg-terracota-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-terracota-600/70">Utilidad</p>
                    <p className="font-bold text-terracota-600">{formatCOP(profit)}</p>
                  </div>
                  <div className="rounded-lg bg-terracota-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-terracota-600/70">Margen</p>
                    <p className="font-bold text-terracota-600">{formatPercent(margin)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 border-t border-cream-200 pt-3">
                  <Button size="sm" variant="ghost" leftIcon={<Pencil size={14} />} onClick={() => { setEditing(p); setShowForm(true); }}>Editar</Button>
                  <Button size="sm" variant="ghost" leftIcon={<History size={14} />} onClick={() => setHistoryFor(p)}>Historial</Button>
                  <button
                    onClick={() => toggleActive(p)}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-charcoal-700 hover:text-terracota-500"
                    title={p.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {p.is_active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-charcoal-700/40" />}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(p)}
                    className="rounded-lg p-1.5 text-charcoal-700/40 hover:bg-red-50 hover:text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refreshProducts(); }}
          showToast={showToast}
        />
      )}

      {historyFor && (
        <PriceHistoryModal product={historyFor} history={priceHistory.filter((h) => h.product_id === historyFor.id)} onClose={() => setHistoryFor(null)} />
      )}

      <Confirm
        open={!!confirmDelete}
        title="Eliminar producto"
        message={`¿Segura que deseas eliminar "${confirmDelete?.name}"? Esta acción no se puede deshacer. Los productos con ventas asociadas no se pueden eliminar.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ProductForm({ product, onClose, onSaved, showToast }: { product: Product | null; onClose: () => void; onSaved: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [category, setCategory] = useState(product?.category || 'Empanadas');
  const [unitPrice, setUnitPrice] = useState(String(product?.unit_price ?? ''));
  const [unitCost, setUnitCost] = useState(String(product?.unit_cost ?? ''));
  const [imageUrl, setImageUrl] = useState(product?.image_url || '');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const price = parseFloat(unitPrice) || 0;
  const cost = parseFloat(unitCost) || 0;
  const margin = grossMarginPercent(price, cost);
  const profit = grossProfitPerUnit(price, cost);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es obligatorio';
    if (price < 0) e.unitPrice = 'No puede ser negativo';
    if (cost < 0) e.unitCost = 'No puede ser negativo';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || 'Empanadas',
      unit_price: price,
      unit_cost: cost,
      image_url: imageUrl.trim() || null,
      is_active: isActive,
    };
    if (product) {
      const { error } = await supabase.from('products').update(payload).eq('id', product.id);
      if (error) { showToast('No se pudo actualizar', 'error'); setSaving(false); return; }
      // Record price change if price or cost changed
      if (Number(product.unit_price) !== price || Number(product.unit_cost) !== cost) {
        await supabase.from('product_price_history').insert({ product_id: product.id, unit_price: price, unit_cost: cost });
      }
      showToast('Producto actualizado');
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select('*').single();
      if (error || !data) { showToast('No se pudo crear', 'error'); setSaving(false); return; }
      await supabase.from('product_price_history').insert({ product_id: (data as Product).id, unit_price: price, unit_cost: cost });
      showToast('Producto creado');
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      subtitle="El costo unitario se usa para calcular utilidades en cada venta"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="hidden text-sm text-charcoal-700/70 sm:block">
            Utilidad: <strong className="text-terracota-600">{formatCOP(profit)}</strong> · Margen: <strong className="text-terracota-600">{formatPercent(margin)}</strong>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} loading={saving}>{product ? 'Guardar cambios' : 'Crear producto'}</Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nombre del producto" required error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Empanada italiana de carne" invalid={!!errors.name} />
          </Field>
        </div>
        <Field label="Categoría">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Empanadas" />
        </Field>
        <Field label="Imagen (URL, opcional)" hint="Pega el enlace directo a la imagen; verás una vista previa abajo">
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </Field>
        {imageUrl.trim() && (
          <div className="sm:col-span-2 overflow-hidden rounded-xl border border-cream-200 bg-cream-50">
            <ProductImage src={imageUrl.trim()} alt={name || 'Vista previa del producto'} className="h-40 w-full" iconSize={30} />
          </div>
        )}
        <Field label="Precio de venta por unidad" required error={errors.unitPrice}>
          <Input type="number" min="0" step="50" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="3500" invalid={!!errors.unitPrice} />
        </Field>
        <Field label="Costo por unidad" required error={errors.unitCost} hint="Cuánto cuesta producir la empanada">
          <Input type="number" min="0" step="50" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="2000" invalid={!!errors.unitCost} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descripción (opcional)">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del producto" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`h-5 w-5 rounded-full bg-white shadow transition ${isActive ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm font-semibold text-charcoal-800">{isActive ? 'Producto activo' : 'Producto inactivo'}</span>
          </label>
        </div>
        <div className="sm:col-span-2 rounded-xl bg-terracota-50 p-4 sm:hidden">
          <div className="flex items-center gap-2 text-terracota-600">
            <TrendingUp size={18} />
            <p className="text-sm font-semibold">Utilidad {formatCOP(profit)} · Margen {formatPercent(margin)}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PriceHistoryModal({ product, history, onClose }: { product: Product; history: { id: string; unit_price: number; unit_cost: number; changed_at: string }[]; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`Historial de cambios · ${product.name}`} subtitle="Cambios de precio y costo registrados" size="md">
      {history.length === 0 ? (
        <EmptyState icon={<History size={24} />} title="Sin cambios registrados" description="Los cambios de precio y costo aparecerán aquí." />
      ) : (
        <div className="space-y-2">
          {history.map((h, i) => {
            const prev = history[i + 1];
            const dPrice = prev ? Number(h.unit_price) - Number(prev.unit_price) : null;
            const dCost = prev ? Number(h.unit_cost) - Number(prev.unit_cost) : null;
            return (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-cream-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-charcoal-900">{formatDateTime(h.changed_at)}</p>
                  <p className="text-xs text-charcoal-700/60">
                    Precio {formatCOP(h.unit_price)} {dPrice !== null && dPrice !== 0 && <span className={dPrice > 0 ? 'text-emerald-600' : 'text-red-500'}> ({dPrice > 0 ? '+' : ''}{formatCOP(dPrice)})</span>}
                    {' · '} Costo {formatCOP(h.unit_cost)} {dCost !== null && dCost !== 0 && <span className={dCost > 0 ? 'text-red-500' : 'text-emerald-600'}> ({dCost > 0 ? '+' : ''}{formatCOP(dCost)})</span>}
                  </p>
                </div>
                <Badge tone="terracota">{formatPercent(grossMarginPercent(Number(h.unit_price), Number(h.unit_cost)))}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
