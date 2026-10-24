import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-charcoal-900/45 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizes[size]} card max-h-[92vh] flex flex-col rounded-b-none shadow-lift animate-sheet-in sm:animate-modal-in sm:rounded-xl2`}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-cream-200 sm:hidden" />
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-charcoal-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-charcoal-700/70">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-charcoal-700/60 transition hover:bg-cream-100 hover:text-charcoal-900"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-cream-200 px-5 py-3.5 bg-cream-50/60">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function Confirm({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-900/45 backdrop-blur-sm animate-overlay-in" onClick={onCancel} />
      <div className="relative w-full max-w-sm card p-5 shadow-lift animate-modal-in">
        <h3 className="font-display text-lg font-bold text-charcoal-900">{title}</h3>
        <p className="mt-2 text-sm text-charcoal-700/80 leading-relaxed">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-10 px-4 rounded-lg text-sm font-semibold text-charcoal-700 hover:bg-cream-100 transition btn-press"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`h-10 px-4 rounded-lg text-sm font-semibold text-white shadow-soft transition btn-press ${
              variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-terracota-500 hover:bg-terracota-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
