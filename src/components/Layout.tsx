import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, ClipboardList, CalendarDays, Users,
  Package, BarChart3, Settings as SettingsIcon, Menu, X, Plus, ClipboardCheck,
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
  children: ReactNode;
}

export function Layout({ current, onNavigate, onNewSale, onNewOrder, children }: Props) {
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
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
              active
                ? 'bg-terracota-500 text-white shadow-soft'
                : 'text-charcoal-700 hover:bg-cream-100'
            }`}
          >
            <span className={active ? 'text-white' : 'text-charcoal-700/60 group-hover:text-terracota-500'}>
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-cream-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracota-500 text-white shadow-soft">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p className="font-display text-sm font-extrabold leading-tight text-charcoal-900">Doña Empanada</p>
            <p className="text-[11px] text-charcoal-700/50">Gestión del negocio</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">{navList}</div>
        <div className="border-t border-cream-200 px-5 py-3">
          <p className="text-[11px] text-charcoal-700/40">v1.0 · EmpanasApp</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-card animate-fade-in">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracota-500 text-white">
                  <ClipboardCheck size={20} />
                </div>
                <p className="font-display text-sm font-extrabold text-charcoal-900">Doña Empanada</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-charcoal-700/60 hover:bg-cream-100">
                <X size={20} />
              </button>
            </div>
            <div className="px-3 py-2">{navList}</div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-cream-200 bg-cream-50/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-charcoal-700 hover:bg-cream-100 lg:hidden"
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
                className="hidden items-center gap-1.5 rounded-lg border border-cream-200 bg-white px-3.5 py-2 text-sm font-semibold text-charcoal-800 transition hover:bg-cream-50 sm:inline-flex"
              >
                <ClipboardList size={16} />
                <span className="hidden md:inline">Nuevo pedido</span>
                <span className="md:hidden">Pedido</span>
              </button>
              <button
                onClick={onNewSale}
                className="inline-flex items-center gap-1.5 rounded-lg bg-terracota-500 px-3.5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-terracota-600"
              >
                <Plus size={16} />
                <span className="hidden md:inline">Registrar venta</span>
                <span className="md:hidden">Venta</span>
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
