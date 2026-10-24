import { type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="label-base">
          {label}
          {required && <span className="text-terracota-500"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-charcoal-700/60">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className = '', invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`input-base ${invalid ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''} ${className}`}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className = '', invalid, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={`input-base appearance-none bg-[length:1.25rem] bg-[right_0.6rem_center] bg-no-repeat pr-9 ${invalid ? 'border-red-400 focus:ring-red-100' : ''} ${className}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233A3530' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className = '', invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={`input-base resize-y min-h-[80px] ${invalid ? 'border-red-400 focus:ring-red-100' : ''} ${className}`}
        {...rest}
      />
    );
  },
);
