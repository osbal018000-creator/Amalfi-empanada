import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { authErrorMessage, useSession } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { KeyRound, LogOut, UserCircle2 } from 'lucide-react';

export function AccountCard({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const { session } = useSession();
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (pass1.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (pass1 !== pass2) { setError('Las contraseñas no coinciden.'); return; }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: pass1 });
    setSaving(false);
    if (err) { setError(authErrorMessage(err)); return; }
    setPass1('');
    setPass2('');
    showToast('Contraseña actualizada');
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-terracota-50 text-terracota-500"><UserCircle2 size={18} /></div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-charcoal-900">Mi cuenta</h2>
            <p className="truncate text-xs text-charcoal-700/60">{session?.user.email || '—'}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" leftIcon={<LogOut size={14} />} onClick={() => supabase.auth.signOut()}>Cerrar sesión</Button>
      </div>
      <form onSubmit={changePassword} className="space-y-3" noValidate>
        {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nueva contraseña" hint="Mínimo 6 caracteres">
            <Input type="password" autoComplete="new-password" value={pass1} onChange={(e) => setPass1(e.target.value)} />
          </Field>
          <Field label="Repetir contraseña">
            <Input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="subtle" loading={saving} leftIcon={<KeyRound size={15} />}>Cambiar contraseña</Button>
        </div>
      </form>
    </div>
  );
}
