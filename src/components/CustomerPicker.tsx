import { useState } from 'react';
import type { Customer } from '@/lib/types';
import { Search, UserPlus, Check, User } from 'lucide-react';

interface Props {
  customers: Customer[];
  selected: Customer | null;
  onSelect: (c: Customer | null) => void;
  onCreateNew: () => void;
  allowNone?: boolean;
}

export function CustomerPicker({ customers, selected, onSelect, onCreateNew, allowNone = true }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = query.trim()
    ? customers.filter((c) =>
        (c.name + ' ' + (c.phone || '') + ' ' + (c.email || '')).toLowerCase().includes(query.toLowerCase()),
      )
    : customers;

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-cream-200 bg-white px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracota-50 text-terracota-500">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-charcoal-900">{selected.name}</p>
              {selected.phone && <p className="truncate text-xs text-charcoal-700/60">{selected.phone}</p>}
            </div>
          </div>
          <button
            onClick={() => onSelect(null)}
            className="text-xs font-semibold text-terracota-500 hover:text-terracota-600"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="input-base flex items-center justify-between text-left text-charcoal-700/50"
          >
            <span>{allowNone ? 'Cliente (opcional)' : 'Seleccionar cliente'}</span>
            <Search size={16} />
          </button>
          {open && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-cream-200 bg-white shadow-card animate-fade-in">
              <div className="border-b border-cream-200 p-2">
                <div className="relative">
                  <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-charcoal-700/40" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre o teléfono…"
                    className="w-full rounded-lg bg-cream-50 py-2 pl-8 pr-3 text-sm outline-none placeholder:text-charcoal-700/40"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {allowNone && (
                  <button
                    onClick={() => {
                      onSelect(null);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-charcoal-700 hover:bg-cream-50"
                  >
                    <User size={15} className="text-charcoal-700/40" />
                    Sin cliente (venta de mostrador)
                  </button>
                )}
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-cream-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-charcoal-900">{c.name}</p>
                      {c.phone && <p className="truncate text-xs text-charcoal-700/60">{c.phone}</p>}
                    </div>
                    <Check size={14} className="text-terracota-400 opacity-0" />
                  </button>
                ))}
                {filtered.length === 0 && !allowNone && (
                  <p className="px-3 py-3 text-sm text-charcoal-700/50">Sin resultados</p>
                )}
              </div>
              <div className="border-t border-cream-200 p-2">
                <button
                  onClick={() => {
                    onCreateNew();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg bg-terracota-50 px-3 py-2 text-sm font-semibold text-terracota-600 hover:bg-terracota-100"
                >
                  <UserPlus size={16} />
                  Crear nuevo cliente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
