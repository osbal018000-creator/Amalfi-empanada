import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, ClipboardList, CalendarDays, Users,
  Package, BarChart3, Settings as SettingsIcon, Menu, X, Plus, ClipboardCheck, LogOut,
} from 'lucide-react';

export type ViewKey =
  | 'dashboard' | 'sales' | 'orders' | 'calendar' | 'customers'
  | 'products' | 'reports' | 'settings';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
  { key: 'sales', label: 'Ventas', icon: <ShoppingCart size={19} /> },
  { key: 'orders', label: 'Pedidos', icon: <ClipboardList size={19} /> },
  { key: 'calendar', label: 'Calendario', icon: <CalendarDays size={19} /> },
  { key: 'customers', label: 'Clientes', icon: <Users size={19} /> },
  { key: 'products', label: 'Productos y costos', icon: <Package size={19} /> },
  { key: 'reports', label: 'Reportes', icon: <BarChart3 size={19} /> },
  { key: 'settings', label: 'Configuración', icon: <SettingsIcon size={19} /> },
];

interface Props {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  onNewSale: () => void;
  onNewOrder: () => void;
  userEmail?: string;
  onSignOut?: () => void;
  children: ReactNode;
}

export function Layout({ current, onNavigate, onNewSale, onNewOrder, userEmail, onSignOut, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota',
  });

  const navList = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = current === item.key;
        return (
          <button
            key={item.key}
            onClick={() => {
              onNavigate(item.key);
              setMobileOpen(false);
            }}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out-expo btn-press ${
              active
                ? 'bg-gradient-to-r from-terracota-500 to-terracota-400 text-white shadow-glow'
                : 'text-charcoal-700 hover:bg-cream-100 hover:translate-x-0.5'
            }`}
          >
            <span
              className={`transition-transform duration-300 ease-spring ${
                active ? 'text-white scale-110' : 'text-charcoal-700/60 group-hover:text-terracota-500 group-hover:scale-110'
              }`}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  const accountBlock = onSignOut ? (
    <div className="border-t border-cream-200 px-3 py-3">
      {userEmail && <p className="mb-1.5 truncate px-2 text-[11px] text-charcoal-700/50" title={userEmail}>{userEmail}</p>}
      <button
        onClick={onSignOut}
        className="btn-press flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-charcoal-700 transition hover:bg-red-50 hover:text-red-600"
      >
        <LogOut size={17} /> Cerrar sesión
      </button>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-cream-200 bg-gradient-to-b from-white to-cream-50 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-terracota-400 to-terracota-600 text-white shadow-glow">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p className="font-display text-sm font-extrabold leading-tight text-charcoal-900">Doña Empanada</p>
            <p className="text-[11px] text-charcoal-700/50">Gestión del negocio</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">{navList}</div>
        {accountBlock}
        <div className="border-t border-cream-200 px-5 py-3">
          <p className="text-[11px] text-charcoal-700/40">v1.0 · EmpanasApp</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm animate-overlay-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-lift animate-drawer-in">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-terracota-400 to-terracota-600 text-white shadow-glow">
                  <ClipboardCheck size={20} />
                </div>
                <p className="font-display text-sm font-extrabold text-charcoal-900">Doña Empanada</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-charcoal-700/60 hover:bg-cream-100">
                <X size={20} />
              </button>
            </div>
            <div className="flex h-[calc(100%-5rem)] flex-col justify-between">
              <div className="overflow-y-auto px-3 py-2">{navList}</div>
              {accountBlock}
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-cream-200/80 bg-cream-50/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-charcoal-700 transition hover:bg-cream-100 btn-press lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold capitalize text-charcoal-900 sm:text-lg">
                  {NAV.find((n) => n.key === current)?.label}
                </p>
                <p className="hidden text-xs text-charcoal-700/60 capitalize sm:block">{today}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onNewOrder}
                className="btn-press hidden items-center gap-1.5 rounded-lg border border-cream-200 bg-white px-3.5 py-2 text-sm font-semibold text-charcoal-800 transition-all duration-200 hover:border-terracota-200 hover:bg-terracota-50 hover:text-terracota-600 sm:inline-flex"
              >
                <ClipboardList size={16} />
                <span className="hidden md:inline">Nuevo pedido</span>
                <span className="md:hidden">Pedido</span>
              </button>
              <button
                onClick={onNewSale}
                className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-terracota-500 to-terracota-400 px-3.5 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-px hover:shadow-glow"
              >
                <Plus size={16} />
                <span className="hidden md:inline">Registrar venta</span>
                <span className="md:hidden">Venta</span>
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-5 sm:px-6 sm:py-6">
          <div key={current} className="animate-page-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
