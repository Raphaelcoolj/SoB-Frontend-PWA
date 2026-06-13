import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
      default: 'bg-accent text-white hover:bg-accent/90',
      outline: 'border border-border bg-background hover:bg-accent/5 hover:border-accent/40',
      ghost: 'hover:bg-muted text-muted-foreground hover:text-foreground',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3',
        lg: 'h-14 px-8 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = ({ className, variant, size, loading, children, ...props }: ButtonProps) => {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} disabled={loading || props.disabled} {...props}>
      {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> : null}
      {children}
    </button>
  );
};

