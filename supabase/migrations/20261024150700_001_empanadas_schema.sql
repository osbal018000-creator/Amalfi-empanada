/*
# Empanadas business management schema (single-tenant, no auth)

1. Purpose
   Persistent storage for a small empanada business: products, customers, orders,
   sales, payments and reporting. Single-tenant: no sign-in, all data shared by
   the business owner. The browser talks to the DB via the anon key, so every
   policy targets `anon, authenticated`.

2. New Tables
   - payment_methods  : catálogo de métodos de pago (Efectivo, Transferencia, Otro)
   - products         : productos (empanadas) con precio y costo unitario
   - product_price_history : historial de cambios de precio/costo
   - customers        : clientes
   - orders           : pedidos (solicitudes, estado, abonos, saldo)
   - order_items      : detalle de productos solicitados en cada pedido
   - payments         : abonos / pagos registrados (sobre pedidos)
   - sales            : ventas efectivamente realizadas (anulables)
   - sale_items       : detalle de productos vendidos (con copia histórica de precio/costo)

3. Relationships
   - products 1:N product_price_history
   - products 1:N sale_items (copia histórica de precio/costo)
   - products 1:N order_items (precio acordado por pedido)
   - customers 1:N orders
   - customers 1:N sales (nullable: ventas de mostrador sin cliente)
   - orders 1:N order_items
   - orders 1:N payments
   - orders 1:1 sales (una venta opcional generada al completar pedido)
   - payment_methods 1:N payments, 1:N sales
   - sales 1:N sale_items

4. Financial rules encoded
   - sale_items y order_items guardan COPIA de unit_price y unit_cost (snapshot
     histórico). Modificar producto mañana NO altera ventas/pedidos pasados.
   - sales.is_voided permite anular ventas conservando historial; las ventas
     anuladas no suman a ingresos ni costos.
   - orders tiene saldo = total - sum(payments.amount). Sólo se considera venta
     cuando se completa (convierte a sale), nunca al crear pedido/abono.
   - payments.amount >= 0, no puede superar saldo pendiente (validación app-side).
   - order/sale total = sum(items.subtotal) - discount.

5. Security
   - RLS habilitado en TODAS las tablas.
   - Grants CRUD a anon, authenticated (app sin login, datos compartidos del negocio).
   - Políticas USING (true) porque los datos son intencionalmente compartidos
     (single-tenant, no auth) — documentado aquí.
*/

-- ---------- Payment methods ----------
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO anon, authenticated;
DROP POLICY IF EXISTS "pm_sel" ON payment_methods;
CREATE POLICY "pm_sel" ON payment_methods FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pm_ins" ON payment_methods;
CREATE POLICY "pm_ins" ON payment_methods FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pm_upd" ON payment_methods;
CREATE POLICY "pm_upd" ON payment_methods FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pm_del" ON payment_methods;
CREATE POLICY "pm_del" ON payment_methods FOR DELETE TO anon, authenticated USING (true);

-- ---------- Products ----------
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Empanadas',
  unit_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  is_active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO anon, authenticated;
DROP POLICY IF EXISTS "p_sel" ON products;
CREATE POLICY "p_sel" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "p_ins" ON products;
CREATE POLICY "p_ins" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "p_upd" ON products;
CREATE POLICY "p_upd" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "p_del" ON products;
CREATE POLICY "p_del" ON products FOR DELETE TO anon, authenticated USING (true);

-- ---------- Product price history ----------
CREATE TABLE IF NOT EXISTS product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_price numeric(14,2) NOT NULL,
  unit_cost numeric(14,2) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_price_history TO anon, authenticated;
DROP POLICY IF EXISTS "ph_sel" ON product_price_history;
CREATE POLICY "ph_sel" ON product_price_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ph_ins" ON product_price_history;
CREATE POLICY "ph_ins" ON product_price_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ph_upd" ON product_price_history;
CREATE POLICY "ph_upd" ON product_price_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ph_del" ON product_price_history;
CREATE POLICY "ph_del" ON product_price_history FOR DELETE TO anon, authenticated USING (true);

