import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useData } from '@/lib/data';
import type { Customer } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Modal, Confirm } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { SearchInput, EmptyState } from '@/components/ui/misc';
import { Users, Plus, Pencil, Trash2, Phone, Mail, MapPin, User } from 'lucide-react';

interface Props {
  showToast: (m: string, t?: 'success' | 'error') => void;
}

export function Customers({ showToast }: Props) {
  const { customers, refreshCustomers, orders, sales } = useData();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);

  const filtered = query.trim()
    ? customers.filter((c) => (c.name + ' ' + (c.phone || '') + ' ' + (c.email || '')).toLowerCase().includes(query.toLowerCase()))
    : customers;

  function statsFor(c: Customer) {
    const ords = orders.filter((o) => o.customer_id === c.id);
    const sls = sales.filter((s) => s.customer_id === c.id && !s.is_voided);
    return { orders: ords.length, sales: sls.length };
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase.from('customers').delete().eq('id', confirmDelete.id);
    if (error) {
      showToast('No se puede eliminar: tiene pedidos o ventas asociados', 'error');
    } else {
      await refreshCustomers();
      showToast('Cliente eliminado');
    }
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, teléfono o correo…" className="flex-1" />
        <Button leftIcon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true); }}>Nuevo cliente</Button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users size={26} />}
            title={customers.length === 0 ? 'Aún no hay clientes' : 'Sin resultados'}
            description={customers.length === 0 ? 'Agrega clientes o créalos directamente al registrar un pedido o venta.' : 'Prueba con otro término.'}
            action={customers.length === 0 ? <Button leftIcon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true); }}>Agregar cliente</Button> : undefined}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-700/60">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="hidden px-4 py-3 md:table-cell">Correo</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Registro</th>
                  <th className="px-4 py-3 text-center">Pedidos</th>
                  <th className="px-4 py-3 text-center">Ventas</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {filtered.map((c) => {
                  const st = statsFor(c);
                  return (
                    <tr key={c.id} className="hover:bg-cream-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracota-50 text-terracota-500">
                            <User size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-charcoal-900">{c.name}</p>
                            {c.address && <p className="truncate text-xs text-charcoal-700/60 flex items-center gap-1"><MapPin size={11} />{c.address}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-charcoal-700/80">
                        {c.phone ? <span className="flex items-center gap-1.5"><Phone size={13} className="text-charcoal-700/40" />{c.phone}</span> : '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-charcoal-700/80 md:table-cell">
                        {c.email ? <span className="flex items-center gap-1.5"><Mail size={13} className="text-charcoal-700/40" />{c.email}</span> : '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-charcoal-700/70 lg:table-cell">{formatDate(c.created_at)}</td>
                      <td className="px-4 py-3 text-center font-semibold text-charcoal-800">{st.orders}</td>
                      <td className="px-4 py-3 text-center font-semibold text-charcoal-800">{st.sales}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditing(c); setShowForm(true); }} className="rounded-lg p-1.5 text-charcoal-700/60 hover:bg-cream-100 hover:text-terracota-500" title="Editar">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setConfirmDelete(c)} className="rounded-lg p-1.5 text-charcoal-700/40 hover:bg-red-50 hover:text-red-500" title="Eliminar">
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

      {showForm && (
        <CustomerForm
          customer={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refreshCustomers(); }}
          showToast={showToast}
        />
      )}

      <Confirm
        open={!!confirmDelete}
        title="Eliminar cliente"
        message={`¿Eliminar a "${confirmDelete?.name}"? Los clientes con pedidos o ventas asociados no se pueden eliminar.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

export function CustomerForm({ customer, onClose, onSaved, showToast }: { customer: Customer | null; onClose: () => void; onSaved: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };
    if (customer) {
      const { error: e } = await supabase.from('customers').update(payload).eq('id', customer.id);
      if (e) { setError('No se pudo actualizar'); setSaving(false); return; }
      showToast('Cliente actualizado');
    } else {
      const { error: e } = await supabase.from('customers').insert(payload);
      if (e) { setError('No se pudo crear'); setSaving(false); return; }
      showToast('Cliente creado');
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? 'Editar cliente' : 'Nuevo cliente'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{customer ? 'Guardar cambios' : 'Crear cliente'}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre o nombre comercial" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cliente" autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" /></Field>
          <Field label="Correo electrónico"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@correo.com" type="email" /></Field>
        </div>
        <Field label="Dirección"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección" /></Field>
        <Field label="Observaciones"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas" /></Field>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
