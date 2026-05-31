import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        secondary: "bg-muted text-foreground",
        success: "bg-primary/20 text-primary border-primary/30",
        warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        danger: "bg-destructive/15 text-destructive border-destructive/30"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