-- ---------- Customers ----------
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO anon, authenticated;
DROP POLICY IF EXISTS "c_sel" ON customers;
CREATE POLICY "c_sel" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "c_ins" ON customers;
CREATE POLICY "c_ins" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "c_upd" ON customers;
CREATE POLICY "c_upd" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "c_del" ON customers;
CREATE POLICY "c_del" ON customers FOR DELETE TO anon, authenticated USING (true);

-- ---------- Orders ----------
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int NOT NULL GENERATED ALWAYS AS IDENTITY,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivery_at timestamptz,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_preparacion','listo','entregado','cancelado')),
  discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  notes text,
  sale_id uuid  -- venta asociada al completar (nullable)
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO anon, authenticated;
DROP POLICY IF EXISTS "o_sel" ON orders;
CREATE POLICY "o_sel" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "o_ins" ON orders;
CREATE POLICY "o_ins" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "o_upd" ON orders;
CREATE POLICY "o_upd" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "o_del" ON orders;
CREATE POLICY "o_del" ON orders FOR DELETE TO anon, authenticated USING (true);

-- ---------- Order items ----------
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0)
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items TO anon, authenticated;
DROP POLICY IF EXISTS "oi_sel" ON order_items;
CREATE POLICY "oi_sel" ON order_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "oi_ins" ON order_items;
CREATE POLICY "oi_ins" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "oi_upd" ON order_items;
CREATE POLICY "oi_upd" ON order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "oi_del" ON order_items;
CREATE POLICY "oi_del" ON order_items FOR DELETE TO anon, authenticated USING (true);

-- ---------- Payments (abonos sobre pedidos) ----------
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO anon, authenticated;
DROP POLICY IF EXISTS "pay_sel" ON payments;
CREATE POLICY "pay_sel" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pay_ins" ON payments;
CREATE POLICY "pay_ins" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pay_upd" ON payments;
CREATE POLICY "pay_upd" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pay_del" ON payments;
CREATE POLICY "pay_del" ON payments FOR DELETE TO anon, authenticated USING (true);

-- ---------- Sales ----------
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int NOT NULL GENERATED ALWAYS AS IDENTITY,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  notes text,
  is_voided boolean NOT NULL DEFAULT false,
  voided_at timestamptz
);
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales TO anon, authenticated;
DROP POLICY IF EXISTS "s_sel" ON sales;
CREATE POLICY "s_sel" ON sales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "s_ins" ON sales;
CREATE POLICY "s_ins" ON sales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "s_upd" ON sales;
CREATE POLICY "s_upd" ON sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "s_del" ON sales;
CREATE POLICY "s_del" ON sales FOR DELETE TO anon, authenticated USING (true);

-- ---------- Sale items (snapshot histórico) ----------
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0)
);
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sale_items TO anon, authenticated;
DROP POLICY IF EXISTS "si_sel" ON sale_items;
CREATE POLICY "si_sel" ON sale_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "si_ins" ON sale_items;
CREATE POLICY "si_ins" ON sale_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "si_upd" ON sale_items;
CREATE POLICY "si_upd" ON sale_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "si_del" ON sale_items;
CREATE POLICY "si_del" ON sale_items FOR DELETE TO anon, authenticated USING (true);

-- ---------- Indexes ----------
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_price_hist_product ON product_price_history(product_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders(delivery_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ---------- Seed payment methods ----------
INSERT INTO payment_methods (name, sort_order) VALUES
  ('Efectivo', 1), ('Transferencia', 2), ('Otro', 3)
ON CONFLICT DO NOTHING;

-- ---------- Seed sample products ----------
INSERT INTO products (name, description, category, unit_price, unit_cost, is_active) VALUES
  ('Empanada italiana de carne', 'Empanada artesanal de carne estilo italiano', 'Empanadas', 3500, 2000, true),
  ('Empanada italiana de res', 'Empanada artesanal de res', 'Empanadas', 3500, 2000, true)
ON CONFLICT DO NOTHING;
