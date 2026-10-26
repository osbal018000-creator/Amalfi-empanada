import { type ReactNode, createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Product, Customer, Order, OrderItem, Payment, Sale, SaleItem, PaymentMethod, PriceHistory,
  OrderWithDetails, SaleWithDetails,
} from '@/lib/types';

interface DataState {
  loading: boolean;
  products: Product[];
  customers: Customer[];
  paymentMethods: PaymentMethod[];
  orders: Order[];
  orderItems: OrderItem[];
  payments: Payment[];
  sales: Sale[];
  saleItems: SaleItem[];
  priceHistory: PriceHistory[];
  refresh: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
}

const Ctx = createContext<DataState | null>(null);

/**
 * Supabase devuelve como máximo 1.000 filas por consulta. Para que los totales
 * no queden incompletos, se piden páginas de 1.000 hasta traer todo.
 */
const PAGE_SIZE = 1000;
async function fetchAll<T>(table: string, order: { column: string; ascending: boolean }[]): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = supabase.from(table).select('*');
    for (const o of order) q = q.order(o.column, { ascending: o.ascending });
    const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`Error cargando ${table}:`, error.message);
      break;
    }
    rows.push(...((data as T[]) || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);

  const refreshProducts = useCallback(async () => {
    const [{ data: p }, { data: ph }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('product_price_history').select('*').order('changed_at', { ascending: false }),
    ]);
    setProducts((p as Product[]) || []);
    setPriceHistory((ph as PriceHistory[]) || []);
  }, []);

  const refreshCustomers = useCallback(async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    setCustomers((data as Customer[]) || []);
  }, []);

  const refreshOrders = useCallback(async () => {
    const [o, oi, pay] = await Promise.all([
      fetchAll<Order>('orders', [{ column: 'created_at', ascending: false }, { column: 'id', ascending: true }]),
      fetchAll<OrderItem>('order_items', [{ column: 'id', ascending: true }]),
      fetchAll<Payment>('payments', [{ column: 'paid_at', ascending: false }, { column: 'id', ascending: true }]),
    ]);
    setOrders(o);
    setOrderItems(oi);
    setPayments(pay);
  }, []);

  const refreshSales = useCallback(async () => {
    const [s, si] = await Promise.all([
      fetchAll<Sale>('sales', [{ column: 'created_at', ascending: false }, { column: 'id', ascending: true }]),
      fetchAll<SaleItem>('sale_items', [{ column: 'id', ascending: true }]),
    ]);
    setSales(s);
    setSaleItems(si);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: pm } = await supabase.from('payment_methods').select('*').order('sort_order');
    setPaymentMethods((pm as PaymentMethod[]) || []);
    await Promise.all([refreshProducts(), refreshCustomers(), refreshOrders(), refreshSales()]);
    setLoading(false);
  }, [refreshProducts, refreshCustomers, refreshOrders, refreshSales]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Ctx.Provider
      value={{
        loading, products, customers, paymentMethods, orders, orderItems, payments, sales, saleItems, priceHistory,
        refresh, refreshOrders, refreshSales, refreshProducts, refreshCustomers,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// ---- Derived selectors ----

export function orderWithDetails(orderId: string, d: Pick<DataState, 'orders' | 'orderItems' | 'payments' | 'customers'>): OrderWithDetails | null {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return null;
  return {
    ...o,
    customer: o.customer_id ? d.customers.find((c) => c.id === o.customer_id) || null : null,
    items: d.orderItems.filter((i) => i.order_id === orderId),
    payments: d.payments.filter((p) => p.order_id === orderId),
  };
}

export function saleWithDetails(saleId: string, d: Pick<DataState, 'sales' | 'saleItems' | 'customers' | 'paymentMethods' | 'orders'>): SaleWithDetails | null {
  const s = d.sales.find((x) => x.id === saleId);
  if (!s) return null;
  return {
    ...s,
    customer: s.customer_id ? d.customers.find((c) => c.id === s.customer_id) || null : null,
    order: s.order_id ? d.orders.find((o) => o.id === s.order_id) || null : null,
    payment_method: s.method_id ? d.paymentMethods.find((m) => m.id === s.method_id) || null : null,
    items: d.saleItems.filter((i) => i.sale_id === saleId),
  };
}
