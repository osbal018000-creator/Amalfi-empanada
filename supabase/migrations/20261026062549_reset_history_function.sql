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