import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Sesión actual de Supabase Auth (se actualiza sola al entrar/salir). */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    // Importante: este callback no debe hacer llamadas a Supabase (evita bloqueos).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

/** Traduce los errores de Supabase Auth a mensajes claros en español. */
export function authErrorMessage(err: { message?: string; status?: number; code?: string } | null): string {
  if (!err) return '';
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('email not confirmed')) return 'Este usuario aún no está confirmado. Actívalo desde el panel de Supabase.';
  if (err.status === 429 || msg.includes('rate limit') || msg.includes('too many')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  if (msg.includes('same password') || msg.includes('different from the old')) return 'La nueva contraseña debe ser distinta a la actual.';
  if (msg.includes('password should be at least') || msg.includes('weak')) return 'La contraseña es muy corta o débil (mínimo 6 caracteres).';
  return 'No se pudo completar la acción. Inténtalo de nuevo.';
}
