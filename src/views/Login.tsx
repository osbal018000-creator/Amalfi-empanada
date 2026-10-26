import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { ClipboardCheck, Eye, EyeOff, LogIn } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) setError(authErrorMessage(err));
    // Si todo sale bien, useSession() detecta la sesión y la app se abre sola.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cream-50 via-white to-terracota-50 px-4 py-10">
      <div className="w-full max-w-sm animate-modal-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-terracota-400 to-terracota-600 text-white shadow-glow">
            <ClipboardCheck size={28} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-charcoal-900">Doña Empanada</h1>
          <p className="mt-1 text-sm text-charcoal-700/60">Inicia sesión para entrar a la gestión del negocio</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-5 shadow-lift" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
              {error}
            </div>
          )}
          <Field label="Correo">
            <Input
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              autoFocus
            />
          </Field>
          <Field label="Contraseña">
            <div className="relative">
              <Input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-charcoal-700/40 transition hover:text-charcoal-900"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={loading} leftIcon={<LogIn size={18} />}>
            Entrar
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-charcoal-700/45">
          ¿Olvidaste tu contraseña? Pídele a quien administra la app que la restablezca.
        </p>
      </div>
    </div>
  );
}
