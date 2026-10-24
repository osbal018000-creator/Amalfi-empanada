import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-terracota-500 text-white hover:bg-terracota-600 active:bg-terracota-700 shadow-soft disabled:bg-terracota-300',
  secondary:
    'bg-charcoal-800 text-white hover:bg-charcoal-900 active:bg-black shadow-soft disabled:bg-charcoal-700/60',
  ghost:
    'text-charcoal-700 hover:bg-cream-100 active:bg-cream-200 disabled:text-charcoal-700/40',
  danger:
    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-soft disabled:bg-red-300',
  outline:
    'border border-cream-200 bg-white text-charcoal-800 hover:bg-cream-50 active:bg-cream-100 disabled:text-charcoal-700/40',
  subtle:
    'bg-cream-100 text-charcoal-800 hover:bg-cream-200 active:bg-cream-100/70 disabled:text-charcoal-700/40',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', leftIcon, rightIcon, loading, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-terracota-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
