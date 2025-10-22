/**
 * Responsive Page Header Component for Admin Pages
 * Tự động responsive trên mobile
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex-1 min-w-0">
        <h1 className="font-headline font-bold tracking-tight break-words">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 break-words">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

interface AdminPageContainerProps {
  children: ReactNode;
  className?: string;
}

export function AdminPageContainer({ children, className }: AdminPageContainerProps) {
  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {children}
    </div>
  );
}

interface AdminSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function AdminSection({
  title,
  description,
  children,
  className,
}: AdminSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && <h2 className="font-semibold">{title}</h2>}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Responsive grid for cards/items
 * Automatically adjusts columns based on screen size
 */
interface AdminGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function AdminGrid({ children, cols = 2, className }: AdminGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4 sm:gap-6', gridCols[cols], className)}>
      {children}
    </div>
  );
}

/**
 * Button group that stacks on mobile, row on desktop
 */
interface AdminButtonGroupProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function AdminButtonGroup({
  children,
  className,
  align = 'right',
}: AdminButtonGroupProps) {
  const alignClass = {
    left: 'justify-start',
    right: 'justify-end',
    center: 'justify-center',
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap',
        alignClass[align],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Responsive table wrapper with horizontal scroll on mobile
 */
interface AdminTableWrapperProps {
  children: ReactNode;
  className?: string;
}

export function AdminTableWrapper({ children, className }: AdminTableWrapperProps) {
  return (
    <div className={cn('scroll-x -mx-4 sm:mx-0', className)}>
      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
        {children}
      </div>
    </div>
  );
}
