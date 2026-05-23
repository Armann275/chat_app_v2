import { forwardRef, useId } from 'react';
import { cn } from '@/utils/cn';

const Input = forwardRef(function Input(
  { label, error, hint, id, className, ...props },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'block w-full rounded-md border bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
