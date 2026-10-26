/*
  # Exigir inicio de sesión para acceder a los datos

  Hasta ahora cualquiera con el enlace de la app podía leer y modificar todo.
  Este archivo cierra ese acceso: solo los usuarios con sesión iniciada
  (creados en Supabase → Authentication → Users) pueden leer o escribir.

  ORDEN IMPORTANTE (ver instrucciones):
    1. Crear al menos un usuario en Authentication → Users.
    2. Subir la nueva versión de la app (con pantalla de inicio de sesión).
    3. Comprobar que puedes entrar.
    4. Recién entonces ejecutar este archivo.
    5. Desactivar "Allow new users to sign up" en Authentication.

  Si algo sale mal y necesitas reabrir el acceso temporalmente, ejecuta:

    DO $$ DECLARE t text; BEGIN
      FOREACH t IN ARRAY ARRAY['payment_methods','products','product_price_history',
        'customers','orders','order_items','payments','sales','sale_items'] LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', t||'_anon_reopen', t);
      END LOOP; END $$;

  Es seguro ejecutar este archivo más de una vez.
*/

DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payment_methods', 'products', 'product_price_history', 'customers',
    'orders', 'order_items', 'payments', 'sales', 'sale_items'
  ]
  LOOP
    -- Quita todas las reglas anteriores (las que dejaban entrar a cualquiera)
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_authenticated_all', t
    );
  END LOOP;
END $$;
