import { useState } from 'react';
import { cn } from '@/utils/cn';

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

function initialsFor(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || name[0].toUpperCase();
}

export default function Avatar({ src, name, size = 'md', className }) {
  const [broken, setBroken] = useState(false);
  const showImage = src && !broken;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
        sizes[size],
        className,
      )}
      aria-label={name ?? 'avatar'}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ?? ''}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{initialsFor(name)}</span>
      )}
    </span>
  );
}
