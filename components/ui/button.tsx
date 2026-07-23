import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 min-w-0 max-w-full items-center justify-center rounded border border-transparent px-4 text-center text-sm font-bold leading-tight text-text transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-indigo shadow-[0_12px_30px_rgba(99,102,241,.22)]",
        secondary: "border-line bg-white/[.03]",
        danger: "bg-danger",
        ghost: "bg-transparent"
      },
      size: {
        default: "min-h-11 px-4",
        icon: "h-11 w-11 min-h-11 shrink-0 px-0",
        sm: "min-h-11 px-3 text-xs"
      }
    },
    defaultVariants: {
      variant: "secondary",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { buttonVariants };
