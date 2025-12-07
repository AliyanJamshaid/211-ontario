import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
}

export default function Badge({ children, variant = 'primary', icon }: BadgeProps) {
  const variantStyles = {
    primary: 'bg-primary-50 border-primary-200 text-primary-700',
    secondary: 'bg-neutral-100 border-neutral-300 text-neutral-700',
    success: 'bg-success-50 border-green-200 text-success-700',
    warning: 'bg-warning-50 border-amber-200 text-warning-700',
    error: 'bg-error-50 border-red-200 text-error-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-sm font-medium rounded-full ${variantStyles[variant]}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
