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
    const [{ data: o }, { data: oi }, { data: pay }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('order_items').select('*'),
      supabase.from('payments').select('*').order('paid_at', { ascending: false }),
    ]);
    setOrders((o as Order[]) || []);
    setOrderItems((oi as OrderItem[]) || []);
    setPayments((pay as Payment[]) || []);
  }, []);

  const refreshSales = useCallback(async () => {
    const [{ data: s }, { data: si }] = await Promise.all([
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('sale_items').select('*'),
    ]);
    setSales((s as Sale[]) || []);
    setSaleItems((si as SaleItem[]) || []);
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
