import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useData } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { Modal, Confirm } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Form';
import { Badge } from '@/components/ui/Badge';
import { NotificationSettingsCard } from '@/components/NotifyActions';
import { Settings as SettingsIcon, CreditCard, Plus, Pencil, Trash2, Store, Info, Database, Check, RotateCcw } from 'lucide-react';
import { formatCOP, formatDate } from '@/lib/format';

interface Props {
  showToast: (m: string, t?: 'success' | 'error') => void;
}

export function Settings({ showToast }: Props) {
  const { paymentMethods, products, customers, orders, sales, refresh } = useData();
  const [editing, setEditing] = useState<{ id: string | null; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function saveMethod() {
    if (!editing || !editing.name.trim()) return;
    if (editing.id) {
      const { error } = await supabase.from('payment_methods').update({ name: editing.name.trim() }).eq('id', editing.id);
      if (error) { showToast('No se pudo actualizar', 'error'); return; }
      showToast('Método actualizado');
    } else {
      const { error } = await supabase.from('payment_methods').insert({ name: editing.name.trim(), sort_order: paymentMethods.length + 1 });
      if (error) { showToast('No se pudo crear', 'error'); return; }
      showToast('Método creado');
    }
    setEditing(null);
    refresh();
  }

  async function deleteMethod() {
    if (!confirmDelete) return;
    const { error } = await supabase.from('payment_methods').delete().eq('id', confirmDelete);
    if (error) { showToast('No se puede eliminar: está en uso', 'error'); return; }
    showToast('Método eliminado');
    setConfirmDelete(null);
    refresh();
  }

  async function resetHistory() {
    if (resetting) return;
    setResetting(true);
    const operations = [
      supabase.from('sale_items').delete().not('id', 'is', null),
      supabase.from('payments').delete().not('id', 'is', null),
      supabase.from('order_items').delete().not('id', 'is', null),
    ];
    const results = await Promise.all(operations);
    if (results.some(({ error }) => error)) {
      showToast('No se pudo borrar todo el historial', 'error');
      setResetting(false);
      return;
    }
    const { error: salesError } = await supabase.from('sales').delete().not('id', 'is', null);
    const { error: ordersError } = await supabase.from('orders').delete().not('id', 'is', null);
    if (salesError || ordersError) {
      showToast('No se pudo borrar todo el historial', 'error');
      setResetting(false);
      return;
    }
    await refresh();
    setResetting(false);
    setResetOpen(false);
    showToast('Historial borrado. Productos y clientes se conservaron.');
  }

  const stats = [
    { label: 'Productos', value: products.length, icon: <Store size={16} /> },
    { label: 'Clientes', value: customers.length, icon: <Store size={16} /> },
    { label: 'Pedidos', value: orders.length, icon: <Store size={16} /> },
    { label: 'Ventas', value: sales.length, icon: <Store size={16} /> },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-terracota-50 text-terracota-500"><Store size={18} /></div>
          <div>
            <h2 className="font-display text-base font-bold text-charcoal-900">Información del negocio</h2>
            <p className="text-xs text-charcoal-700/60">Datos generales de tu empresa de empanadas</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-cream-50 p-3 text-center">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-terracota-400">{s.icon}</div>
              <p className="font-display text-xl font-extrabold text-charcoal-900">{s.value}</p>
              <p className="text-xs text-charcoal-700/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-terracota-50 text-terracota-500"><CreditCard size={18} /></div>
            <div>
              <h2 className="font-display text-base font-bold text-charcoal-900">Métodos de pago</h2>
              <p className="text-xs text-charcoal-700/60">Formas de pago disponibles al registrar ventas y abonos</p>
            </div>
          </div>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setEditing({ id: null, name: '' })}>Nuevo</Button>
        </div>
        <div className="space-y-2">
          {paymentMethods.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-cream-200 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold text-charcoal-900">{m.name}</span>
                <Badge tone="neutral">{m.is_active ? 'Activo' : 'Inactivo'}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing({ id: m.id, name: m.name })} className="rounded-lg p-1.5 text-charcoal-700/60 hover:bg-cream-100 hover:text-terracota-500"><Pencil size={14} /></button>
                <button onClick={() => setConfirmDelete(m.id)} className="rounded-lg p-1.5 text-charcoal-700/40 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {paymentMethods.length === 0 && <p className="py-4 text-center text-sm text-charcoal-700/50">Sin métodos de pago</p>}
        </div>
      </div>

      <NotificationSettingsCard showToast={showToast} />

      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><Info size={18} /></div>
          <div>
            <h2 className="font-display text-base font-bold text-charcoal-900">Acerca de la aplicación</h2>
            <p className="text-xs text-charcoal-700/60">Información del sistema</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-charcoal-700/80">
          <div className="flex justify-between border-b border-cream-200 py-2"><span>Versión</span><strong>1.0.0</strong></div>
          <div className="flex justify-between border-b border-cream-200 py-2"><span>Moneda</span><strong>Peso colombiano (COP)</strong></div>
          <div className="flex justify-between border-b border-cream-200 py-2"><span>Zona horaria</span><strong>America/Bogota</strong></div>
          <div className="flex justify-between border-b border-cream-200 py-2"><span>Idioma</span><strong>Español</strong></div>
          <div className="flex justify-between py-2"><span>Almacenamiento</span><strong className="flex items-center gap-1"><Database size={14} className="text-emerald-500" /> Base de datos Supabase</strong></div>
        </div>
      </div>

      <div className="card border-red-200 p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><RotateCcw size={18} /></div>
          <div>
            <h2 className="font-display text-base font-bold text-charcoal-900">Zona de pruebas</h2>
            <p className="text-xs text-charcoal-700/60">Borra ventas, pedidos, abonos y sus detalles para comenzar nuevos experimentos.</p>
          </div>
        </div>
        <Button variant="danger" leftIcon={<Trash2 size={15} />} onClick={() => setResetOpen(true)}>Borrar historial de movimientos</Button>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-base font-bold text-charcoal-900 mb-3">Funcionalidades futuras</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {['Control de inventario', 'Registro de producción diaria', 'Ingredientes y materias primas', 'Gastos operativos', 'Proveedores', 'Control de caja', 'Gestión de devoluciones', 'Usuarios con permisos'].map((f) => (
            <div key={f} className="flex items-center gap-2 rounded-lg bg-cream-50 px-3 py-2 text-sm text-charcoal-700/70">
              <Check size={14} className="text-charcoal-700/30" /> {f}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-charcoal-700/50">Estas funciones están preparadas para agregarse en el futuro sin reconstruir la aplicación.</p>
      </div>

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={editing.id ? 'Editar método de pago' : 'Nuevo método de pago'}
          size="sm"
          footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={saveMethod}>Guardar</Button></div>}
        >
          <Field label="Nombre" required><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ej: Tarjeta" autoFocus /></Field>
        </Modal>
      )}

      <Confirm
        open={resetOpen}
        title="Borrar todo el historial"
        message="Se eliminarán permanentemente todas las ventas, pedidos, abonos y detalles. Los productos, clientes y métodos de pago se conservarán. ¿Deseas continuar?"
        confirmLabel={resetting ? 'Borrando…' : 'Borrar historial'}
        onConfirm={resetHistory}
        onCancel={() => { if (!resetting) setResetOpen(false); }}
      />

      <Confirm
        open={!!confirmDelete}
        title="Eliminar método de pago"
        message="¿Segura que deseas eliminar este método de pago? No se puede eliminar si está en uso."
        confirmLabel="Eliminar"
        onConfirm={deleteMethod}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
