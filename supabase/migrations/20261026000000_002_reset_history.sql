/*
  # Reiniciar historial (pedidos y ventas) y su numeración

  Crea la función `reset_history()` que usa el botón
  "Borrar historial de movimientos" de Configuración.

  - Borra TODOS los pedidos, ventas, abonos y sus detalles.
  - Reinicia los contadores: el siguiente pedido y la siguiente venta serán #1.
  - Conserva productos, clientes y métodos de pago.

  Solo pueden ejecutarla usuarios con sesión iniciada.
  Es seguro ejecutar este archivo más de una vez.
*/

CREATE OR REPLACE FUNCTION public.reset_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE
    public.sale_items,
    public.payments,
    public.order_items,
    public.sales,
    public.orders
  RESTART IDENTITY;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_history() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_history() FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_history() TO authenticated;
