import * as React from 'react';

import { cn } from '@/shared/lib';

// Нативный <select> со стилями, согласованными с Input.
function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Select };
