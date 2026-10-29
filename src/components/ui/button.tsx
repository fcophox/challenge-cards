import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,transform,opacity] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-[0_8px_24px_-8px_rgb(139_92_246/0.7)] hover:bg-primary-strong",
        secondary: "bg-elevated text-fg hover:bg-white/10 border border-border",
        ghost: "text-muted hover:text-fg hover:bg-white/5",
        danger: "bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20",
        success: "bg-success text-bg hover:bg-success/90",
      },
      size: {
        sm: "h-9 rounded-xl px-3 text-sm",
        md: "h-12 rounded-2xl px-5 text-[15px]",
        lg: "h-14 rounded-2xl px-6 text-base",
        icon: "size-11 rounded-2xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
