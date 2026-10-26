import { useState, useCallback } from 'react';
import { DataProvider, useData } from '@/lib/data';
import { Layout, type ViewKey } from '@/components/Layout';
import { Dashboard } from '@/views/Dashboard';
import { Sales, SaleForm } from '@/views/Sales';
import { Orders, OrderForm, OrderDetailModal, PaymentModal } from '@/views/Orders';
import { Calendar } from '@/views/Calendar';
import { Customers } from '@/views/Customers';
import { Products } from '@/views/Products';
import { Reports } from '@/views/Reports';
import { Settings } from '@/views/Settings';
import { Login } from '@/views/Login';
import { useSession } from '@/lib/auth';
import { Toast, useToast, DashboardSkeleton } from '@/components/ui/misc';
import { orderWithDetails } from '@/lib/data';
import { Confirm } from '@/components/ui/Modal';
import type { Customer, OrderStatus } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { computeOrderTotals, orderBalance } from '@/lib/calc';

function AppShell({ userEmail, onSignOut }: { userEmail?: string; onSignOut: () => void }) {
  const data = useData();
  const { toast, show } = useToast();
  const [view, setView] = useState<ViewKey>('dashboard');
  const [saleFormOpen, setSaleFormOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [prefillCustomer, setPrefillCustomer] = useState<Customer | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [orderViewerId, setOrderViewerId] = useState<string | null>(null);
  const [payingFor, setPayingFor] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);

  const showToast = useCallback((m: string, t?: 'success' | 'error') => show(m, t), [show]);
  const navigate = useCallback((v: ViewKey) => setView(v), []);

  const openNewSale = useCallback(() => { setPrefillCustomer(null); setSaleFormOpen(true); }, []);
  const openNewOrder = useCallback(() => { setPrefillCustomer(null); setPrefillDate(null); setOrderFormOpen(true); }, []);

  const orderViewer = orderViewerId ? orderWithDetails(orderViewerId, data) : null;

  async function changeOrderStatus(orderId: string, status: OrderStatus) {
    if (status === 'entregado') {
      await markEntregado(orderId);
      return;
    }
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) { showToast('No se pudo cambiar el estado', 'error'); return; }
    await data.refreshOrders();
    showToast(status === 'pendiente' ? 'Pedido vuelto a pendiente' : 'Pedido cancelado');
    setOrderViewerId(null);
  }

  async function deleteOrder() {
    if (!deletingOrder) return;
    const order = data.orders.find((item) => item.id === deletingOrder);
    if (!order) return;
    if (order.sale_id) {
      const { error: saleError } = await supabase.from('sales').delete().eq('id', order.sale_id);
      if (saleError) { showToast('No se pudo eliminar el pedido', 'error'); return; }
    }
    const { error } = await supabase.from('orders').delete().eq('id', deletingOrder);
    if (error) { showToast('No se pudo eliminar el pedido', 'error'); return; }
    await Promise.all([data.refreshOrders(), data.refreshSales()]);
    showToast('Pedido eliminado');
    setDeletingOrder(null);
    setOrderViewerId(null);
  }

  async function cancelOrder() {
    if (!cancelling) return;
    const { error } = await supabase.from('orders').update({ status: 'cancelado' }).eq('id', cancelling);
    if (error) { showToast('No se pudo cancelar', 'error'); return; }
    await data.refreshOrders();
    showToast('Pedido cancelado');
    setCancelling(null);
    setOrderViewerId(null);
  }

  async function markEntregado(orderId: string) {
    const order = orderWithDetails(orderId, data);
    if (!order) return;
    if (order.items.length === 0) { showToast('El pedido no tiene productos', 'error'); return; }

    if (order.sale_id) {
      await supabase.from('orders').update({ status: 'entregado' }).eq('id', orderId);
      await data.refreshOrders();
      showToast('Pedido marcado como entregado');
      setOrderViewerId(null);
      return;
    }

    const totals = computeOrderTotals(order.items, Number(order.discount));
    const pays = data.payments.filter((p) => p.order_id === orderId);
    const balance = orderBalance(totals.total, pays);
    const pm = data.paymentMethods[0]?.id || null;

    const { data: sale, error: se } = await supabase
      .from('sales')
      .insert({
        customer_id: order.customer_id,
        order_id: order.id,
        method_id: pm,
        discount: Number(order.discount),
        notes: `Venta generada desde pedido #${order.number}`,
      })
      .select('*')
      .single();
    if (se || !sale) { showToast('No se pudo registrar la venta', 'error'); return; }

    const items = order.items.map((it) => ({
      sale_id: sale.id,
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      unit_cost: Number(it.unit_cost),
    }));
    const { error: ie } = await supabase.from('sale_items').insert(items);
    if (ie) { showToast('No se guardaron los detalles', 'error'); return; }

    if (balance > 0) {
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: balance,
        method_id: pm,
        paid_at: new Date().toISOString(),
        notes: 'Pago del saldo al entregar',
      });
    }

    await supabase.from('orders').update({ status: 'entregado', sale_id: sale.id }).eq('id', orderId);
    await Promise.all([data.refreshOrders(), data.refreshSales()]);
    showToast(`Pedido entregado · Venta #${sale.number} registrada`);
    setOrderViewerId(null);
  }

  return (
    <Layout
      current={view}
      onNavigate={navigate}
      onNewSale={openNewSale}
      onNewOrder={openNewOrder}
      userEmail={userEmail}
      onSignOut={onSignOut}
    >
      {data.loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {view === 'dashboard' && <Dashboard onNavigate={navigate} onNewSale={openNewSale} />}
          {view === 'sales' && (
            <Sales
              showToast={showToast}
              onViewSale={null}
            />
          )}
          {view === 'orders' && (
            <Orders
              showToast={showToast}
              onViewOrder={(id) => setOrderViewerId(id)}
            />
          )}
          {view === 'calendar' && (
            <Calendar
              onCreateOrderForDate={(date) => { setPrefillDate(date); setPrefillCustomer(null); setOrderFormOpen(true); }}
              onViewOrder={(id) => setOrderViewerId(id)}
            />
          )}
          {view === 'customers' && <Customers showToast={showToast} />}
          {view === 'products' && <Products showToast={showToast} />}
          {view === 'reports' && <Reports showToast={showToast} />}
          {view === 'settings' && <Settings showToast={showToast} />}
        </>
      )}

      {/* Global forms — render on any view */}
      {saleFormOpen && (
        <SaleForm
          onClose={() => setSaleFormOpen(false)}
          onSaved={() => { setSaleFormOpen(false); data.refreshSales(); }}
          showToast={showToast}
          prefillCustomer={prefillCustomer}
        />
      )}

      {orderFormOpen && (
        <OrderForm
          onClose={() => setOrderFormOpen(false)}
          onSaved={() => { setOrderFormOpen(false); data.refreshOrders(); }}
          showToast={showToast}
          prefillCustomer={prefillCustomer}
          prefillDate={prefillDate}
        />
      )}

      {/* Order viewer modal — works from any view */}
      {orderViewer && (
        <OrderDetailModal
          order={orderViewer}
          paymentMethods={data.paymentMethods}
          onClose={() => setOrderViewerId(null)}
          onPay={() => { setPayingFor(orderViewer.id); }}
          onCancel={() => setCancelling(orderViewer.id)}
          onComplete={() => markEntregado(orderViewer.id)}
          onStatusChange={(s) => changeOrderStatus(orderViewer.id, s)}
          onDelete={() => setDeletingOrder(orderViewer.id)}
        />
      )}

      {payingFor && (
        <PaymentModal
          orderId={payingFor}
          onClose={() => setPayingFor(null)}
          onSaved={() => { setPayingFor(null); data.refreshOrders(); }}
          showToast={showToast}
        />
      )}

      <Confirm
        open={!!deletingOrder}
        title="Eliminar pedido"
        message="Esta acción eliminará el pedido, sus productos y sus abonos de forma permanente. Si tiene una venta asociada, también se eliminará. ¿Deseas continuar?"
        confirmLabel="Eliminar pedido"
        onConfirm={deleteOrder}
        onCancel={() => setDeletingOrder(null)}
      />

      <Confirm
        open={!!cancelling}
        title="Cancelar pedido"
        message="El pedido se marcará como cancelado conservando el historial y los abonos registrados. ¿Deseas continuar?"
        confirmLabel="Cancelar pedido"
        onConfirm={cancelOrder}
        onCancel={() => setCancelling(null)}
      />

      <Toast toast={toast} />
    </Layout>
  );
}

export default function App() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 p-6">
        <DashboardSkeleton />
      </div>
    );
  }
  // Sin sesión no se carga ningún dato: solo la pantalla de inicio de sesión.
  if (!session) return <Login />;

  return (
    <DataProvider>
      <AppShell userEmail={session.user.email} onSignOut={() => { void supabase.auth.signOut(); }} />
    </DataProvider>
  );
}
