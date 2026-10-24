import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { useData } from '@/lib/data';
import { UserPlus, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
  initialName?: string;
  initialPhone?: string;
  existingWarning?: Customer | null;
}

export function QuickCustomerCreate({ open, onClose, onCreated, initialName = '', initialPhone = '', existingWarning = null }: Props) {
  const { refreshCustomers, customers } = useData();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [phoneWarning, setPhoneWarning] = useState<Customer | null>(existingWarning);

  async function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    // Check duplicate phone
    if (phone.trim()) {
      const match = customers.find((c) => c.phone && c.phone.trim() === phone.trim());
      if (match) {
        setPhoneWarning(match);
        return;
      }
    }
    setSaving(true);
    const { data, error: e } = await supabase
      .from('customers')
      .insert({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      })
      .select('*')
      .single();
    setSaving(false);
    if (e || !data) {
      setError('No se pudo guardar el cliente.');
      return;
    }
    await refreshCustomers();
    onCreated(data as Customer);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear nuevo cliente"
      subtitle="Se guardará y se seleccionará automáticamente"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving} leftIcon={<UserPlus size={16} />}>
            Guardar y seleccionar
          </Button>
        </div>
      }
    >
      {phoneWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">Posible cliente duplicado</p>
              <p className="mt-1 text-amber-700">
                Ya existe un cliente con ese teléfono: <strong>{phoneWarning.name}</strong>.
                ¿Deseas seleccionarlo en lugar de crear uno nuevo?
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    onCreated(phoneWarning);
                    onClose();
                  }}
                >
                  Seleccionar existente
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPhoneWarning(null)}
                >
                  Crear de todos modos
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Nombre" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cliente" autoFocus />
          </Field>
          <Field label="Teléfono" hint="Se usa para detectar clientes duplicados">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" />
          </Field>
          <Field label="Correo electrónico">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@correo.com" type="email" />
          </Field>
          <Field label="Dirección">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección de entrega" />
          </Field>
          <Field label="Observaciones">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas" />
          </Field>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
